/**
 * STI-539: prove that a declared destination can actually be shipped to.
 *
 * Every other check in this toolchain reads the Admin API. The Admin API is
 * structurally incapable of seeing the STI-539 defect: the live store's
 * International zone lists two active services (`usps`, `dhl_express`), both
 * `DeliveryParticipant` with `fixedFee=0.0`, so the profile looks configured and
 * `catalog:plan` reports the zone as present with services in it.
 *
 * A buyer in any of those countries is offered nothing at all. Measured on the
 * live store this run, via the Storefront API:
 *
 *     DE 10115 / DE 80331 / GB SW1A1AA / FR 75001 / CA M5V2T6 / AU 2000 / SG 018956
 *       -> deliveryGroups=0, userErrors=[]
 *     US 10001 (control)
 *       -> deliveryGroups=1, options=[Standard 0.0, Express 15.0]
 *
 * `deliveryGroups=0` means checkout cannot complete. It is NOT a $0.00 charge:
 * a genuinely free rate still yields ONE option whose amount is `0.0`, which is
 * exactly what the US control shows for its own free-shipping threshold. The
 * "$0.00 international shipping" claim that reached the board was read off Admin
 * `fixedFee` on a `DeliveryParticipant`, which is an operator surcharge stacked ON
 * TOP OF a carrier-calculated rate, never the customer's total.
 *
 * So the distinction this module encodes is three-valued, not boolean:
 *
 *   priced      - the buyer is quoted an explicit amount.
 *   no_options  - the zone exists in Admin but the buyer is quoted NOTHING.
 *                 This is the one that blocks a sale, and it is invisible to
 *                 Admin-only tooling.
 *   unverified  - a rate exists but its amount is not readable here (carrier
 *                 calculated). Reported as unknown, never as zero.
 *
 * `unverified` is deliberately NOT collapsed into `no_options`: a carrier rate
 * that is merely unreadable through the Admin API is not evidence that a buyer
 * is blocked, and reporting it as blocked would be the same class of error as
 * reporting it as free.
 */

export type CheckoutRateProbe =
  /** A buyer is quoted an explicit amount for this service. */
  | { kind: "priced"; title: string; methodType: string; amount: string; currencyCode: string }
  /** A rate exists but its amount is not readable from here. */
  | { kind: "unverified"; title: string; methodType: string }
  /** The buyer is quoted no shipping option whatsoever. Checkout cannot complete. */
  | { kind: "no_options" };

export type CheckoutReachability = {
  /** Country code actually applied to the cart, as the Storefront API echoed it. */
  countryCode: string;
  /** One real postal code for that country, so the address is not obviously rejected. */
  postalCode: string;
  probes: CheckoutRateProbe[];
  /**
   * True when the address was accepted (no `userErrors`) and simply had no
   * rates. False when the API rejected the address, which means the probe proved
   * nothing and must never be reported as a blocked checkout.
   */
  addressAccepted: boolean;
};

export type ReachabilityVerdict = "reachable" | "no_options" | "inconclusive";

export function verdictFor(result: CheckoutReachability): ReachabilityVerdict {
  if (!result.addressAccepted) return "inconclusive";
  // An empty `probes` list is the defect: the API accepted the address and then
  // offered nothing. It is reported as its own value rather than as a rate.
  if (result.probes.length === 0) return "no_options";
  return "reachable";
}

/**
 * Render one probe set as a line a human can act on.
 *
 * The wording carries the distinction that the whole issue turns on: zero
 * options is an unsellable destination, whereas an unknown amount is unknown. A
 * free rate is printed with its own real amount and is neither of those.
 */
export function describeReachability(result: CheckoutReachability, declaredPrice?: string | null): string {
  const verdict = verdictFor(result);
  const where = `${result.countryCode} ${result.postalCode}`;

  if (verdict === "inconclusive") {
    return `checkout reachability ${where}: INCONCLUSIVE — the Storefront API rejected the address, so nothing about shipping can be concluded from this probe`;
  }

  if (verdict === "no_options") {
    return (
      `checkout reachability ${where}: NO DELIVERY OPTIONS — the store accepted the address and then quoted no ` +
      `shipping at all, so checkout cannot complete for this destination` +
      (declaredPrice ? `. The catalog declares ${declaredPrice} here, which no buyer can be charged` : "") +
      `. The Admin API still lists this zone, which is why an Admin-only check reports this destination as configured`
    );
  }

  const parts: string[] = [];
  for (const p of result.probes) {
    if (p.kind === "priced") parts.push(`"${p.title}"=${p.amount} ${p.currencyCode}`);
    else parts.push(`"${p.title}"=carrier-calculated (amount not readable here, NOT 0.00)`);
  }
  // A `reachable` verdict with nothing renderable would print a dangling
  // sentence, so name the states explicitly rather than inventing a rate.
  const quoted = parts.length > 0 ? parts.join(", ") : "an option whose amount could not be rendered here";
  return `checkout reachability ${where}: reachable — a buyer is quoted ${quoted}`;
}

/** Group reachability results by verdict so a caller can fail on exactly one bucket. */
export function unreachableDestinations(results: readonly CheckoutReachability[]): CheckoutReachability[] {
  return results.filter(r => verdictFor(r) === "no_options");
}

/**
 * Parse the `cart { deliveryGroups { nodes { deliveryOptions } } }` payload.
 *
 * Split out from the transport so the shipping-verdict logic is testable without
 * a live store, and so a malformed payload is a visible parse failure rather
 * than a silent "zero options" — which would manufacture a fake outage.
 */
export function parseDeliveryGroups(payload: unknown): CheckoutRateProbe[] {
  const nodes = (payload as { data?: { cart?: { deliveryGroups?: { nodes?: unknown[] } } } })
    ?.data?.cart?.deliveryGroups?.nodes;
  if (!Array.isArray(nodes)) {
    throw new Error(`Storefront deliveryGroups payload was not a node list: ${JSON.stringify(payload)?.slice(0, 200)}`);
  }

  const probes: CheckoutRateProbe[] = [];
  for (const node of nodes) {
    const options = (node as { deliveryOptions?: unknown[] })?.deliveryOptions;
    if (!Array.isArray(options)) continue;
    for (const option of options) {
      const o = option as {
        title?: string | null;
        deliveryMethodType?: string | null;
        estimatedCost?: { amount?: string | null; currencyCode?: string | null } | null;
      };
      const title = o.title ?? "unnamed";
      const methodType = o.deliveryMethodType ?? "UNKNOWN";
      const amount = o.estimatedCost?.amount;
      // A missing amount is "not readable here", which is NOT the same as a
      // 0.00 rate and must never be formatted as one.
      if (amount === undefined || amount === null || amount === "") {
        probes.push({ kind: "unverified", title, methodType });
      } else {
        probes.push({ kind: "priced", title, methodType, amount, currencyCode: o.estimatedCost?.currencyCode ?? "USD" });
      }
    }
  }
  return probes;
}

/**
 * One real postal code per country.
 *
 * The probe needs a plausible postal code per country because an obviously
 * invalid one can be rejected as a bad address, which would make a blocked
 * destination look merely unreachable rather than rate-less. These are
 * well-known format examples, not customer data.
 */
export const PROBE_POSTAL_CODES: Readonly<Record<string, string>> = {
  US: "10001",
  CA: "M5V2T6",
  GB: "SW1A1AA",
  DE: "10115",
  FR: "75001",
  ES: "28001",
  IT: "00184",
  NL: "1012",
  BE: "1000",
  AT: "1010",
  CH: "8001",
  SE: "111 29",
  NO: "0150",
  DK: "1050",
  PL: "00-001",
  PT: "1100",
  IE: "D02",
  AU: "2000",
  NZ: "6011",
  JP: "100-0001",
  SG: "018956",
  HK: "999077",
  KR: "04524",
  MY: "50000",
  AE: "00000",
};
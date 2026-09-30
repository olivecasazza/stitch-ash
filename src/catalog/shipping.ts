import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { ShippingPolicySchema, type DeliveryMethodCondition, type ShippingDiff, type ShippingPolicy, type ShopifyShippingProfile, type ShopifyShippingZone } from "./schema.js";

/**
 * STI-507: shipping YAML is validated with the same schema machinery as products
 * and collections. It used to be `parseYaml(content) as ShippingPolicy`, an
 * unchecked assertion, so a typo'd or structurally wrong shipping file passed
 * `catalog:validate` and only surfaced later as an undefined field in plan
 * output.
 */
export async function loadShippingPolicies(dir: string): Promise<ShippingPolicy[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const yamlFiles = entries.filter(e => e.isFile() && e.name.endsWith(".yaml"));

  const policies: ShippingPolicy[] = [];
  const errors: string[] = [];

  for (const entry of yamlFiles) {
    const content = await readFile(join(dir, entry.name), "utf-8");
    const raw = parseYaml(content);
    const result = ShippingPolicySchema.safeParse(raw);
    if (!result.success) {
      errors.push(`${entry.name}: ${result.error.message}`);
      continue;
    }
    policies.push(result.data);
  }

  if (errors.length > 0) {
    throw new Error(`Catalog validation errors:\n${errors.join("\n")}`);
  }

  return policies;
}

export function planShippingPolicies(policies: ShippingPolicy[]): string[] {
  const lines: string[] = [];
  for (const policy of policies) {
    lines.push(`shipping_policy: ${policy.id} (${policy.policyName})`);
    for (const rule of policy.rules ?? []) {
      lines.push(
        `  - ${rule.serviceName} [${rule.destination}] => ${rule.price} (${rule.estimatedTransitDays?.min ?? "?"}-${rule.estimatedTransitDays?.max ?? "?"} days)`,
      );
    }
  }
  return lines;
}

/**
 * STI-507: normalize a declared price to a canonical decimal string so
 * "0" and "0.00" compare equal while a real difference ("25.50" vs "25.00")
 * does not get hidden by string formatting.
 */
export function normalizePrice(value: string): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  // `Number("")` and `Number(" ")` are both 0, which would silently turn a
  // missing or blank declared price into a FREE rate and report it as
  // matching the store. Reject anything that is not an actual number first.
  if (trimmed === "" || !/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return parsed.toFixed(2);
}

/**
 * Decide whether a zone satisfies a rule's declared destination.
 *
 * A declared `US` is satisfied by a zone that explicitly contains US. A declared
 * `REST_OF_WORLD` is satisfied by a zone flagged `restOfWorld`, and also by a
 * zone that enumerates every country except the origin — which is how Shopify
 * represents "the rest of the world" when it is materialized rather than
 * flagged. Treating a mismatch as "not found" instead would be the same
 * false-green failure this reconciler already had once.
 */
export function destinationMatches(ruleDestination: string, zone: ShopifyShippingZone, originCountryCode: string): boolean {
  const declared = ruleDestination.trim().toUpperCase();
  if (declared === "REST_OF_WORLD") {
    if (zone.restOfWorld) return true;
    return !zone.countryCodes.includes(originCountryCode.toUpperCase());
  }
  return zone.countryCodes.includes(declared);
}

type ZoneMethod = ShopifyShippingZone["methods"][number];

/**
 * Render a rate the way it must appear in a plan line.
 *
 * A carrier-calculated rate is never printed as a number. Its `price` is null
 * and the only figure the Admin API returns is the operator's surcharge on top
 * of a live carrier quote, so printing that here is how a surcharge got
 * reported as "0.0 USD" — read as free shipping (STI-573).
 */
function formatRate(method: ZoneMethod, fallbackCurrency: string): string {
  if (method.rateKind === "carrier_calculated") return "carrier-calculated";
  if (method.price === null) return "derived/unknown";
  return `${method.price} ${method.currency ?? fallbackCurrency}`.trim();
}

/**
 * Render one rate condition in the words an operator reads in the Admin UI.
 *
 * The criteria is a union, so a price condition and a weight condition are
 * rendered from the member that actually came back. An unrecognised one is
 * printed as unreadable rather than dropped, because a condition the plan
 * cannot describe is the one the operator most needs to see.
 */
function formatCondition(condition: DeliveryMethodCondition, fallbackCurrency: string): string {
  const field = condition.field === "TOTAL_PRICE" ? "order total" : condition.field === "TOTAL_WEIGHT" ? "order weight" : condition.field;
  const operator = condition.operator.replace(/_/g, " ").toLowerCase();
  if (condition.amount != null) {
    return `${field} ${operator} ${condition.amount} ${condition.currency ?? fallbackCurrency}`.trim();
  }
  if (condition.value != null) {
    return `${field} ${operator} ${condition.value}${condition.unit ?? ""}`.trim();
  }
  return `${field} ${operator} <unreadable criteria>`;
}

/**
 * Describe a set of same-name rows that are a RATE RANGE rather than a
 * collision: some rows carry a condition and at least one does not, so exactly
 * one row is offered per cart and the cart decides which.
 *
 * This is the live store's Domestic zone. The verdict states the real customer
 * behaviour — one option, one price, chosen by the cart total — and surfaces
 * the threshold, because a free-shipping threshold is a commercial decision
 * that no other line in the plan reports: `catalog/shipping/default.yaml`
 * declares one flat domestic rate and has no way to express a range, so this
 * is a genuine catalog blind spot even though the store is not defective.
 */
function rateRangeVerdict(offered: readonly ZoneMethod[], conditioned: readonly ZoneMethod[], fallbackCurrency: string): string {
  const unconditioned = offered.filter(m => (m.conditions?.length ?? 0) === 0);
  const parts: string[] = [];
  for (const method of unconditioned) {
    parts.push(`"${method.name}" [${method.id}]=${formatRate(method, fallbackCurrency)} (no condition)`);
  }
  for (const method of conditioned) {
    const conditions = (method.conditions ?? []).map(c => formatCondition(c, method.currency ?? fallbackCurrency)).join(" AND ");
    parts.push(`"${method.name}" [${method.id}]=${formatRate(method, fallbackCurrency)} when ${conditions}`);
  }
  return (
    `THIS IS A RATE RANGE, NOT A DUPLICATE — the ${offered.length} same-named rows are mutually exclusive by ` +
    `condition, so a buyer is offered exactly ONE "${offered[0]?.name}" option at a single price decided by the ` +
    `cart, never ${offered.length} differently-priced options: ${parts.join(", ")}. ` +
    `A rate range is not a pricing defect. It IS invisible to the catalog: catalog/shipping declares one flat ` +
    `rate per destination and cannot express a threshold, so this free-shipping boundary has no declared ` +
    `source of truth and cannot drift-check against one`
  );
}

/**
 * Decide how bad a same-name collision is, from the rows that share a name.
 *
 * Only ACTIVE rows are judged, because only an active row can be offered to a
 * buyer. Two inactive rows that share a name are untidy; an inactive row
 * shadowing a live one is latent, not a current charge.
 *
 * A disagreement among the active rows is the live money bug ONLY when both
 * rows can be offered at once. If some carry a rate condition and some do not,
 * they are a rate range and the verdict says so (STI-597) — see
 * `rateRangeVerdict`, which is checked before the price comparison below.
 *
 * Agreement is only ever claimed for rows the Admin API actually priced. A
 * rate the API does not return cannot be shown to match another, so two
 * carrier-calculated rows are reported as unverifiable rather than as agreeing
 * — comparing their null prices produced a set of size one and a false green
 * on the exact case this exists to catch (STI-577). Where the rows differ in
 * something the API DID return, the operator surcharge is surfaced, because
 * two rows both described as "carrier-calculated" is otherwise not enough
 * information to act on.
 */
function collisionVerdict(rows: readonly ZoneMethod[], fallbackCurrency: string): string {
  const offered = rows.filter(m => m.active);
  if (offered.length < 2) {
    return (
      `only ${offered.length} of them is active, so no buyer is quoted two rates today, but the name is ` +
      `reused and must be made unique before a second active row can be added under it`
    );
  }

  // STI-597: a same-name disagreement is only a customer-visible defect if both
  // rows can be offered at once. A rate range cannot, and the live store's
  // Domestic zone is exactly that: "Standard"=8.00 unconditioned and
  // "Standard"=0.00 carrying TOTAL_PRICE >= 70.00. That is a free-shipping
  // threshold — one row per cart, chosen by the cart total — so reporting it as
  // "a buyer is shown one label for 2 differently-priced options" describes a
  // defect the store does not have and points the operator at a working offer.
  //
  // Verified against the live Storefront API: a $35 cart is offered
  // "Standard"=8.00, a $70 cart is offered "Standard"=0.00, and no cart is
  // ever offered both. Read the conditions before the price comparison, because
  // the price difference is exactly what a rate range looks like.
  const conditioned = offered.filter(m => (m.conditions?.length ?? 0) > 0);
  if (conditioned.length > 0 && conditioned.length < offered.length) {
    return rateRangeVerdict(offered, conditioned, fallbackCurrency);
  }

  // A rate the Admin API will not price cannot be compared to another one, so
  // it is pulled out before the agreement test. It is a separate defect from a
  // disagreement and is reported in its own words.
  const unpriced = offered.filter(m => m.rateKind === "carrier_calculated" || m.price === null);
  if (unpriced.length > 0) {
    const surcharges = new Set(unpriced.map(m => m.carrierSurcharge ?? "none declared"));
    return (
      `${unpriced.length} of them ${unpriced.length === 1 ? "is" : "are"} priced live by the carrier and ` +
      `the Admin API cannot return ${unpriced.length === 1 ? "its rate" : "their rates"}, so whether the ` +
      `active rows agree CANNOT be determined from the store` +
      (unpriced.every(m => m.rateKind === "carrier_calculated")
        ? `. Operator surcharge on the carrier quote: ${[...surcharges].join(", ")}` +
          (surcharges.size > 1
            ? " (these differ; the surcharge is charged on top of the carrier quote and is NOT the price a customer pays)"
            : "")
        : " (derived rate, no fixed fee returned)")
    );
  }

  const distinct = new Set(offered.map(m => normalizePrice(m.price!)));
  if (distinct.size > 1) {
    return (
      `THEY DISAGREE (${distinct.size} distinct prices) — customers are charged different rates for the same ` +
      `service name, and a buyer is shown one label for ${offered.length} differently-priced options with ` +
      `nothing to tell them apart; which one is offered is decided by the rate condition, not by the buyer`
    );
  }
  return "they currently agree on price, but the names collide and must be renamed before they can drift apart";
}

/** The colliding rows, each identifiable by GID, in the shape the operator needs. */
function collisionRowsText(rows: readonly ZoneMethod[], fallbackCurrency: string): string {
  return rows
    .map(m => `"${m.name}" [${m.id}]${m.active ? "" : " (inactive)"}=${formatRate(m, fallbackCurrency)}`)
    .join(", ");
}

/**
 * Group a zone's methods by service name.
 *
 * Shopify does not enforce unique service names inside a zone, so this can
 * return more than one row per name.
 */
function methodsByName(zone: ShopifyShippingZone): Map<string, ZoneMethod[]> {
  const grouped = new Map<string, ZoneMethod[]>();
  for (const method of zone.methods) {
    const existing = grouped.get(method.name);
    if (existing) existing.push(method);
    else grouped.set(method.name, [method]);
  }
  return grouped;
}

/**
 * STI-507: compare declared shipping rules against the store's live delivery
 * profile.
 *
 * Shipping was previously restated and never compared, so any divergence
 * between `catalog/shipping/*.yaml` and the real delivery profile was
 * invisible in `catalog:plan`. That is the same false-green class as the tags
 * blind spot (PR #65), collection membership (PR #72) and the shipping
 * restatement itself (PR #82) — the difference here is that it is still open.
 *
 * These actions are reported but NOT applied: `catalog:apply` has never written
 * a delivery profile, and it still does not. Shipping drift is surfaced for an
 * operator decision rather than silently reconciled, because a rate change is
 * a customer-visible, money-moving edit.
 */
export function diffShipping(
  policy: ShippingPolicy,
  remote: ShopifyShippingProfile | null,
  catalogProductHandles: readonly string[] = [],
): ShippingDiff {
  const actions: string[] = [];
  const notes: string[] = [];

  if (!remote) {
    actions.push(`shipping policy ${policy.id}: no delivery profile found on the store`);
    notes.push("no remote delivery profile was returned by the Admin API");
    return { policy, remote, actions, notes };
  }

  notes.push(`remote profile "${remote.profileName}" (default=${remote.isDefault}) covering ${remote.productHandles.length} product(s)`);

  // A product that is in no delivery profile cannot be bought: checkout has no
  // profile to read rates from. The rate comparison below only looks at the
  // zones of the ONE profile being diffed, so a coverage gap is invisible to it
  // — a profile covering zero products with a perfect declared rate produced
  // zero actions and a "0 pending product actions" summary. Compared as sets,
  // because the profile's own list is sorted curator-side and the catalog's is
  // not.
  const uncovered = catalogProductHandles
    .filter(handle => !remote.productHandles.includes(handle))
    .sort();
  if (uncovered.length > 0) {
    actions.push(
      `shipping policy ${policy.id}: ${uncovered.length} catalog product(s) are in no delivery profile ` +
        `on the store, so checkout cannot compute a rate for them: ${uncovered.join(", ")}` +
        ` (profile "${remote.profileName}" covers ${remote.productHandles.join(", ") || "nothing"})`,
    );
  }

  // STI-577: a zone whose service names collide is a defect in the STORE, not
  // in the catalog, and it used to be invisible unless a declared rule happened
  // to name the colliding service. The live proof: the Domestic zone has two
  // active rows both named "Standard" at 8.00 and 0.00, while the catalog
  // declares "Tracked domestic shipping" — so every declared rule took the
  // renamed/not-found branch, which lists rates without ever judging them, and
  // a customer-visible pricing defect reached production unremarked.
  //
  // A collision is therefore reported per ZONE, from the store's own rows, so it
  // does not depend on the catalog naming the service at all. Collisions that a
  // declared rule does claim are left to the per-rule branch below, which can
  // also name the declared amount; skipping them here keeps one defect from
  // being printed twice under two different justifications.
  const declaredRules = policy.rules ?? [];
  const claimedByRule = new Set<string>();
  for (const rule of declaredRules) {
    for (const zone of remote.zones) {
      if (destinationMatches(rule.destination, zone, policy.originCountryCode)) {
        claimedByRule.add(`${zone.name} ${rule.serviceName}`);
      }
    }
  }

  for (const zone of remote.zones) {
    for (const [name, rows] of methodsByName(zone)) {
      if (rows.length < 2) continue;
      if (claimedByRule.has(`${zone.name} ${name}`)) continue;
      actions.push(
        `shipping policy ${policy.id}: zone "${zone.name}" has ${rows.length} services all named "${name}" ` +
          `and no declared rule covers that name, so the catalog cannot check any of them: ` +
          `${collisionRowsText(rows, policy.currencyCode)}. ${collisionVerdict(rows, policy.currencyCode)}`,
      );
    }
  }

  if (declaredRules.length === 0) {
    notes.push("policy declares no rules, so declared rates have nothing to compare against");
    return { policy, remote, actions, notes };
  }

  for (const rule of declaredRules) {
    const zone = remote.zones.find(z => destinationMatches(rule.destination, z, policy.originCountryCode));

    if (!zone) {
      actions.push(`shipping rule ${rule.id}: declared destination ${rule.destination} has no matching zone on the store`);
      continue;
    }

    const declaredPrice = normalizePrice(rule.price);
    // Match on service name first, then fall back to the only active option in
    // the zone. A store that renamed "Tracked domestic shipping" to "Standard"
    // should report that honestly rather than silently reporting no drift.
    //
    // A name only identifies a rate when it is unambiguous in the zone. Shopify
    // does not enforce unique names and the live store returns two active
    // services both called "Standard" in Domestic, so `find()` returned the
    // FIRST of the two and reported nothing: it compared a declared rate
    // against one arbitrary row of a name collision, and said the other row
    // did not exist. That is a silent pass on the worst case, so a collision is
    // reported as one explicit line instead.
    const namedMatches = zone.methods.filter(m => m.name === rule.serviceName);
    const activeMethods = zone.methods.filter(m => m.active);
    const ambiguous = namedMatches.length > 1;
    const method = ambiguous
      ? undefined
      : (namedMatches[0] ?? (activeMethods.length === 1 ? activeMethods[0] : undefined));

    if (ambiguous) {
      // Everything needed to act without opening the Admin UI: the colliding
      // rows with their GIDs, what each charges, and whether the rows a buyer
      // can actually be offered disagree. Rows that disagree are a live money
      // bug — customers are quoted different rates for the same service name —
      // which is why "cannot be checked" alone would understate it.
      actions.push(
        `shipping rule ${rule.id}: zone "${zone.name}" has ${namedMatches.length} services all named ` +
          `"${rule.serviceName}", so the declared ${rule.price} ${policy.currencyCode} cannot be checked ` +
          `against one rate: ${collisionRowsText(namedMatches, policy.currencyCode)}. ` +
          collisionVerdict(namedMatches, policy.currencyCode),
      );
      continue;
    }

    if (!method) {
      // Include the store's actual rates for this zone. Without them a renamed
      // service hides the price comparison entirely, and the operator would
      // have to re-derive by hand whether the declared amount is even charged.
      //
      // A carrier-calculated rate is rendered as "carrier-calculated" and never
      // as a number. Printing its surcharge here reported `"usps"=0.0 USD` for
      // both live international services, which reads as free international
      // shipping — the one number on this line an operator would act on, and
      // the one that is not the price.
      const offered = zone.methods
        .map(m => {
          const rate = m.rateKind === "carrier_calculated"
            ? "carrier-calculated (price quoted at checkout, unverifiable here)"
            : m.price === null
              ? "derived/unknown"
              : `${m.price} ${m.currency ?? ""}`.trim();
          return `"${m.name}"${m.active ? "" : " (inactive)"}=${rate}`;
        })
        .join(", ");
      actions.push(
        `shipping rule ${rule.id}: declared service "${rule.serviceName}" (${rule.price} ${policy.currencyCode}, ${rule.destination}) ` +
          `not found in zone "${zone.name}"; store offers: ${offered || "none"}`,
      );
      continue;
    }

    if (rule.serviceName !== method.name) {
      actions.push(`shipping rule ${rule.id}: service renamed "${rule.serviceName}" -> "${method.name}" on the store`);
    }

    if (!method.active) {
      actions.push(`shipping rule ${rule.id}: service "${method.name}" is INACTIVE on the store but declared in the catalog`);
    }

    if (method.price === null) {
      // A rate-derived or carrier-calculated rate. Reporting a price here would
      // mean inventing a number, and reporting nothing would let an unknown
      // rate read as verified.
      //
      // A carrier-calculated rate is a distinct case worth naming: the store
      // quotes a live carrier price at checkout and the Admin API never returns
      // the total, so the declared amount is unverifiable *by construction*,
      // not because the read failed. The operator surcharge is reported
      // because it is the only number the API does return, and it is the part
      // someone would otherwise mistake for the total.
      if (method.rateKind === "carrier_calculated") {
        actions.push(
          `shipping rule ${rule.id}: store service "${method.name}" is a CARRIER-CALCULATED rate ` +
            `(declared ${rule.price} ${policy.currencyCode}); the price is quoted live from the carrier at checkout and the Admin API cannot return it` +
            (method.carrierSurcharge
              ? `, so the declared amount cannot be verified against it. The store's operator surcharge is ${method.carrierSurcharge} ${policy.currencyCode}, which is charged ON TOP of the carrier quote and is NOT the price a customer pays`
              : ", so the declared amount cannot be verified against it. The store declares no operator surcharge on top of the carrier quote"),
        );
        continue;
      }
      actions.push(
        `shipping rule ${rule.id}: store service "${method.name}" has no fixed-fee price ` +
          `(declared ${rule.price} ${policy.currencyCode}); rate is derived or carrier-calculated and cannot be verified`,
      );
      continue;
    }

    if (method.currency && method.currency !== policy.currencyCode) {
      actions.push(`shipping rule ${rule.id}: store price currency ${method.currency} != declared ${policy.currencyCode}`);
    }

    if (declaredPrice === null) {
      // The declared price is not a number. Skipping the comparison here would
      // report "no changes" for a rate nobody can read, which is the exact
      // false-green this function exists to remove.
      actions.push(
        `shipping rule ${rule.id}: declared price ${JSON.stringify(rule.price)} is not a valid number ` +
          `(store has ${method.price} ${method.currency ?? policy.currencyCode}); cannot verify`,
      );
      continue;
    }

    if (declaredPrice !== normalizePrice(method.price)) {
      actions.push(
        `shipping rule ${rule.id}: declared ${rule.serviceName} ${rule.destination} at ${rule.price} ` +
          `-> store ${method.price} ${method.currency ?? policy.currencyCode}`,
      );
    }
  }

  return { policy, remote, actions, notes };
}

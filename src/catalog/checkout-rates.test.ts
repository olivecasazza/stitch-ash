import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeReachability,
  parseDeliveryGroups,
  PROBE_POSTAL_CODES,
  unreachableDestinations,
  verdictFor,
} from "./checkout-rates.js";
import type { CheckoutReachability } from "./checkout-rates.js";

function cart(options: unknown[]): unknown {
  return { data: { cart: { deliveryGroups: { nodes: [{ deliveryOptions: options }] } } } };
}

const priced = (title: string, amount: string, currencyCode = "USD") => ({
  title,
  deliveryMethodType: "FlatRate",
  estimatedCost: { amount, currencyCode },
});

/** The probe shape `parseDeliveryGroups` produces from a `priced()` option. */
const pricedProbe = (title: string, amount: string, currencyCode = "USD") => ({
  kind: "priced" as const,
  title,
  methodType: "FlatRate",
  amount,
  currencyCode,
});

describe("parseDeliveryGroups", () => {
  it("reads an explicitly priced option", () => {
    const probes = parseDeliveryGroups(cart([priced("Standard", "8.0")]));
    assert.deepEqual(probes, [
      { kind: "priced", title: "Standard", methodType: "FlatRate", amount: "8.0", currencyCode: "USD" },
    ]);
  });

  it("treats a real 0.00 rate as priced, not as missing", () => {
    // This is the US control case from STI-539: a genuinely free rate still
    // yields ONE option whose amount is 0.0. Collapsing it into "no options"
    // would misreport a working free-shipping threshold as an outage.
    const probes = parseDeliveryGroups(cart([priced("Standard", "0.0")]));
    assert.equal(probes.length, 1);
    assert.equal(probes[0].kind, "priced");
    assert.equal(probes[0].kind === "priced" && probes[0].amount, "0.0");
  });

  it("reports an unreadable amount as unverified rather than as 0.00", () => {
    const probes = parseDeliveryGroups(
      cart([{ title: "usps", deliveryMethodType: "DeliveryParticipant", estimatedCost: null }]),
    );
    assert.deepEqual(probes, [{ kind: "unverified", title: "usps", methodType: "DeliveryParticipant" }]);
  });

  it("returns no probes for an accepted cart with no options", () => {
    assert.deepEqual(parseDeliveryGroups(cart([])), []);
  });

  it("throws on a malformed payload instead of manufacturing a zero-option outage", () => {
    // A silently-empty result here would be reported as "checkout is blocked",
    // turning a transport bug into a fake customer-visible defect.
    assert.throws(() => parseDeliveryGroups({ data: { cart: null } }), /not a node list/);
    assert.throws(() => parseDeliveryGroups({ errors: [] }), /not a node list/);
    assert.throws(() => parseDeliveryGroups(null), /not a node list/);
  });

  it("handles several delivery groups and several options per group", () => {
    const payload = {
      data: {
        cart: {
          deliveryGroups: {
            nodes: [
              { deliveryOptions: [priced("Standard", "8.0")] },
              { deliveryOptions: [priced("Express", "15.0"), priced("Freight", "40.0")] },
            ],
          },
        },
      },
    };
    assert.equal(parseDeliveryGroups(payload).length, 3);
  });
});

describe("verdictFor", () => {
  const base = { countryCode: "DE", postalCode: "10115", addressAccepted: true };

  it("reports no_options when the address was accepted and nothing was quoted", () => {
    assert.equal(verdictFor({ ...base, probes: [] }), "no_options");
  });

  it("reports reachable when anything at all is quoted", () => {
    assert.equal(verdictFor({ ...base, probes: [pricedProbe("Standard", "8.0")] }), "reachable");
    assert.equal(verdictFor({ ...base, probes: [{ kind: "unverified", title: "usps", methodType: "DeliveryParticipant" }] }), "reachable");
  });

  it("reports inconclusive when the address itself was rejected", () => {
    // The probe proved nothing. Reporting it as "blocked" would invent a defect.
    assert.equal(verdictFor({ ...base, addressAccepted: false, probes: [] }), "inconclusive");
  });
});

describe("unreachableDestinations", () => {
  it("selects only the no_options bucket", () => {
    const results: CheckoutReachability[] = [
      { countryCode: "US", postalCode: "10001", addressAccepted: true, probes: [pricedProbe("Standard", "8.0")] },
      { countryCode: "DE", postalCode: "10115", addressAccepted: true, probes: [] },
      { countryCode: "FR", postalCode: "75001", addressAccepted: false, probes: [] },
      { countryCode: "JP", postalCode: "100-0001", addressAccepted: true, probes: [{ kind: "unverified", title: "dhl", methodType: "DeliveryParticipant" }] },
    ];
    assert.deepEqual(unreachableDestinations(results).map(r => r.countryCode), ["DE"]);
  });
});

describe("describeReachability", () => {
  it("never prints an unreadable amount as 0.00", () => {
    const line = describeReachability({
      countryCode: "JP",
      postalCode: "100-0001",
      addressAccepted: true,
      probes: [{ kind: "unverified", title: "dhl_express", methodType: "DeliveryParticipant" }],
    });
    assert.match(line, /NOT 0\.00/);
    assert.doesNotMatch(line, /=0\.00/);
  });

  it("distinguishes an unsellable destination from an unknown rate", () => {
    const line = describeReachability({ countryCode: "DE", postalCode: "10115", addressAccepted: true, probes: [] }, "25.00 USD");
    assert.match(line, /NO DELIVERY OPTIONS/);
    assert.match(line, /checkout cannot complete/);
    assert.match(line, /25\.00 USD/);
  });

  it("states plainly that an inconclusive probe is inconclusive", () => {
    const line = describeReachability({ countryCode: "ZZ", postalCode: "00000", addressAccepted: false, probes: [] });
    assert.match(line, /INCONCLUSIVE/);
    assert.doesNotMatch(line, /NO DELIVERY OPTIONS/);
  });

  it("shows the real amount for a reachable destination", () => {
    const line = describeReachability({
      countryCode: "US",
      postalCode: "10001",
      addressAccepted: true,
      probes: [pricedProbe("Standard", "0.0"), pricedProbe("Express", "15.0")],
    });
    assert.match(line, /reachable/);
    assert.match(line, /"Standard"=0\.0 USD/);
  });
});

describe("PROBE_POSTAL_CODES", () => {
  it("covers the US control and the destinations STI-539 measured", () => {
    for (const cc of ["US", "CA", "GB", "DE", "FR", "ES", "NL", "AU", "NZ", "SG", "JP"]) {
      assert.ok(PROBE_POSTAL_CODES[cc], `missing probe postal code for ${cc}`);
    }
  });
});
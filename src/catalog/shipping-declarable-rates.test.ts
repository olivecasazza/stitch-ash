/**
 * STI-618: the catalog cannot express the two rate shapes the live store
 * actually uses, so it can drift-check neither.
 *
 * Both shapes were measured against the live store this run with real
 * `cartCreate` traffic (see the issue for the request/response evidence):
 *
 *   1. A RATE RANGE. The Domestic zone holds two active rows both named
 *      "Standard": 8.00 unconditioned, and 0.00 carrying
 *      `TOTAL_PRICE >= 70.00`. A buyer is offered exactly one of them, chosen
 *      by cart total. Measured: $50 -> Standard=8.00, $70 -> Standard=0.00,
 *      $185 -> Standard=0.00. The catalog declared a flat 0.00 for all of US,
 *      which is right for the $70 cart and wrong for every cart under it.
 *
 *   2. A CARRIER-CALCULATED rate. Both International services are
 *      `DeliveryParticipant` rows whose `fixedFee` is the operator's surcharge
 *      ON TOP OF a live carrier quote, never the price charged. The catalog
 *      declared a flat 25.00 there, which is unverifiable by construction.
 *
 * Before this, `ShippingRuleSchema` had one required `price: z.string()` and no
 * way to say either thing, so a rule could only assert a single flat amount.
 * `catalog:plan` reported the live threshold as a blind spot in prose, and the
 * declared 25.00 as unverifiable, but neither could be *fixed* by declaring the
 * truth -- and nothing in CI would notice the store changing again.
 *
 * These tests pin the schema and the diff behaviour. They are written against
 * the shapes the live Admin API returns (see `ShippingMethod.conditions`,
 * STI-597) so a store-side change to either shape fails here rather than
 * quietly re-opening the blind spot.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diffShipping } from "./shipping.js";
import { ShippingPolicySchema, ShippingRuleSchema } from "./schema.js";
import type { ShippingPolicy, ShopifyShippingProfile } from "./schema.js";

const STANDARD_8 = "gid://shopify/DeliveryMethodDefinition/825665028141";
const STANDARD_0_CONDITIONED = "gid://shopify/DeliveryMethodDefinition/825665028141?source=RateRangeCondition&source_id=198824656941";

/** The live Domestic zone: an $8 flat rate and a $0 rate over $70. */
function liveDomesticProfile(): ShopifyShippingProfile {
  return {
    profileName: "General profile",
    isDefault: true,
    productHandles: ["sku-001", "sku-002", "sku-003"],
    zones: [
      {
        name: "Domestic",
        countryCodes: ["US"],
        restOfWorld: false,
        methods: [
          {
            id: STANDARD_8,
            name: "Standard",
            active: true,
            price: "8.0",
            currency: "USD",
            rateKind: "fixed_rate",
            conditions: [],
          },
          {
            id: STANDARD_0_CONDITIONED,
            name: "Standard",
            active: true,
            price: "0.0",
            currency: "USD",
            rateKind: "fixed_rate",
            conditions: [
              {
                field: "TOTAL_PRICE",
                operator: "GREATER_THAN_OR_EQUAL_TO",
                amount: "70.0",
                currency: "USD",
              },
            ],
          },
          {
            id: "gid://shopify/DeliveryMethodDefinition/825665028141-express",
            name: "Express",
            active: true,
            price: "15.0",
            currency: "USD",
            rateKind: "fixed_rate",
            conditions: [],
          },
        ],
      },
      {
        name: "International",
        countryCodes: [],
        restOfWorld: true,
        methods: [
          {
            id: "gid://shopify/DeliveryParticipant/1",
            name: "usps",
            active: true,
            price: null,
            currency: null,
            rateKind: "carrier_calculated",
            carrierSurcharge: "0.0",
            conditions: [],
          },
          {
            id: "gid://shopify/DeliveryParticipant/2",
            name: "dhl_express",
            active: true,
            price: null,
            currency: null,
            rateKind: "carrier_calculated",
            carrierSurcharge: "0.0",
            conditions: [],
          },
        ],
      },
    ],
  };
}

function rule(partial: Record<string, unknown> = {}) {
  // `price` is only defaulted when the caller has not chosen a pricing form, so
  // a `carrierCalculated` rule does not also pick up the default flat price and
  // trip the exactly-one-of refine.
  const base: Record<string, unknown> = {
    id: "made-to-order-domestic",
    title: "Made-to-order domestic shipping",
    destination: "US",
    serviceName: "Standard",
  };
  if (!("price" in partial) && !("carrierCalculated" in partial)) base.price = "0.00";
  return ShippingRuleSchema.parse({ ...base, ...partial });
}

function policyWith(rules: unknown[]): ShippingPolicy {
  return ShippingPolicySchema.parse({
    id: "stitch-ash.shipping.default",
    policyName: "STITCH AND ASH pilot shipping",
    originCountryCode: "US",
    currencyCode: "USD",
    rules,
  }) as ShippingPolicy;
}

describe("ShippingRuleSchema can express a rate range (STI-618)", () => {
  it("accepts a threshold alongside the flat price", () => {
    const parsed = rule({ price: "8.00", rateRange: { minOrderSubtotal: "70.00" } });
    assert.equal(parsed.price, "8.00");
    assert.equal(parsed.rateRange?.minOrderSubtotal, "70.00");
  });

  it("still accepts a rule with no threshold, so nothing existing breaks", () => {
    const parsed = rule({ price: "8.00" });
    assert.equal(parsed.rateRange, undefined);
  });

  it("rejects a threshold that is not a decimal string", () => {
    // A bare number is how money gets reinterpreted ("70" vs 70 vs "70.0"), and
    // a threshold that silently compares wrong is the exact STI-421 money bug.
    assert.throws(() => rule({ price: "8.00", rateRange: { minOrderSubtotal: 70 } }));
    assert.throws(() => rule({ price: "8.00", rateRange: { minOrderSubtotal: "seventy" } }));
  });

  it("rejects a negative threshold", () => {
    assert.throws(() => rule({ price: "8.00", rateRange: { minOrderSubtotal: "-1.00" } }));
  });
});

describe("ShippingRuleSchema can express a carrier-calculated rate (STI-618)", () => {
  it("accepts carrierCalculated instead of a flat price", () => {
    const parsed = ShippingRuleSchema.parse({
      id: "made-to-order-international",
      title: "Made-to-order international shipping",
      destination: "REST_OF_WORLD",
      serviceName: "usps",
      carrierCalculated: { carrier: "USPS" },
    });
    assert.equal(parsed.price, undefined);
    assert.equal(parsed.carrierCalculated?.carrier, "USPS");
  });

  it("rejects a rule that declares BOTH a price and carrierCalculated", () => {
    // A rule asserting a flat 25.00 for a carrier-quoted rate is the STI-539
    // shape: a number the operator will act on that the customer is never
    // charged. Accepting both at once would make that mistake expressible.
    const result = ShippingRuleSchema.safeParse({
      id: "r",
      title: "t",
      destination: "REST_OF_WORLD",
      serviceName: "usps",
      price: "25.00",
      carrierCalculated: { carrier: "USPS" },
    });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.match(result.error.issues[0]?.message ?? "", /exactly one of/i);
    }
  });

  it("rejects a rule that declares NEITHER, rather than defaulting to a price", () => {
    // Defaulting `price` to "0.00" here is precisely how an unreadable rate
    // becomes a free rate in a plan line.
    const result = ShippingRuleSchema.safeParse({
      id: "r",
      title: "t",
      destination: "REST_OF_WORLD",
      serviceName: "usps",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.match(result.error.issues[0]?.message ?? "", /exactly one of/i);
    }
  });
});

describe("diffShipping compares a declared threshold against the live rate range (STI-618)", () => {
  it("reports no drift when the declared threshold matches the store", () => {
    // `price` is the BELOW-threshold amount and `rateRange` declares the
    // boundary; free shipping above it is implied. A correct declaration of the
    // live $8.00 / free-over-$70 range must therefore read as zero actions.
    const policy = policyWith([
      rule({ serviceName: "Standard", price: "8.00", rateRange: { minOrderSubtotal: "70.00" } }),
    ]);
    const diff = diffShipping(policy, liveDomesticProfile(), ["sku-001"]);
    const rateLines = diff.actions.filter(a => a.includes("made-to-order-domestic"));
    assert.deepEqual(rateLines, []);
  });

  it("reports a store that still charges above the declared free-shipping threshold", () => {
    const profile = liveDomesticProfile();
    const domestic = profile.zones.find(z => z.name === "Domestic")!;
    const conditioned = domestic.methods.find(m => (m.conditions?.length ?? 0) > 0)!;
    conditioned.price = "3.0";
    const policy = policyWith([
      rule({ serviceName: "Standard", price: "8.00", rateRange: { minOrderSubtotal: "70.00" } }),
    ]);
    const diff = diffShipping(policy, profile, ["sku-001"]);
    const joined = diff.actions.join("\n");
    assert.match(joined, /made-to-order-domestic/);
    assert.match(joined, /free at\/above/i);
  });

  it("reports a base price the store has moved", () => {
    const policy = policyWith([
      rule({ serviceName: "Standard", price: "6.00", rateRange: { minOrderSubtotal: "70.00" } }),
    ]);
    const diff = diffShipping(policy, liveDomesticProfile(), ["sku-001"]);
    const joined = diff.actions.join("\n");
    assert.match(joined, /made-to-order-domestic/);
    assert.match(joined, /6\.00/);
    assert.match(joined, /8\.0/);
  });

  it("reports a threshold the store has moved", () => {
    const policy = policyWith([
      rule({ serviceName: "Standard", price: "8.00", rateRange: { minOrderSubtotal: "50.00" } }),
    ]);
    const diff = diffShipping(policy, liveDomesticProfile(), ["sku-001"]);
    const joined = diff.actions.join("\n");
    assert.match(joined, /made-to-order-domestic/);
    assert.match(joined, /50\.00/);
    assert.match(joined, /70\.0/);
  });

  it("reports a declared flat rate that ignores the store's threshold", () => {
    // This is the real STI-618 finding: a flat 0.00 declared for all of US is
    // silently wrong for every cart under $70. The rate range it ignores is
    // already known to diffShipping, so a declared flat price must not read as
    // a clean match against one arbitrarily-chosen row.
    const policy = policyWith([rule({ serviceName: "Standard", price: "0.00" })]);
    const diff = diffShipping(policy, liveDomesticProfile(), ["sku-001"]);
    const joined = diff.actions.join("\n");
    assert.match(joined, /made-to-order-domestic/);
    assert.match(joined, /rate range/i);
  });

  it("never describes an ignored threshold as a match", () => {
    const policy = policyWith([rule({ serviceName: "Standard", price: "0.00" })]);
    const diff = diffShipping(policy, liveDomesticProfile(), ["sku-001"]);
    for (const action of diff.actions) {
      assert.doesNotMatch(action, /no changes/i);
    }
  });
});

describe("diffShipping reports a carrier-calculated declared rate as UNVERIFIABLE (STI-618)", () => {
  it("does not print a declared flat price as verified against a carrier quote", () => {
    const policy = policyWith([
      rule({
        id: "made-to-order-international",
        title: "Made-to-order international shipping",
        destination: "REST_OF_WORLD",
        serviceName: "usps",
        carrierCalculated: { carrier: "USPS" },
      }),
    ]);
    const diff = diffShipping(policy, liveDomesticProfile(), ["sku-001"]);
    const joined = diff.actions.join("\n");
    assert.match(joined, /UNVERIFIABLE/);
    assert.match(joined, /USPS/);
  });

  it("does not report a carrier-calculated rule as drift just for lacking a price", () => {
    // A missing flat price is not a mismatch. It is an absence, and calling it
    // drift sends the operator to change a rate that is behaving correctly.
    const policy = policyWith([
      rule({
        id: "made-to-order-international",
        title: "Made-to-order international shipping",
        destination: "REST_OF_WORLD",
        serviceName: "usps",
        carrierCalculated: { carrier: "USPS" },
      }),
    ]);
    const diff = diffShipping(policy, liveDomesticProfile(), ["sku-001"]);
    const joined = diff.actions.join("\n");
    assert.doesNotMatch(joined, /declared .* -> store/i);
    assert.doesNotMatch(joined, /price (mismatch|difference)/i);
  });

  it("never formats an unreadable carrier rate as 0.00 (STI-573/STI-539)", () => {
    const policy = policyWith([
      rule({
        id: "made-to-order-international",
        title: "Made-to-order international shipping",
        destination: "REST_OF_WORLD",
        serviceName: "usps",
        carrierCalculated: { carrier: "USPS" },
      }),
    ]);
    const diff = diffShipping(policy, liveDomesticProfile(), ["sku-001"]);
    for (const action of diff.actions) {
      assert.doesNotMatch(action, /carrier-calculated[^.]*=\s*0\.00/i);
      assert.doesNotMatch(action, /quoted at 0\.00/i);
    }
  });
});

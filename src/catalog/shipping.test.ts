import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { destinationMatches, diffShipping, normalizePrice, planShippingPolicies } from "./shipping.js";
import type { ShippingPolicy, ShopifyShippingProfile } from "./schema.js";

function policy(partial: Partial<ShippingPolicy> = {}): ShippingPolicy {
  return {
    id: "stitch-ash.shipping.default",
    policyName: "STITCH AND ASH pilot shipping",
    originCountryCode: "US",
    currencyCode: "USD",
    processingTime: { madeToOrderMinDays: 14, madeToOrderMaxDays: 35 },
    tracking: { required: true, notifyCustomer: true },
    fulfillment: { mode: "manual" },
    rules: [
      {
        id: "made-to-order-domestic",
        title: "Made-to-order domestic shipping",
        destination: "US",
        serviceName: "Tracked domestic shipping",
        price: "0.00",
        estimatedTransitDays: { min: 3, max: 7 },
      },
    ],
    ...partial,
  };
}

describe("planShippingPolicies is a restatement, not a diff", () => {
  it("emits the same lines for two different declared prices", () => {
    // A diff would report these two as drift. Restating the YAML emits the
    // same shape either way, so nothing downstream can tell a changed rate
    // from an unchanged one.
    const cheap = planShippingPolicies([policy()]);
    const dear = planShippingPolicies([
      policy({
        rules: [
          {
            id: "made-to-order-domestic",
            title: "Made-to-order domestic shipping",
            destination: "US",
            serviceName: "Tracked domestic shipping",
            price: "999.00",
            estimatedTransitDays: { min: 3, max: 7 },
          },
        ],
      }),
    ]);

    assert.equal(cheap.length, 2);
    assert.equal(dear.length, 2);
    assert.match(dear[1] ?? "", /999\.00/);
  });

  it("reports no action lines, so a changed rate cannot reach the change count", () => {
    // catalog.ts prints these lines inside the same block as real diff lines
    // but never adds them to `changeCount`, so a drifted rate is invisible in
    // the plan summary that gates `catalog:apply`.
    const lines = planShippingPolicies([policy()]);
    for (const line of lines) {
      assert.doesNotMatch(line, /^(add|set|remove|create|update)\b/);
    }
  });
});

describe("normalizePrice", () => {
  it("treats formatting-only differences as equal", () => {
    assert.equal(normalizePrice("0"), normalizePrice("0.00"));
    assert.equal(normalizePrice("25"), "25.00");
  });

  it("does not collapse a real difference", () => {
    assert.notEqual(normalizePrice("25.00"), normalizePrice("25.50"));
  });

  it("returns null for an unparseable price rather than defaulting to zero", () => {
    // A typo that read as "0.00" would report a free rate the store never has.
    assert.equal(normalizePrice("free"), null);
    assert.equal(normalizePrice(""), null);
  });
});

describe("destinationMatches", () => {
  const domestic = { name: "Domestic", countryCodes: ["US"], restOfWorld: false, methods: [] };

  it("matches an explicit country code", () => {
    assert.equal(destinationMatches("US", domestic, "US"), true);
  });

  it("does not match a country the zone does not contain", () => {
    assert.equal(destinationMatches("CA", domestic, "US"), false);
  });

  it("matches REST_OF_WORLD against an explicit rest-of-world flag", () => {
    const row = { name: "International", countryCodes: ["DE", "FR"], restOfWorld: true, methods: [] };
    assert.equal(destinationMatches("REST_OF_WORLD", row, "US"), true);
  });

  it("matches REST_OF_WORLD against a materialized list that omits the origin", () => {
    // Shopify sometimes materializes "rest of world" as an explicit country
    // list instead of setting the flag. Reporting no match here would be a
    // false alarm on a correct store.
    const materialized = { name: "International", countryCodes: ["DE", "FR"], restOfWorld: false, methods: [] };
    assert.equal(destinationMatches("REST_OF_WORLD", materialized, "US"), true);
  });

  it("does not treat a zone containing only the origin as rest-of-world", () => {
    assert.equal(destinationMatches("REST_OF_WORLD", domestic, "US"), false);
  });
});

describe("diffShipping compares declared rules against the store (STI-507)", () => {
  function profile(overrides: Partial<ShopifyShippingProfile> = {}): ShopifyShippingProfile {
    return {
      profileName: "General profile",
      isDefault: true,
      productHandles: ["sku-001", "sku-002", "sku-003"],
      zones: [
        {
          name: "Domestic",
          countryCodes: ["US"],
          restOfWorld: false,
          methods: [{ name: "Tracked domestic shipping", active: true, price: "0.00", currency: "USD" }],
        },
      ],
      ...overrides,
    };
  }

  it("reports no actions when the declared rate matches the store", () => {
    const diff = diffShipping(policy(), profile());
    assert.deepEqual(diff.actions, []);
  });

  it("reports a price difference the restatement could never show", () => {
    // The exact regression: a YAML rate of 0.00 against a store charging 25.00.
    const dear = profile();
    dear.zones[0]!.methods[0]!.price = "25.00";
    const diff = diffShipping(policy(), dear);
    assert.equal(diff.actions.length, 1);
    assert.match(diff.actions[0]!, /declared .*0\.00 -> store 25\.00 USD/);
  });

  it("treats a formatting-only price difference as no drift", () => {
    const bare = profile();
    bare.zones[0]!.methods[0]!.price = "0";
    assert.deepEqual(diffShipping(policy(), bare).actions, []);
  });

  it("reports a derived rate as unverifiable instead of assuming it matches", () => {
    const derived = profile();
    derived.zones[0]!.methods[0]!.price = null;
    const diff = diffShipping(policy(), derived);
    assert.equal(diff.actions.length, 1);
    assert.match(diff.actions[0]!, /no fixed-fee price/);
  });

  it("does not report a derived rate as free", () => {
    const derived = profile();
    derived.zones[0]!.methods[0]!.price = null;
    const diff = diffShipping(policy(), derived);
    assert.doesNotMatch(diff.actions.join("\n"), /-> store 0\.00/);
  });

  it("reports a renamed service rather than silently matching nothing", () => {
    const renamed = profile();
    renamed.zones[0]!.methods[0]!.name = "Standard";
    const diff = diffShipping(policy(), renamed);
    assert.ok(diff.actions.some(a => /service renamed "Tracked domestic shipping" -> "Standard"/.test(a)));
  });

  it("falls back to the sole active service and says so", () => {
    const renamed = profile();
    renamed.zones[0]!.methods = [{ name: "Standard", active: true, price: "0.00", currency: "USD" }];
    const diff = diffShipping(policy(), renamed);
    assert.ok(diff.actions.some(a => /service renamed/.test(a)));
    assert.deepEqual(diff.actions.filter(a => /not found/.test(a)), []);
  });

  it("reports an inactive store service that the catalog declares", () => {
    const inactive = profile();
    inactive.zones[0]!.methods[0]!.active = false;
    const diff = diffShipping(policy(), inactive);
    assert.ok(diff.actions.some(a => /INACTIVE/.test(a)));
  });

  it("reports a missing destination zone as drift", () => {
    const diff = diffShipping(policy(), profile({ zones: [] }));
    assert.equal(diff.actions.length, 1);
    assert.match(diff.actions[0]!, /declared destination US has no matching zone/);
  });

  it("reports a missing remote profile instead of reporting nothing to do", () => {
    const diff = diffShipping(policy(), null);
    assert.equal(diff.actions.length, 1);
    assert.match(diff.actions[0]!, /no delivery profile found/);
  });

  it("reports a currency mismatch", () => {
    const other = profile();
    other.zones[0]!.methods[0]!.currency = "CAD";
    const diff = diffShipping(policy(), other);
    assert.ok(diff.actions.some(a => /currency CAD != declared USD/.test(a)));
  });

  it("records what was compared so the plan shows its evidence", () => {
    const diff = diffShipping(policy(), profile());
    assert.ok(diff.notes.some(n => /General profile/.test(n)));
    assert.ok(diff.notes.some(n => /3 product/.test(n)));
  });

  it("does not report no-changes for an unreadable declared price", () => {
    const badPrice = policy({
      rules: [
        {
          id: "made-to-order-domestic",
          title: "Made-to-order domestic shipping",
          destination: "US",
          serviceName: "Tracked domestic shipping",
          price: "",
          estimatedTransitDays: { min: 3, max: 7 },
        },
      ],
    });
    const diff = diffShipping(badPrice, profile());
    assert.equal(diff.actions.length, 1);
    assert.match(diff.actions[0]!, /is not a valid number/);
  });

  it("checks each declared rule against its own zone", () => {
    const twoZones = profile();
    twoZones.zones.push({
      name: "International",
      countryCodes: ["DE", "FR"],
      restOfWorld: true,
      methods: [{ name: "Tracked international shipping", active: true, price: "25.00", currency: "USD" }],
    });
    const diff = diffShipping(
      policy({
        rules: [
          ...policy().rules!,
          {
            id: "made-to-order-international",
            title: "Made-to-order international shipping",
            destination: "REST_OF_WORLD",
            serviceName: "Tracked international shipping",
            price: "25.00",
            estimatedTransitDays: { min: 7, max: 21 },
          },
        ],
      }),
      twoZones,
    );
    assert.deepEqual(diff.actions, []);
  });
});

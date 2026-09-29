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
          methods: [
            {
              id: "gid://shopify/DeliveryMethodDefinition/825665028141",
              name: "Tracked domestic shipping",
              active: true,
              price: "0.00",
              currency: "USD",
            },
          ],
        },
      ],
      ...overrides,
    };
  }

  it("reports no actions when the declared rate matches the store", () => {
    const diff = diffShipping(policy(), profile());
    assert.deepEqual(diff.actions, []);
  });

  it("reports a catalog product that is in no delivery profile on the store", () => {
    // A product with no delivery profile cannot be bought: checkout has no
    // profile to read rates from. The zone comparison cannot see this, because
    // it only ever looks at the one profile's zones — so a profile covering
    // NOTHING with a perfect declared rate reported zero actions.
    const none = profile({ productHandles: [] });
    const diff = diffShipping(policy(), none, ["sku-001", "sku-002", "sku-003"]);
    assert.equal(diff.actions.length, 1);
    assert.match(diff.actions[0]!, /in no delivery profile/);
    assert.match(diff.actions[0]!, /sku-001, sku-002, sku-003/);
  });

  it("reports a partially uncovered profile rather than a pass", () => {
    const partial = profile({ productHandles: ["sku-001", "sku-003"] });
    const diff = diffShipping(policy(), partial, ["sku-001", "sku-002", "sku-003"]);
    assert.equal(diff.actions.length, 1);
    // Only the uncovered handle is listed as missing; the covered ones appear
    // solely in the trailing "profile covers ..." clause.
    assert.match(diff.actions[0]!, /: sku-002 \(profile/);
  });

  it("says nothing about coverage when the caller declares no handles", () => {
    // The default keeps every existing caller and test meaningful: with no
    // catalog handle list there is no coverage claim to make.
    const none = profile({ productHandles: [] });
    assert.deepEqual(diffShipping(policy(), none).actions, []);
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

  it("does not report a carrier-calculated surcharge as the price", () => {
    // The live store's International zone, read 2026-09-29: both services are
    // DeliveryParticipant with fixedFee 0.0 and percentageOfRateFee 0. Mapping
    // that fixedFee to `price` printed `"usps"=0.0 USD` in catalog:plan, which
    // reads as free international shipping. The surcharge is not the price.
    const carrier = profile();
    carrier.zones[0]!.methods[0] = {
      id: "gid://shopify/DeliveryMethodDefinition/825665093677",
      name: "Tracked domestic shipping",
      active: true,
      price: null,
      currency: null,
      rateKind: "carrier_calculated",
      carrierSurcharge: "0.0",
    };
    const diff = diffShipping(policy(), carrier);
    const line = diff.actions.join("\n");
    assert.match(line, /CARRIER-CALCULATED/);
    assert.match(line, /surcharge is 0\.0 USD/);
    // The number an operator would act on must not be presented as the rate:
    // no "-> store 0.00" verdict, and no bare price verdict at all.
    assert.doesNotMatch(line, /-> store 0\.00/);
    assert.doesNotMatch(line, /declared \S+ USD -> store/);
  });

  it("does not print a carrier-calculated surcharge as a price in the not-found listing", () => {
    // Same defect, different branch: the "declared service not found" line
    // lists the store's other services, and it rendered the live international
    // pair as "usps"=0.0 USD, "dhl_express"=0.0 USD.
    const carrier = profile();
    // Renamed away from the declared name, and two services in the zone like
    // the live International zone — with a single active service the diff
    // falls back to it and reports a rename instead of "not found", so the
    // listing this asserts is only reached with an ambiguous set.
    carrier.zones[0]!.methods = [
      {
        id: "gid://shopify/DeliveryMethodDefinition/825665093677",
        name: "usps",
        active: true,
        price: null,
        currency: null,
        rateKind: "carrier_calculated",
        carrierSurcharge: "0.0",
      },
      {
        id: "gid://shopify/DeliveryMethodDefinition/825665126445",
        name: "dhl_express",
        active: true,
        price: null,
        currency: null,
        rateKind: "carrier_calculated",
        carrierSurcharge: "0.0",
      },
    ];
    const diff = diffShipping(policy(), carrier);
    const line = diff.actions.find(a => /not found in zone/.test(a))!;
    assert.match(line, /"usps".*carrier-calculated/);
    assert.doesNotMatch(line, /"usps"=0\.0/);
  });

  it("still compares a real fixed rate against the declared price", () => {
    // The other direction: DeliveryRateDefinition carries a genuine flat price
    // in `price`, so it must keep being compared rather than reported unknown.
    const fixed = profile();
    fixed.zones[0]!.methods[0] = {
      id: "gid://shopify/DeliveryMethodDefinition/825665060909",
      name: "Tracked domestic shipping",
      active: true,
      price: "25.00",
      currency: "USD",
      rateKind: "fixed_rate",
    };
    // The declared rule is 0.00, so a real 25.00 flat rate IS drift and must
    // still be reported — proving the fixed_rate path compares rather than
    // falling through to "unknown".
    const diff = diffShipping(policy(), fixed);
    assert.equal(diff.actions.length, 1);
    assert.match(diff.actions[0]!, /-> store 25\.00 USD/);

    // And when the declared amount genuinely matches, there is no drift.
    fixed.zones[0]!.methods[0]!.price = "0.00";
    assert.deepEqual(diffShipping(policy(), fixed).actions, []);
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

  it("does not silently compare against one of several identically-named services", () => {
    // The live Domestic zone returns TWO active services both named "Standard"
    // with different GIDs. `find(m => m.name === rule.serviceName)` took the
    // first and reported nothing about the second — a silent pass on the case
    // where the declared rate cannot be checked against a single rate at all.
    const collided = profile();
    collided.zones[0]!.methods = [
      { id: "gid://shopify/DeliveryMethodDefinition/825665028141", name: "Tracked domestic shipping", active: true, price: "0.00", currency: "USD" },
      { id: "gid://shopify/DeliveryMethodDefinition/825665028141?source=RateRangeCondition&source_id=198824656941", name: "Tracked domestic shipping", active: true, price: "0.00", currency: "USD" },
    ];

    const diff = diffShipping(policy(), collided);
    assert.equal(diff.actions.length, 1);
    assert.match(diff.actions[0]!, /2 services all named "Tracked domestic shipping"/);
    assert.match(diff.actions[0]!, /cannot be checked against one rate/);
    // Both rows must be identifiable, or the operator has to go to the Admin UI.
    assert.match(diff.actions[0]!, /825665028141/);
    assert.match(diff.actions[0]!, /198824656941/);
    assert.match(diff.actions[0]!, /they currently agree on price/);
  });

  it("says a name collision is a live money bug when the rows disagree", () => {
    // Same collision, but now the two "Standard" rows charge different amounts:
    // some customers are quoted one rate and some another for the same service.
    const split = profile();
    split.zones[0]!.methods = [
      { id: "gid://shopify/DeliveryMethodDefinition/825665028141", name: "Tracked domestic shipping", active: true, price: "0.00", currency: "USD" },
      { id: "gid://shopify/DeliveryMethodDefinition/825665060909", name: "Tracked domestic shipping", active: true, price: "25.00", currency: "USD" },
    ];

    const diff = diffShipping(policy(), split);
    assert.equal(diff.actions.length, 1);
    assert.match(diff.actions[0]!, /THEY DISAGREE \(2 distinct prices\)/);
    assert.match(diff.actions[0]!, /customers are charged different rates/);
    // A disagreement must never be reduced to a bare "not found".
    assert.doesNotMatch(diff.actions[0]!, /not found in zone/);
  });

  it("reports a live price collision the catalog does not name (STI-577)", () => {
    // The exact live defect. The store's Domestic zone has two active rows both
    // named "Standard", at 8.00 and 0.00, while the catalog declares "Tracked
    // domestic shipping". Every declared rule therefore took the renamed
    // not-found branch, which lists rates without judging them, and a
    // customer-visible pricing defect was reported as a mere name drift.
    //
    // A collision is a defect in the STORE, so it must be reported whether or
    // not the catalog happens to name the service.
    const live = profile();
    live.zones[0]!.methods = [
      {
        id: "gid://shopify/DeliveryMethodDefinition/825665028141",
        name: "Standard",
        active: true,
        price: "8.0",
        currency: "USD",
        rateKind: "fixed_rate",
      },
      {
        id: "gid://shopify/DeliveryMethodDefinition/825665028141?source=RateRangeCondition&source_id=198824656941",
        name: "Standard",
        active: true,
        price: "0.0",
        currency: "USD",
        rateKind: "fixed_rate",
      },
      {
        id: "gid://shopify/DeliveryMethodDefinition/825665060909",
        name: "Express",
        active: true,
        price: "15.0",
        currency: "USD",
        rateKind: "fixed_rate",
      },
    ];

    const diff = diffShipping(policy(), live);
    const collisions = diff.actions.filter(a => /all named "Standard"/.test(a));
    assert.equal(collisions.length, 1);
    const line = collisions[0]!;
    assert.match(line, /no declared rule covers that name/);
    assert.match(line, /THEY DISAGREE \(2 distinct prices\)/);
    // Both rows must be identifiable and priced, or the operator has to open
    // the Admin UI to learn what is being charged.
    assert.match(line, /825665028141\]=8\.0 USD/);
    assert.match(line, /source_id=198824656941\]=0\.0 USD/);
    // The defect must be attributed to the zone, not to the declared rate: the
    // declared rule is fine, the store is not.
    assert.match(line, /zone "Domestic"/);
    assert.doesNotMatch(line, /shipping rule made-to-order-domestic/);
  });

  it("does not report the same collision twice when a rule names it too", () => {
    // One defect must produce one line. The per-rule branch can also name the
    // declared amount, so it keeps the collision when a rule claims the name.
    const live = profile();
    live.zones[0]!.methods = [
      { id: "gid://shopify/DeliveryMethodDefinition/1", name: "Tracked domestic shipping", active: true, price: "0.00", currency: "USD" },
      { id: "gid://shopify/DeliveryMethodDefinition/2", name: "Tracked domestic shipping", active: true, price: "25.00", currency: "USD" },
    ];
    const diff = diffShipping(policy(), live);
    assert.equal(diff.actions.length, 1);
    assert.match(diff.actions[0]!, /shipping rule made-to-order-domestic/);
    assert.match(diff.actions[0]!, /THEY DISAGREE/);
  });

  it("calls a collision of one active and one inactive row latent, not a live charge", () => {
    // Only an active row can be offered to a buyer, so two rows that cannot
    // both be quoted are untidy rather than a current money bug. Saying
    // "customers are charged different rates" here would be an overclaim.
    const latent = profile();
    latent.zones[0]!.methods = [
      { id: "gid://shopify/DeliveryMethodDefinition/1", name: "Standard", active: true, price: "8.0", currency: "USD" },
      { id: "gid://shopify/DeliveryMethodDefinition/2", name: "Standard", active: false, price: "0.0", currency: "USD" },
    ];
    const diff = diffShipping(policy(), latent);
    const collision = diff.actions.find(a => /all named "Standard"/.test(a));
    assert.ok(collision, "the collision must still be reported");
    assert.match(collision, /only 1 of them is active/);
    assert.doesNotMatch(collision, /customers are charged different rates/);
  });

  it("does not treat two unquoted carrier-calculated rows as agreeing (STI-577)", () => {
    // Both rows price as null, so comparing prices alone yields a set of size
    // one and reports "they currently agree on price" — for two rates the Admin
    // API never returned. That is a false green on the one case the collision
    // check exists to catch.
    const bothCarrier = profile();
    bothCarrier.zones[0]!.methods = [
      { id: "gid://shopify/DeliveryMethodDefinition/1", name: "Tracked domestic shipping", active: true, price: null, currency: null, rateKind: "carrier_calculated", carrierSurcharge: "0.0" },
      { id: "gid://shopify/DeliveryMethodDefinition/2", name: "Tracked domestic shipping", active: true, price: null, currency: null, rateKind: "carrier_calculated", carrierSurcharge: "5.00" },
    ];
    const diff = diffShipping(policy(), bothCarrier);
    assert.equal(diff.actions.length, 1);
    assert.doesNotMatch(diff.actions[0]!, /they currently agree on price/);
  });

  it("still matches a unique name when other services share a different name", () => {
    // The collision must not disable normal matching for a zone that happens to
    // contain two rows, as long as the DECLARED name is unique among them.
    const mixed = profile();
    mixed.zones[0]!.methods = [
      { id: "gid://shopify/DeliveryMethodDefinition/825665028141", name: "Tracked domestic shipping", active: true, price: "0.00", currency: "USD" },
      { id: "gid://shopify/DeliveryMethodDefinition/825665028142", name: "Standard", active: true, price: "0.00", currency: "USD" },
      { id: "gid://shopify/DeliveryMethodDefinition/825665028143", name: "Standard", active: true, price: "0.00", currency: "USD" },
    ];
    // The two "Standard" rows are the store's own problem even though the
    // declared rule matches cleanly, so they are reported — under the zone, not
    // as a failure of the declared rate.
    const diff = diffShipping(policy(), mixed);
    assert.equal(diff.actions.length, 1);
    assert.match(diff.actions[0]!, /zone "Domestic" has 2 services all named "Standard"/);
    assert.doesNotMatch(diff.actions[0]!, /shipping rule/);
  });

  it("checks each declared rule against its own zone", () => {
    const twoZones = profile();
    twoZones.zones.push({
      name: "International",
      countryCodes: ["DE", "FR"],
      restOfWorld: true,
      methods: [
        {
          id: "gid://shopify/DeliveryMethodDefinition/825665093677",
          name: "Tracked international shipping",
          active: true,
          price: "25.00",
          currency: "USD",
        },
      ],
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

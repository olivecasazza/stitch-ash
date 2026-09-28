import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planShippingPolicies } from "./shipping.js";
import type { ShippingPolicy } from "./schema.js";

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

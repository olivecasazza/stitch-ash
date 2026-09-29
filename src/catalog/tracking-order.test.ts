import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOrderLookupQuery,
  buildOrderSearchFilter,
  isAlreadyFulfilled,
  parseOrderFulfillmentTarget,
  renderTrackingPlan,
} from "./fulfillment-tracking.js";

/**
 * STI-484: the tracking read shipped a query that is invalid against the live
 * Admin schema. `order(name:)` does not exist, `Order.fulfillmentStatus` does
 * not exist, and `FulfillmentService.name` does not exist. The response is a
 * 200 carrying `errors`, and the old code only checked `response.ok`, so a real
 * order was reported as "not found in Shopify" forever.
 *
 * These tests pin the two halves of the fix: the query is one the schema
 * accepts, and a GraphQL error payload is surfaced instead of silently
 * degrading to a "not found" plan.
 */
describe("tracking order lookup (STI-484)", () => {
  it("looks the order up through the orders search field, which the schema accepts", () => {
    const query = buildOrderLookupQuery();
    assert.ok(query.includes("orders(first: 1, query: $query)"), "must filter via orders(query:)");
    assert.ok(!/\border\s*\(\s*name\s*:/.test(query), "order(name:) is not a real Admin field");
    assert.ok(!query.includes("fulfillmentStatus"), "Order.fulfillmentStatus does not exist");
    assert.match(query, /fulfillmentService\s*\{[^}]*handle/, "FulfillmentService exposes handle, not name");
  });

  it("escapes the order name so a '#' cannot break the search filter", () => {
    assert.equal(buildOrderSearchFilter("#1001"), "name:#1001");
    assert.equal(buildOrderSearchFilter("A#B"), 'name:"A#B"');
  });

  it("parses a real order payload into a fulfillment target", () => {
    const payload = {
      data: {
        orders: {
          edges: [
            {
              node: {
                id: "gid://shopify/Order/18667225808941",
                name: "#1001",
                displayFulfillmentStatus: "FULFILLED",
                retailLocation: { id: "gid://shopify/Location/85401010221" },
                lineItems: {
                  edges: [
                    {
                      node: {
                        id: "gid://shopify/LineItem/50232219631661",
                        quantity: 1,
                        variant: { id: "gid://shopify/ProductVariant/66758592856109", sku: "sku-001-L" },
                        fulfillmentService: { id: "gid://shopify/FulfillmentService/manual", handle: "manual" },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    };

    const target = parseOrderFulfillmentTarget(payload, "#1001");
    assert.ok(target, "a resolvable order must produce a target");
    assert.equal(target!.orderId, "gid://shopify/Order/18667225808941");
    assert.equal(target!.lineItemId, "gid://shopify/LineItem/50232219631661");
    assert.equal(target!.quantity, 1);
    assert.equal(target!.fulfillmentService, "manual");
    // STI-484: locationId used to be hardcoded "" while the catalog policy is
    // primary_shopify_location, so a fulfillment could not be bound to a place.
    assert.equal(target!.locationId, "gid://shopify/Location/85401010221");
    // STI-571: the query already asked for this and the parser threw it away.
    assert.equal(target!.fulfillmentStatus, "FULFILLED");
  });

  it("falls back to an empty status when the store omits the field", () => {
    const payload = {
      data: {
        orders: {
          edges: [
            {
              node: {
                id: "gid://shopify/Order/1",
                name: "#1002",
                lineItems: {
                  edges: [{ node: { id: "gid://shopify/LineItem/1", quantity: 1, variant: { id: "v", sku: "s" } } }],
                },
              },
            },
          ],
        },
      },
    };
    assert.equal(parseOrderFulfillmentTarget(payload, "#1002")?.fulfillmentStatus, "");
  });

  it("refuses an order with no line items rather than inventing a target", () => {
    const payload = {
      data: { orders: { edges: [{ node: { id: "gid://shopify/Order/1", name: "#1001", lineItems: { edges: [] } } }] } },
    };
    assert.equal(parseOrderFulfillmentTarget(payload, "#1001"), null);
  });

  it("surfaces a GraphQL errors payload instead of degrading to 'not found'", () => {
    const payload = { errors: [{ message: "Field 'order' is missing required arguments: id" }] };
    // Before the fix this payload produced a null target, so `tracking:plan`
    // printed "order #1001: not found in Shopify" and `tracking:apply` refused.
    // A schema or auth failure is not an absent order and must be loud.
    assert.throws(
      () => parseOrderFulfillmentTarget(payload, "#1001"),
      /missing required arguments/,
      "a schema/auth error must not masquerade as an absent order",
    );
  });
});

/**
 * STI-571: `tracking:plan` printed `status: ready to apply` for order #1001 on
 * the live store, which the Admin API reports as `displayFulfillmentStatus:
 * FULFILLED`. The lookup query requested that field and `parseOrderFulfillmentTarget`
 * dropped it, so the plan had no way to tell a fresh order from one that
 * already had a fulfillment on it. `fulfillmentCreate` adds a fulfillment
 * rather than attaching tracking to the existing one, so "ready to apply" was
 * the wrong answer for a customer order that was already shipped.
 */
describe("tracking plan reports the store's real fulfillment status (STI-571)", () => {
  const baseTarget = {
    orderId: "gid://shopify/Order/18667225808941",
    orderName: "#1001",
    lineItemId: "gid://shopify/LineItem/50232219631661",
    variantId: "gid://shopify/ProductVariant/66758592856109",
    quantity: 1,
    fulfillmentService: "manual",
    locationId: "gid://shopify/Location/85401010221",
  };
  const input = { orderName: "#1001", carrier: "USPS", trackingNumber: "9400", trackingUrl: undefined, notifyCustomer: false };

  it("treats only FULFILLED as already fulfilled, case- and space-insensitively", () => {
    assert.equal(isAlreadyFulfilled("FULFILLED"), true);
    assert.equal(isAlreadyFulfilled(" fulfilled "), true);
    // PARTIALLY_FULFILLED is a judgment call for a human, not a hard block.
    assert.equal(isAlreadyFulfilled("PARTIALLY_FULFILLED"), false);
    assert.equal(isAlreadyFulfilled("UNFULFILLED"), false);
    assert.equal(isAlreadyFulfilled(""), false);
  });

  it("does not say 'ready to apply' for an order the store already reports FULFILLED", () => {
    const lines = renderTrackingPlan(input, { ...baseTarget, fulfillmentStatus: "FULFILLED" });
    const text = lines.join("\n");
    assert.ok(!text.includes("status: ready to apply"), "a fulfilled order must not read as ready to apply");
    assert.match(text, /NOT READY/);
    assert.match(text, /duplicate fulfillment/);
    assert.match(text, /store_fulfillment_status: FULFILLED/);
  });

  it("still says 'ready to apply' for an unfulfilled order", () => {
    const lines = renderTrackingPlan(input, { ...baseTarget, fulfillmentStatus: "UNFULFILLED" });
    assert.match(lines.join("\n"), /status: ready to apply/);
  });

  it("does not claim a status the store did not report", () => {
    const lines = renderTrackingPlan(input, { ...baseTarget, fulfillmentStatus: "" });
    assert.match(lines.join("\n"), /store_fulfillment_status: NOT_REPORTED_BY_STORE/);
  });

  it("warns that a partially fulfilled order is planned against the first line item only", () => {
    const lines = renderTrackingPlan(input, { ...baseTarget, fulfillmentStatus: "PARTIALLY_FULFILLED" });
    const text = lines.join("\n");
    assert.match(text, /FIRST line item only/);
    assert.match(text, /status: ready to apply/, "partial fulfillment is surfaced, not blocked");
  });

  it("still reports a missing order rather than guessing", () => {
    assert.deepEqual(renderTrackingPlan(input, null), ["order #1001: not found in Shopify — cannot plan"]);
  });
});


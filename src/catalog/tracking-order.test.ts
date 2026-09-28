import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOrderLookupQuery,
  buildOrderSearchFilter,
  parseOrderFulfillmentTarget,
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


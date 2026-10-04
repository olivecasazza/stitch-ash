# End-to-End Test Purchase Runbook

**Status: NOT RUN. No test purchase has ever been completed on this store.**

This document is a *runbook* — instructions for executing a test purchase. It is not a
record of one having happened. Do not read it as evidence that a purchase completed.

As of 2026-10-04 the store's entire order history is a single seed fixture, `#1001`
(created 2026-05-26, total `0.0 USD`, no shipping address, no tracking, created from draft
order `#D1`). Verified with `ordersCount { count precision }` returning
`{ count: 1, precision: "EXACT" }`. There is no test-purchase order.

## Blocker: a purchase cannot complete while the storefront password is on

The checkout flow below will dead-end at the Shopify password page, so steps 3 and 4 cannot
succeed until an operator disables the store password (see STI-660). Reproduced 2026-10-04:

```
POST https://preview.stitch-ash.com/api/checkout  {"items":[{"variantId":"...","quantity":1}]}
-> 200 {"checkoutUrl":"https://www.stitch-ash.com/cart/c/..."}
GET that checkoutUrl      -> 302 https://www.stitch-ash.com/checkouts/cn/.../en-us
GET following the redirect -> 200 https://www.stitch-ash.com/password
```

The cart is created correctly and the Storefront API works; the store then refuses to display
the checkout. Unblocking action is an operator step: Shopify Admin -> Settings -> Online Store
-> Preferences -> disable the store password.

## How to execute the test purchase
1. Navigate to: https://preview.stitch-ash.com/products/sku-003/
2. Click **Add to cart**. The site will initialize the cart via the Cloudflare Page Function and transition you directly to the Shopify checkout flow.
3. Complete the checkout process with your shipping address. 
4. After purchase, the live order will appear in your Shopify Admin dashboard.

## Remaining Manual Shopify Admin Constraints
1. **Payments Setup**: Ensure you have a payment provider enabled in your Shopify Admin (Settings > Payments). To run a test without charging your real card, you can temporarily enable Shopify's "Bogus Gateway". Otherwise, a real transaction will occur.
2. **Inventory Overrides**: The `inventoryPolicy` for the products in `catalog/products/*.yaml` has been set to `CONTINUE`. This bypasses the current `0` stock limit at the Portland location (`gid://shopify/Location/85401010221`) so you can purchase immediately. Shopify will record the inventory as `-1`. 
3. **Fulfillment**: To complete the shipping test, open the Order in Shopify Admin and fulfill it from the Portland location. You can purchase and print a test shipping label directly through Shopify Shipping. 
4. **Future Strict Inventory**: Once you have real stock physically counted, we can update the catalog YAMLs to `inventoryPolicy: DENY`. This will prevent customers from ordering out-of-stock items, but requires you to maintain accurate counts via the Shopify Admin UI or API.

Note on the `-1` in step 2: that is the intended output of this override, not an incident. The
`-1` currently on `sku-001-L` was produced by fixture order `#1001`, which has no address and no
money on it — no customer has been oversold (see STI-619).
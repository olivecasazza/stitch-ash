# End-to-End Test Purchase Handoff

The Storefront API checkout flow is now live and functional on the Cloudflare Pages preview domain.

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
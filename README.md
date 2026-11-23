# BBEW · React storefront and admin

A single React + Vite frontend. Both interfaces share the same browser-local
demo data. Use the same browser and origin to see changes on both sides.

## Start

Requires Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

- Storefront: http://127.0.0.1:5173/
- Admin: http://127.0.0.1:5173/admin

For the production build, run `npm run build` then `npm run preview`.
A built copy is included in `dist/`. Configure static deployment to serve
`index.html` for routes such as `/admin/orders` and `/product/BB-SK13`.

## Try the full workflow

1. On the storefront, search for `AI937` or enter `BB-SK13, 10` and
   `AI937, 2` on separate lines in Quick Order.
2. Check basket quantities and VAT. Place a simulated PayPal order as a guest
   or use **Use retail demo** under My Account. You can simulate a decline and retry.
3. Apply for a Trade account with a new test email. Click **Verify and
   submit**. In **Admin → Customers & trade**, review that account and approve
   it. Return to the storefront to see Trade prices and SKU `TRADE-180`.
   The approved Trade demo account also has simulated credit enabled.
4. In **Admin → Orders**, open the order and advance it through Processing
   and Dispatched (enter a tracking reference), or Ready for collection.
   Reopen the order from My Account to download its PDF and try Buy Again.
5. In **Admin → Products**, change a product as **Product editor**. Switch
   to **Supervisor** and publish it from Approvals. The storefront reflects
   the change. You can also try CSV import and report exports.
6. Switch to **Owner → Settings** to try the three draft business decisions.
   The defaults are guest checkout enabled, Trade-only items hidden from
   Retail, and invoice generation on dispatch or ready for collection.

## Scope

The sample catalogue uses cropped product imagery and the wordmark supplied
in the design brief. Product data, VAT and delivery rates in the app are demo
values. The site does not collect payments or send emails. Sign-in, email
verification, admin roles, Trade credit and order fulfilment are simulated
in the browser. Clear site data to reset the demo.

Production requires a server-side data store, authenticated customer and
admin permissions, verified catalogue and delivery data, live PayPal and
EQx integration, and email delivery. Current campaign support covers
approval, audience, dates and checkout discounts. Marketing email automation,
live courier tracking, verified product reviews and a complete brand asset
pack are outside this frontend build.

## Catalogue and analytics

- The frontend includes 2,405 catalogue records across 12 departments, with
  SKU search, family, brand, stock and specification filters, and paginated
  grid/list views. The 2,400 generated items use sample brands, specifications
  and prices. Replace these with approved supplier records and imagery before
  production. Existing browser data from the first demo is upgraded in place.
- Dashboard filters accept a custom date range, Trade/Retail segment and daily,
  weekly, monthly or prior-year comparison. The visitor denominator is all
  tracked storefront sessions in the requested date range. The numerator counts
  unique sessions with a completed checkout matching the selected segment.
- Sales charts use product revenue excluding VAT and shipping. Gross profit
  uses the unit cost saved on each order line. The heatmap uses UK local time.
  Slow stock uses the last recorded sale as of the filter end date. Dormancy
  uses the median gap between recorded ordering days, with a seven-day minimum.
- The charts and reports include optional illustrative sales and traffic
  history. Turn off **Include sample history** to omit the generated analytics
  history. The seed orders displayed on the Orders screen remain part of the
  browser demo dataset.
- Reports export the full filtered results and selected columns, regardless of
  the visible preview page.

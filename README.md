# medusa-fulfillment-shiprocket

Shiprocket fulfillment module provider for Medusa v2.0+.

## Install

```bash
npm install medusa-fulfillment-shiprocket
# or
yarn add medusa-fulfillment-shiprocket
```

## Configure

Set environment variables:

```bash
SHIPROCKET_CHANNEL_ID=<YOUR_SHIPROCKET_CHANNEL_ID>
SHIPROCKET_EMAIL=<YOUR_SHIPROCKET_EMAIL>
SHIPROCKET_PASSWORD=<YOUR_SHIPROCKET_PASSWORD>
```

Add the provider in `medusa-config.ts` (or `.js`):

```ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  modules: [
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          {
            resolve: "medusa-fulfillment-shiprocket/providers/shiprocket",
            id: "shiprocket",
            options: {
              channel_id: process.env.SHIPROCKET_CHANNEL_ID,
              email: process.env.SHIPROCKET_EMAIL,
              password: process.env.SHIPROCKET_PASSWORD,
              token: "", // optional if you manage tokens yourself
              pricing: "calculated", // "flat_rate" | "calculated"
              length_unit: "cm", // "mm" | "cm" | "inches"
              multiple_items: "split_shipment", // "single_shipment" | "split_shipment"
              inventory_sync: false, // true | false
              forward_action: "create_order", // "create_order" | "create_fulfillment"
              return_action: "create_order", // "create_order" | "create_fulfillment"
            },
          },
        ],
      },
    },
  ],
})
```

## Options

`channel_id` (required): Shiprocket channel ID.  
`email`, `password`: Required if `token` is not provided.  
`token`: Optional pre-generated token.  
`pricing`: `flat_rate` or `calculated`.  
`length_unit`: `mm`, `cm`, or `inches`.  
`multiple_items`: `single_shipment` or `split_shipment`.  
`inventory_sync`: `true` to sync inventory (Shiprocket plan required).  
`forward_action`: `create_order` or `create_fulfillment`.  
`return_action`: `create_order` or `create_fulfillment`.

## Usage

1. Enable the provider in Medusa Admin.
2. Add a shipping option using the Shiprocket provider.
3. Place an order and create fulfillment in Admin.

## Notes

- Shiprocket does not provide a sandbox. Test orders affect your wallet and appear in the dashboard.
- Ensure product variant weight is in grams. Length/width/height must match `length_unit`.

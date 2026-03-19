# Medusa Fulfillment Shiprocket (v2)

A resilient, strictly-typed, and OpenAPI-compliant Shiprocket fulfillment plugin crafted natively for the **MedusaJS v2 Framework**.

This integration allows Medusa storefronts to seamlessly calculate real-time shipping rates, create custom/forward channel orders, synchronize inventory, and dispatch returns to Shiprocket automatically. It utilizes a highly robust API wrapper backed by auto-generated `typescript-axios` bindings.

---

## 🚀 Features

- **Medusa v2 Alignment**: Fully leverages the `@medusajs/framework` v2 provider architectures.
- **OpenAPI Type Safety**: Core API behaviors are handled by an auto-generated strict OpenAPI v3 client.
- **Network Resilience**: Employs built-in rate-limiting (max 2 req/sec) and exponential backoff retrying out-of-the-box using `axios-rate-limit` and `axios-retry`.
- **Advanced Fulfillment**: Handles Split shipments vs Single shipments, calculated rates, and auto-mapping of pickup locations.

---

## 📦 Installation

To install the integration into your Medusa application:

```bash
npm install medusa-fulfillment-shiprocket
# or
yarn add medusa-fulfillment-shiprocket
```

---

## ⚙️ Configuration

Set your environment variables required to authenticate with the Shiprocket API:

```bash
# .env
SHIPROCKET_CHANNEL_ID=<YOUR_SHIPROCKET_CHANNEL_ID>
SHIPROCKET_EMAIL=<YOUR_SHIPROCKET_EMAIL>
SHIPROCKET_PASSWORD=<YOUR_SHIPROCKET_PASSWORD>
```

Add the plugin to your `medusa-config.ts` inside the fulfillment module declaration:

```ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  modules: [
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          {
            // Point to the exported provider package index
            resolve: "medusa-fulfillment-shiprocket/providers/fulfillment-shiprocket", 
            id: "shiprocket",
            options: {
              channel_id: process.env.SHIPROCKET_CHANNEL_ID,
              email: process.env.SHIPROCKET_EMAIL,
              password: process.env.SHIPROCKET_PASSWORD,
              
              // Optional: Provide a token directly bypassing auth
              token: "", 
              
              // Options
              pricing: "calculated", // "flat_rate" | "calculated"
              length_unit: "cm", // "mm" | "cm" | "inches"
              multiple_items: "split_shipment", // "single_shipment" | "split_shipment"
              inventory_sync: false, // true | false (Depends on Shiprocket channel settings)
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

---

## 🛠️ Usage & Integration

### 1. Link or Install the Package
In your actual Medusa storefront backend repository, add the package as a dependency. If you have locally published it, you can run:
```bash
yarn add medusa-fulfillment-shiprocket
```

### 2. Configure `medusa-config.ts`
Inside your Medusa application's `medusa-config.ts` configuration file, inject the module under your standard `@medusajs/medusa/fulfillment` block as documented in the Configuration section above.

### 3. Usage inside Medusa Admin
1. Once your server reboots, navigate to your Medusa Admin portal.
2. Under **Settings** -> **Regions** -> **Shipping Options**, create a new Fulfillment Option.
3. You will now see **`shiprocket`** available as the fulfillment provider! 

When configuring a Shipping Option equipped with Shiprocket, Medusa will automatically communicate with Shiprocket on the backend and run the `calculatePrice` bindings, ensuring your fulfillment integration relies purely on live Shiprocket logic.

> **Important**: Shiprocket does NOT provide a testing sandbox. Real requests will impact your actual dashboard and wallet!

> 📖 **For a comprehensive step-by-step guide** — including prerequisites, environment setup, troubleshooting, and architecture overview — see [`docs/INTEGRATION.md`](./docs/INTEGRATION.md).

---

## 🏗️ Development & Building

If you are modifying the foundational code layout of this plugin:

### 1. Generating the OpenAPI Client
If you alter `openapi/upstream.yaml`, re-generate the underlying `typescript-axios` module:
```bash
yarn openapi:gen
```

### 2. Utilizing the OpenAPI Client natively

If you are extending the provider with new Shiprocket features, you can directly invoke the fully typed client:

```typescript
import { ShiprocketClient } from "medusa-fulfillment-shiprocket/providers/fulfillment-shiprocket/core/client"

// The core client wraps the auto-generated DefaultApi.
// All endpoints are fully documented and statically typed!
const response = await this.client_.api_.createCustomOrder({ body: payload })
```

### 3. Building for Distribution
The plugin uses Babel for JS transpiration and `tsc` for TypeScript `.d.ts` declaration wrapping.
To prepare the final distribution payload in `/dist`:
```bash
yarn build
```

### 3. Verification Updates
If you commit new changes to this root folder, you easily test changes locally by linking this package or manually dropping the `/dist` artifacts inside your core project backend.

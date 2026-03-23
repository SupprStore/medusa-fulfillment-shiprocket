# Medusa Fulfillment Shiprocket (v2)

A resilient, strictly-typed, and OpenAPI-compliant Shiprocket fulfillment plugin crafted natively for the **MedusaJS v2 Framework**.

This integration allows Medusa storefronts to seamlessly calculate real-time shipping rates, create custom/forward channel orders, synchronize inventory, and dispatch returns to Shiprocket automatically. It utilizes a highly robust API wrapper backed by auto-generated `typescript-axios` bindings.

---

## Features

- **Medusa v2 Alignment**: Fully leverages the `@medusajs/framework` v2 provider architectures.
- **OpenAPI Type Safety**: Core API behaviors are handled by an auto-generated strict OpenAPI v3 client.
- **Network Resilience**: Employs built-in rate-limiting (max 2 req/sec) and exponential backoff retrying out-of-the-box using `axios-rate-limit` and `axios-retry`.
- **Advanced Fulfillment**: Handles Split shipments vs Single shipments, calculated rates, and auto-mapping of pickup locations.

---

## Installation

To install the integration into your Medusa application:

```bash
npm install medusa-fulfillment-shiprocket
# or
yarn add medusa-fulfillment-shiprocket
```

---

## Quick Start

```bash
# 1. Install
yarn add medusa-fulfillment-shiprocket

# 2. Set env vars
SHIPROCKET_CHANNEL_ID=<your-channel-id>
SHIPROCKET_EMAIL=<your-email>
SHIPROCKET_PASSWORD=<your-password>
```

```ts
// 3. Register in medusa-config.ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  modules: [
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          {
            resolve: "medusa-fulfillment-shiprocket/providers/fulfillment-shiprocket",
            id: "shiprocket",
            options: {
              channel_id: process.env.SHIPROCKET_CHANNEL_ID,
              email: process.env.SHIPROCKET_EMAIL,
              password: process.env.SHIPROCKET_PASSWORD,
            },
          },
        ],
      },
    },
  ],
})
```

> **Warning**: Shiprocket does **not** provide a testing sandbox. Real requests impact your live dashboard and wallet.

**Full setup guide** — env vars, all options, admin configuration, testing, and troubleshooting: [`docs/INTEGRATION.md`](./docs/INTEGRATION.md)

---

## Development & Building

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

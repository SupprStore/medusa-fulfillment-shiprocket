# Shiprocket Fulfillment Provider — Integration Guide

A step-by-step guide for integrating this Shiprocket fulfillment provider into a Medusa v2 application.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 20 |
| Medusa application | v2 (`@medusajs/framework` ≥ 2.0) |
| Shiprocket account | [app.shiprocket.in](https://app.shiprocket.in) |

You need the following from your Shiprocket dashboard:

- **Channel ID** — Go to **Settings → Channels** and note the channel you want to use.
- **Login credentials** — The email and password of your Shiprocket account.
- *(Optional)* A **pre-generated token** if you want to bypass email/password auth.

> [!CAUTION]
> Shiprocket does **not** provide a sandbox environment. All API calls affect your live account and wallet balance.

---

## Step 1 — Install the Package

```bash
# npm
npm install medusa-fulfillment-shiprocket

# yarn
yarn add medusa-fulfillment-shiprocket
```

If developing locally, you can also link the package:

```bash
cd /path/to/medusa-fulfillment-shiprocket
yarn link

cd /path/to/your-medusa-app
yarn link medusa-fulfillment-shiprocket
```

---

## Step 2 — Set Environment Variables

Add the following to your Medusa application's `.env` file:

```bash
# Required
SHIPROCKET_CHANNEL_ID=<your-channel-id>
SHIPROCKET_EMAIL=<your-shiprocket-email>
SHIPROCKET_PASSWORD=<your-shiprocket-password>
```

| Variable | Required | Description |
|---|---|---|
| `SHIPROCKET_CHANNEL_ID` | **Yes** | The numeric channel ID from Shiprocket dashboard. |
| `SHIPROCKET_EMAIL` | **Yes*** | Email for Shiprocket API authentication. |
| `SHIPROCKET_PASSWORD` | **Yes*** | Password for Shiprocket API authentication. |

> [!NOTE]
> *You can skip `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD` if you supply a `token` directly in the options. However, tokens expire after 10 days, so credential-based auth with auto-refresh is recommended for production.

---

## Step 3 — Register the Module in `medusa-config.ts`

Open your Medusa application's `medusa-config.ts` and add the Shiprocket provider to the fulfillment module:

```ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  // ...other config
  modules: [
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          // Keep the default manual provider if you need it
          {
            resolve: "@medusajs/medusa/fulfillment-manual",
            id: "manual",
          },
          // Shiprocket provider
          {
            resolve: "medusa-fulfillment-shiprocket/providers/fulfillment-shiprocket",
            id: "shiprocket",
            options: {
              channel_id: process.env.SHIPROCKET_CHANNEL_ID,
              email: process.env.SHIPROCKET_EMAIL,
              password: process.env.SHIPROCKET_PASSWORD,

              // Optional: supply a pre-generated token instead of email/password
              token: "",

              // ── Behavior options ──────────────────────────────────
              pricing: "calculated",       // "flat_rate" | "calculated"
              length_unit: "cm",           // "mm" | "cm" | "inches"
              multiple_items: "split_shipment",  // "single_shipment" | "split_shipment"
              inventory_sync: false,       // true | false
              forward_action: "create_order",    // "create_order" | "create_fulfillment"
              return_action: "create_order",     // "create_order" | "create_fulfillment"
            },
          },
        ],
      },
    },
  ],
})
```

### Option Reference

| Option | Type | Default | Description |
|---|---|---|---|
| `channel_id` | `string \| number` | — | **(Required)** Shiprocket channel ID. |
| `email` | `string` | — | Shiprocket login email. |
| `password` | `string` | — | Shiprocket login password. |
| `token` | `string` | `""` | Pre-generated Shiprocket API token. |
| `pricing` | `"flat_rate" \| "calculated"` | `"calculated"` | Whether Medusa should use Shiprocket's live rates or admin-defined flat rates. |
| `length_unit` | `"mm" \| "cm" \| "inches"` | `"cm"` | Unit for product dimensions. Converted to cm for the Shiprocket API. |
| `multiple_items` | `"single_shipment" \| "split_shipment"` | `"single_shipment"` | How multi-item orders are handled. |
| `inventory_sync` | `boolean` | `false` | Whether to use channel-based orders (syncs inventory with Shiprocket). |
| `forward_action` | `"create_order" \| "create_fulfillment"` | `"create_order"` | Method for creating forward shipments. |
| `return_action` | `"create_order" \| "create_fulfillment"` | `"create_order"` | Method for creating return shipments. |

---

## Step 4 — Create Shipping Options in Medusa Admin

After starting your Medusa application:

1. Open the **Medusa Admin** at `http://localhost:9000/app`.
2. Navigate to **Settings → Locations & Shipping**.
3. Select a location (or create one).
4. Under the **Fulfillment Providers** section, click the three-dot menu → **Edit** and enable the `shiprocket` provider.
5. Under **Shipping**, click **Create option**.
6. Fill out the form:
   - **Price type**: Select `Calculated` (recommended) or `Flat rate`.
   - **Name**: A customer-facing name (e.g., "Shiprocket Express").
   - **Shipping Profile**: Choose the appropriate profile.
   - **Fulfillment Provider**: Select `shiprocket`.
   - **Fulfillment Option**: Choose from the live courier options fetched from Shiprocket.
7. Click **Save**.

> [!TIP]
> You can create multiple shipping options — one per courier service returned by Shiprocket (e.g., "BlueDart Surface", "Delhivery Express"). Each maps to a specific `courier_company_id`.

---

## Step 5 — Test End-to-End

### Place an Order

1. Browse your storefront and add products to the cart.
2. Proceed to checkout and enter a valid Indian shipping address.
3. Select the Shiprocket-powered shipping option — you'll see the **calculated rate** from Shiprocket.
4. Complete the order.

### Fulfill the Order

1. In the Medusa Admin, go to **Orders** and click the new order.
2. Click **Create Fulfillment**.
3. The provider will create a Shiprocket order/shipment on your Shiprocket dashboard.
4. The fulfillment data (Shiprocket order ID, shipment ID, AWB code) is stored in the fulfillment's `data` property.

### Cancel a Fulfillment

1. In the Medusa Admin, find the order and click **Cancel Fulfillment**.
2. The provider will cancel the AWB and order on Shiprocket.

> [!WARNING]
> If the shipment has already been picked up by the courier (status > 5), cancellation will fail with an error from Shiprocket.

---

## Troubleshooting

### `Shiprocket: channel_id is required.`

Ensure `SHIPROCKET_CHANNEL_ID` is set in your `.env` file and your `medusa-config.ts` passes it via `process.env.SHIPROCKET_CHANNEL_ID`.

### `Shiprocket: Missing credentials. Provide email/password or a valid token.`

Either provide `email` + `password` in the options, or supply a valid `token`. Tokens expire after 10 days.

### `Shiprocket: Missing pickup or delivery postal code for rate calculation.`

The `calculatePrice` method requires both a pickup postal code (from the Shiprocket pickup location) and a delivery postal code (from the customer's address). Ensure:
- Your Shiprocket account has at least one pickup location configured.
- The customer has entered a valid shipping address with a postal code.

### `Shiprocket: Missing item dimensions or weight for shipment calculations`

Product variants must have `length`, `width`, `height`, and `weight` set. These are used to compute volumetric weight for Shiprocket.

### Rate-limiting / 429 errors

The client automatically rate-limits requests to **2 per second** and retries with exponential backoff (up to 3 retries). If you still hit limits, reduce concurrent requests to the provider.

---

## Architecture Overview

```
medusa-fulfillment-shiprocket/
├── src/
│   ├── providers/fulfillment-shiprocket/
│   │   ├── index.ts              # Module export via ModuleProvider()
│   │   ├── core/
│   │   │   └── client.ts         # Shiprocket API client (axios + OpenAPI)
│   │   ├── services/
│   │   │   ├── index.ts          # Re-export
│   │   │   └── shiprocket.ts     # Service extending AbstractFulfillmentProviderService
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript type definitions
│   │   └── utils/
│   │       ├── amounts.ts        # Currency normalization
│   │       ├── constants.ts      # Base URL, token TTL, rate limits
│   │       ├── errors.ts         # ShiprocketError class
│   │       ├── index.ts          # Utility helpers
│   │       ├── mappers.ts        # Payload builders for Shiprocket API
│   │       └── measurements.ts   # Weight/dimension calculation
│   └── lib/shiprocket-client/    # Auto-generated OpenAPI typescript-axios client
└── openapi/
    └── upstream.yaml             # Shiprocket OpenAPI specification
```

### Key Design Decisions

- **Token auto-refresh**: Credentials-based auth with a 10-day token TTL. Tokens are refreshed transparently before they expire.
- **OpenAPI client**: All API calls go through an auto-generated `typescript-axios` client for type safety. The client is wrapped in a higher-level `ShiprocketClient` class with domain-grouped methods.
- **Rate limiting + retries**: Built into the `axios` instance (2 req/sec, 3 retries with exponential backoff).
- **Pickup location caching**: The primary pickup location is fetched once and cached for the lifetime of the service instance.

---

## Implemented Provider Methods

| Method | Status | Notes |
|---|---|---|
| `getFulfillmentOptions` | ✅ Full | Returns active couriers from Shiprocket as `FulfillmentOption[]`. |
| `validateOption` | ✅ Full | Validates courier ID against active couriers. |
| `validateFulfillmentData` | ✅ Full | Merges option data and method data. |
| `canCalculate` | ✅ Full | Returns `true` when `pricing` option is `"calculated"`. |
| `calculatePrice` | ✅ Full | Calls Shiprocket serviceability API. Returns `{ calculated_amount, is_calculated_price_tax_inclusive }`. |
| `createFulfillment` | ✅ Full | Creates Shiprocket order or shipment based on `forward_action` option. |
| `createReturnFulfillment` | ✅ Full | Creates Shiprocket return order or shipment based on `return_action` option. |
| `cancelFulfillment` | ✅ Full | Cancels AWB and order on Shiprocket. |
| `getFulfillmentDocuments` | ⬜ Stub | Returns `[]`. Shiprocket API doesn't expose document retrieval. |
| `getReturnDocuments` | ⬜ Stub | Returns `[]`. |
| `getShipmentDocuments` | ⬜ Stub | Returns `[]`. |
| `retrieveDocuments` | ⬜ Stub | No-op. |

---

## Migration Notes

If upgrading from a previous version of this plugin that used loose `any` types:

- Method signatures now strictly match Medusa's `AbstractFulfillmentProviderService`.
- `getFulfillmentOptions` now returns `FulfillmentOption[]` (each object has an `id: string` and `name` property).
- `calculatePrice` now returns `CalculatedShippingOptionPrice` (same shape as before, but properly typed).
- No breaking behavioral changes — all existing fulfillment logic is preserved.

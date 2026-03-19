export type ShiprocketPricingStrategy = 'flat_rate' | 'calculated'
export type ShiprocketLengthUnit = 'mm' | 'cm' | 'inches'
export type ShiprocketMultipleItemsStrategy = 'single_shipment' | 'split_shipment'
export type ShiprocketActionStrategy = 'create_order' | 'create_fulfillment'

export type ShiprocketProviderOptions = {
  channel_id: string | number
  email?: string
  password?: string
  token?: string
  pricing?: ShiprocketPricingStrategy
  length_unit?: ShiprocketLengthUnit
  multiple_items?: ShiprocketMultipleItemsStrategy
  inventory_sync?: boolean
  forward_action?: ShiprocketActionStrategy
  return_action?: ShiprocketActionStrategy
}

export type ShiprocketLogger = {
  info?: (message: string) => void
  warn?: (message: string) => void
  error?: (message: string) => void
}

export type TotalsService = {
  getLineItemTotals: (
    item: MedusaLineItem,
    order: MedusaOrder,
    options: { include_tax?: boolean; use_tax_lines?: boolean }
  ) => Promise<{
    original_total?: number
    discount_total?: number
    tax_lines?: { rate: number }[]
  }>
}

export type ProviderContainer = {
  logger?: ShiprocketLogger
  totalsService?: TotalsService
}

export type MedusaAddress = {
  first_name?: string
  last_name?: string
  address_1?: string
  address_2?: string
  city?: string
  province?: string
  country_code?: string
  postal_code?: string | number
  phone?: string | number
}

export type MedusaLineItem = {
  id?: string
  title?: string
  quantity?: number
  is_return?: boolean
  subtotal?: number
  total?: number
  original_total?: number
  unit_price?: number
  tax_lines?: { rate: number }[]
  metadata?: Record<string, any>
  weight?: number
  length?: number
  width?: number
  height?: number
  variant?: Record<string, any>
  product_variant?: Record<string, any>
  productVariant?: Record<string, any>
}

export type MedusaShippingMethod = {
  price?: number
  amount?: number
}

export type MedusaOrder = {
  id?: string
  display_id?: string | number
  email?: string
  currency_code?: string
  metadata?: Record<string, any>
  discount_total?: number
  subtotal?: number
  items?: MedusaLineItem[]
  shipping_methods?: MedusaShippingMethod[]
  billing_address?: MedusaAddress | null
  shipping_address?: MedusaAddress | null
}

export type FulfillmentInput = {
  data?: Record<string, any>
  items?: MedusaLineItem[]
  order?: MedusaOrder
  shipping_method?: { data?: Record<string, any> }
}

export type ShiprocketPickupLocation = {
  id?: number
  pickup_location?: string
  address?: string
  address_2?: string
  city?: string
  state?: string
  country?: string
  pin_code?: string | number
  email?: string
  phone?: string | number
  name?: string
  company_id?: number
  status?: number
  phone_verified?: number
}

export type ShipmentMeasurements = {
  lengthCm: number
  widthCm: number
  heightCm: number
  weightKg: number
}

export type PriceCalculationContext = {
  items?: MedusaLineItem[]
  shipping_address?: MedusaAddress | null
  metadata?: Record<string, any>
  subtotal?: number
  currency_code?: string
  is_return?: boolean
}

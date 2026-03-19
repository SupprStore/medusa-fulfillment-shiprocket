import {
  getLineItemTotal,
  normalizeAmount,
  sumLineItemTotals,
} from './amounts'
import { ShiprocketError } from './errors'
import {
  MedusaAddress,
  MedusaLineItem,
  MedusaOrder,
  ShiprocketPickupLocation,
  ShiprocketProviderOptions,
  ShipmentMeasurements,
  TotalsService,
} from '../types'
import { formatShiprocketDate, sumTaxRates, toInt } from './index'

type ForwardPayloadInput = {
  options: ShiprocketProviderOptions
  order: MedusaOrder
  billingAddress: MedusaAddress
  shippingAddress: MedusaAddress
  fulfillmentItems: MedusaLineItem[]
  totalsService?: TotalsService
  courierId?: string | number
  shipment: ShipmentMeasurements
  pickupLocation: ShiprocketPickupLocation
  isCod: boolean
  gstin?: string
  getCountryDisplayName: (alpha2?: string) => string
}

type ReturnPayloadInput = {
  options: ShiprocketProviderOptions
  order: MedusaOrder
  returnItems: MedusaLineItem[]
  totalsService?: TotalsService
  courierId?: string | number
  shipment: ShipmentMeasurements
  pickupLocation: ShiprocketPickupLocation
  orderDiscountTotal: number
  getCountryDisplayName: (alpha2?: string) => string
}

const getOrderDisplayId = (order: MedusaOrder): string => {
  const displayId = order.display_id ?? order.id
  if (displayId == null) {
    throw new ShiprocketError('Shiprocket: Missing order id for payload creation.')
  }
  return String(displayId)
}

const resolveVariant = (item: MedusaLineItem): Record<string, any> | undefined =>
  item.variant || item.product_variant || item.productVariant

const buildLineItems = async (
  items: MedusaLineItem[],
  order: MedusaOrder,
  totalsService: TotalsService | undefined,
  includeQc: boolean
): Promise<any[]> => {
  return Promise.all(
    items.map(async (item) => {
      const variant = resolveVariant(item)
      const totals = totalsService?.getLineItemTotals
        ? await totalsService.getLineItemTotals(item, order, {
            include_tax: true,
            use_tax_lines: true,
          })
        : {
            original_total: getLineItemTotal(item),
            tax_lines: Array.isArray(item.tax_lines) ? item.tax_lines : [],
          }

      const orderItem: any = {
        name: item.title,
        sku: variant?.sku,
        units: Number(item.quantity || 0),
        selling_price: normalizeAmount(
          totals.original_total ?? getLineItemTotal(item),
          order.currency_code
        ),
        tax: sumTaxRates(totals.tax_lines || []),
      }

      const hsn = parseInt(variant?.hs_code, 10)
      if (!Number.isNaN(hsn)) {
        orderItem.hsn = hsn
      }

      if (includeQc) {
        const metadata = item.metadata || {}
        if (metadata.qc_enable) {
          orderItem.qc_enable = true
          if (metadata.qc_color) orderItem.qc_color = metadata.qc_color
          if (metadata.qc_brand) orderItem.qc_brand = metadata.qc_brand
          if (metadata.qc_serial_no) orderItem.qc_serial_no = metadata.qc_serial_no
          if (metadata.qc_ean_barcode) orderItem.qc_ean_barcode = metadata.qc_ean_barcode
          if (metadata.qc_size) orderItem.qc_size = metadata.qc_size
          if (metadata.qc_product_name) orderItem.qc_product_name = metadata.qc_product_name
          if (metadata.qc_product_image) orderItem.qc_product_image = metadata.qc_product_image
        }
      }

      return orderItem
    })
  )
}

const mapBillingAddress = (
  order: MedusaOrder,
  billingAddress: MedusaAddress,
  getCountryDisplayName: (alpha2?: string) => string
) => ({
  billing_customer_name: billingAddress.first_name,
  billing_last_name: billingAddress.last_name,
  billing_address: billingAddress.address_1,
  billing_address_2: billingAddress.address_2,
  billing_city: billingAddress.city,
  billing_state: billingAddress.province,
  billing_country: getCountryDisplayName(billingAddress.country_code),
  billing_pincode: toInt(billingAddress.postal_code, 'billing postal code'),
  billing_email: order.email,
  billing_phone: toInt(billingAddress.phone, 'billing phone'),
})

const mapShippingAddress = (
  order: MedusaOrder,
  shippingAddress: MedusaAddress,
  getCountryDisplayName: (alpha2?: string) => string
) => ({
  shipping_is_billing: false,
  shipping_customer_name: shippingAddress.first_name,
  shipping_last_name: shippingAddress.last_name,
  shipping_address: shippingAddress.address_1,
  shipping_address_2: shippingAddress.address_2,
  shipping_city: shippingAddress.city,
  shipping_state: shippingAddress.province,
  shipping_country: getCountryDisplayName(shippingAddress.country_code),
  shipping_pincode: toInt(shippingAddress.postal_code, 'shipping postal code'),
  shipping_email: order.email,
  shipping_phone: toInt(shippingAddress.phone, 'shipping phone'),
})

const mapPickupFromCustomer = (
  order: MedusaOrder,
  shippingAddress: MedusaAddress,
  getCountryDisplayName: (alpha2?: string) => string
) => ({
  pickup_customer_name: shippingAddress.first_name,
  pickup_last_name: shippingAddress.last_name,
  pickup_address: shippingAddress.address_1,
  pickup_address_2: shippingAddress.address_2,
  pickup_city: shippingAddress.city,
  pickup_state: shippingAddress.province,
  pickup_country: getCountryDisplayName(shippingAddress.country_code),
  pickup_pincode: toInt(shippingAddress.postal_code, 'pickup postal code'),
  pickup_email: order.email,
  pickup_phone: toInt(shippingAddress.phone, 'pickup phone'),
})

const mapShipToPickupLocation = (pickupLocation: ShiprocketPickupLocation) => ({
  shipping_customer_name: pickupLocation.name,
  shipping_address: pickupLocation.address,
  shipping_address_2: pickupLocation.address_2,
  shipping_city: pickupLocation.city,
  shipping_state: pickupLocation.state,
  shipping_country: pickupLocation.country,
  shipping_pincode: toInt(pickupLocation.pin_code, 'pickup location postal code'),
  shipping_email: pickupLocation.email,
  shipping_phone: toInt(pickupLocation.phone, 'pickup location phone'),
})

export const buildForwardOrderPayload = async (input: ForwardPayloadInput): Promise<any> => {
  const {
    options,
    order,
    billingAddress,
    shippingAddress,
    fulfillmentItems,
    totalsService,
    shipment,
    pickupLocation,
    isCod,
    gstin,
    getCountryDisplayName,
  } = input

  const orderDisplayId = getOrderDisplayId(order)

  const payload: any = {
    order_id: orderDisplayId,
    order_date: formatShiprocketDate(),
    pickup_location: pickupLocation.pickup_location,
    channel_id: toInt(options.channel_id, 'channel_id'),
    ...mapBillingAddress(order, billingAddress, getCountryDisplayName),
    ...mapShippingAddress(order, shippingAddress, getCountryDisplayName),
    order_items: await buildLineItems(fulfillmentItems, order, totalsService, false),
    payment_method: isCod ? 'COD' : 'Prepaid',
    shipping_charges: normalizeAmount(
      order.shipping_methods?.[0]?.price ?? order.shipping_methods?.[0]?.amount ?? 0,
      order.currency_code
    ),
    total_discount: normalizeAmount(order.discount_total ?? 0, order.currency_code),
    sub_total: normalizeAmount(sumLineItemTotals(order.items || []), order.currency_code),
    length: shipment.lengthCm,
    breadth: shipment.widthCm,
    height: shipment.heightCm,
    weight: shipment.weightKg,
  }

  if (gstin) {
    payload.customer_gstin = gstin
  }

  return payload
}

export const buildForwardFulfillmentPayload = async (
  input: ForwardPayloadInput
): Promise<any> => {
  const {
    options,
    order,
    billingAddress,
    shippingAddress,
    fulfillmentItems,
    totalsService,
    courierId,
    shipment,
    pickupLocation,
    isCod,
    gstin,
    getCountryDisplayName,
  } = input

  const orderDisplayId = getOrderDisplayId(order)

  const payload: any = {
    request_pickup: true,
    print_label: true,
    generate_manifest: true,
    courier_id: courierId,
    order_id: orderDisplayId,
    order_date: formatShiprocketDate(),
    channel_id: toInt(options.channel_id, 'channel_id'),
    company_name: pickupLocation.name,
    ...mapBillingAddress(order, billingAddress, getCountryDisplayName),
    ...mapShippingAddress(order, shippingAddress, getCountryDisplayName),
    order_items: await buildLineItems(fulfillmentItems, order, totalsService, false),
    payment_method: isCod ? 'COD' : 'Prepaid',
    shipping_charges: normalizeAmount(
      order.shipping_methods?.[0]?.price ?? order.shipping_methods?.[0]?.amount ?? 0,
      order.currency_code
    ),
    total_discount: normalizeAmount(order.discount_total ?? 0, order.currency_code),
    sub_total: normalizeAmount(sumLineItemTotals(order.items || []), order.currency_code),
    length: shipment.lengthCm,
    breadth: shipment.widthCm,
    height: shipment.heightCm,
    weight: shipment.weightKg,
  }

  if (gstin) {
    payload.customer_gstin = gstin
  }

  return payload
}

export const buildReturnOrderPayload = async (input: ReturnPayloadInput): Promise<any> => {
  const {
    options,
    order,
    returnItems,
    totalsService,
    shipment,
    pickupLocation,
    orderDiscountTotal,
    getCountryDisplayName,
  } = input

  const orderDisplayId = getOrderDisplayId(order)
  const orderId = `${orderDisplayId}R`

  const payload: any = {
    order_id: orderId,
    order_date: formatShiprocketDate(),
    channel_id: toInt(options.channel_id, 'channel_id'),
    company_name: pickupLocation.name,
    ...mapPickupFromCustomer(order, order.shipping_address || {}, getCountryDisplayName),
    ...mapShipToPickupLocation(pickupLocation),
    order_items: await buildLineItems(returnItems, order, totalsService, true),
    payment_method: 'prepaid',
    total_discount: normalizeAmount(orderDiscountTotal, order.currency_code),
    sub_total: normalizeAmount(sumLineItemTotals(returnItems), order.currency_code),
    length: shipment.lengthCm,
    breadth: shipment.widthCm,
    height: shipment.heightCm,
    weight: shipment.weightKg,
  }

  return payload
}

export const buildReturnFulfillmentPayload = async (
  input: ReturnPayloadInput
): Promise<any> => {
  const {
    options,
    order,
    returnItems,
    totalsService,
    courierId,
    shipment,
    pickupLocation,
    orderDiscountTotal,
    getCountryDisplayName,
  } = input

  const orderDisplayId = getOrderDisplayId(order)
  const orderId = `${orderDisplayId}R`

  const payload: any = {
    courier_id: courierId,
    order_id: orderId,
    order_date: formatShiprocketDate(),
    channel_id: toInt(options.channel_id, 'channel_id'),
    company_name: pickupLocation.name,
    ...mapPickupFromCustomer(order, order.shipping_address || {}, getCountryDisplayName),
    ...mapShipToPickupLocation(pickupLocation),
    order_items: await buildLineItems(returnItems, order, totalsService, true),
    payment_method: 'prepaid',
    total_discount: normalizeAmount(orderDiscountTotal, order.currency_code),
    sub_total: normalizeAmount(sumLineItemTotals(returnItems), order.currency_code),
    request_pickup: true,
    length: shipment.lengthCm,
    breadth: shipment.widthCm,
    height: shipment.heightCm,
    weight: shipment.weightKg,
  }

  return payload
}

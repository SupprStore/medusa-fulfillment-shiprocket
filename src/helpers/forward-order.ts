import {
  normalizeAmount,
  sumLineItemTotals,
  getLineItemTotal,
} from '../utils/amounts'

type ForwardOrderData = {
  options: any
  client: any
  totalsService?: any
  courier_id?: string | number
  fulfillmentItems: any[]
  fromOrder: any
  billing_address: any
  shipping_address: any
  isCOD?: boolean
  gstin?: string
  lengthInCM: number
  widthInCM: number
  heightInCM: number
  shipmentWeight: number
  pickupLocations: any
  getCountryDisplayName: (alpha2?: string) => string
}

async function forwardOrder(forwardData: ForwardOrderData): Promise<any> {
  const {
    options,
    client,
    totalsService,
    courier_id,
    fulfillmentItems,
    fromOrder,
    billing_address,
    shipping_address,
    isCOD,
    gstin,
    lengthInCM,
    widthInCM,
    heightInCM,
    shipmentWeight,
    pickupLocations,
    getCountryDisplayName,
  } = forwardData

  const orderDisplayId = fromOrder.display_id ?? fromOrder.id

  const newOrder: any = {
    order_id: orderDisplayId,
    order_date: new Date().toISOString().split('T')[0],
    pickup_location: pickupLocations.shipping_address[0].pickup_location,
    channel_id: parseInt(options.channel_id),
    //comment:"",
    billing_customer_name: billing_address.first_name,
    billing_last_name: billing_address.last_name,
    billing_address: billing_address.address_1,
    billing_address_2: billing_address.address_2,
    billing_city: billing_address.city,
    billing_state: billing_address.province,
    billing_country: getCountryDisplayName(
      fromOrder.billing_address.country_code
    ),
    billing_pincode: parseInt(billing_address.postal_code),
    billing_email: fromOrder.email,
    billing_phone: parseInt(billing_address.phone),
    shipping_is_billing: false, //medusa does not store shipping_is_billing?
    shipping_customer_name: shipping_address.first_name,
    shipping_last_name: shipping_address.last_name,
    shipping_address: shipping_address.address_1,
    shipping_address_2: shipping_address.address_2,
    shipping_city: shipping_address.city,
    shipping_state: shipping_address.province,
    shipping_country: getCountryDisplayName(
      fromOrder.shipping_address.country_code
    ),
    shipping_pincode: parseInt(shipping_address.postal_code),
    shipping_email: fromOrder.email,
    shipping_phone: parseInt(shipping_address.phone),
    order_items: await Promise.all(
      fulfillmentItems.map(async (item) => {
        const variant = item.variant || item.product_variant || item.productVariant
        const totals = totalsService?.getLineItemTotals
          ? await totalsService.getLineItemTotals(item, fromOrder, {
              include_tax: true,
              use_tax_lines: true,
            })
          : {
              original_total: getLineItemTotal(item),
              tax_lines: Array.isArray(item.tax_lines) ? item.tax_lines : [],
            }
        //console.log(`totals for ${item.title}`, totals)

        const orderItem: any = {
          name: item.title,
          sku: variant?.sku,
          units: item.quantity,
          selling_price: normalizeAmount(
            totals.original_total ?? getLineItemTotal(item),
            fromOrder.currency_code
          ),
          // discount: humanizeAmount(
          //   totals.discount_total,
          //   fromOrder.currency_code
          // ),
          tax: (totals.tax_lines || []).reduce((acc, next) => acc + next.rate, 0),
        }

        const hsn = parseInt(variant?.hs_code, 10)
        if (!Number.isNaN(hsn)) {
          orderItem.hsn = hsn
        }

        return orderItem
      })
    ),
    payment_method: !!isCOD ? 'COD' : 'Prepaid',
    shipping_charges: normalizeAmount(
      fromOrder.shipping_methods?.[0]?.price ??
        fromOrder.shipping_methods?.[0]?.amount ??
        0,
      fromOrder.currency_code
    ),
    //giftwrap_charges: '',
    //transaction_charges: '',
    total_discount: normalizeAmount(
      fromOrder.discount_total ?? 0,
      fromOrder.currency_code
    ),
    sub_total: normalizeAmount(
      sumLineItemTotals(fromOrder.items),
      fromOrder.currency_code
    ),
    //ewaybill_no: "",
    //invoice_number: "",
    //order_type: "",
    //checkout_shipping_method:""
    length: lengthInCM,
    breadth: widthInCM,
    height: heightInCM,
    weight: shipmentWeight,
  }

  if (gstin) {
    newOrder.customer_gstin = gstin
  }

  //console.log('newOrder', newOrder)

  //throw new Error('Not implemented yet')

  let response: any

  if (options.inventory_sync) {
    response = await client.orders.createForChannel(newOrder)
  } else {
    response = await client.orders.createCustom(newOrder)
  }

  console.log('Shiprocket: newOrder response', response)

  return response
}

export default forwardOrder

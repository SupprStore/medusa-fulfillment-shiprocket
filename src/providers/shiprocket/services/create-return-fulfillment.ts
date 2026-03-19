import { reverseFulfillment, reverseOrder, processShipmentData } from '../../../helpers'

export async function createReturnFulfillmentHandler(
  provider: any,
  data: any,
  items: any[],
  order: any,
  returnRequest: any
): Promise<any> {
  await provider.ensureToken_()

  const fromOrder = order || returnRequest?.order

  if (!fromOrder) {
    throw new Error('Shiprocket: Missing order context for return fulfillment.')
  }

  const methodData =
    data || returnRequest?.shipping_method?.data || returnRequest?.shipping_method

  const courier_id = provider.resolveCourierId_(methodData)

  if (!courier_id) {
    throw new Error('Shiprocket: Courier ID missing from return method data.')
  }

  const { shipping_address, metadata = {} } = fromOrder

  if (!shipping_address) {
    throw new Error('Shiprocket: Missing shipping address for return.')
  }

  const {
    shipment_length,
    shipment_width,
    shipment_height,
    shipment_weight,
  } = metadata

  const { lengthInCM, widthInCM, heightInCM, shipmentWeight } =
    await processShipmentData(
      items?.length ? items : fromOrder.items,
      provider.options_.length_unit,
      shipment_length,
      shipment_width,
      shipment_height,
      shipment_weight
    )

  const pickupLocations = await provider.client_.company.retrieveAll()
  const pickupLocation = pickupLocations?.shipping_address?.[0]

  if (!pickupLocation) {
    throw new Error('Shiprocket: No pickup location found.')
  }
  const orderDiscountTotal = Number(fromOrder.discount_total || 0)

  const returnItems = items?.length ? items : fromOrder.items

  const reverseData = {
    options: provider.options_,
    client: provider.client_,
    totalsService: provider.totalsService_,
    courier_id: courier_id,
    fromOrder: fromOrder,
    returnItems: returnItems,
    orderDiscountTotal: orderDiscountTotal,
    shipping_address: shipping_address,
    lengthInCM: lengthInCM,
    widthInCM: widthInCM,
    heightInCM: heightInCM,
    shipmentWeight: shipmentWeight,
    pickupLocation: pickupLocation,
    getCountryDisplayName: provider.getCountryDisplayName.bind(provider),
  }

  let response: any

  if (provider.options_.return_action === 'create_fulfillment') {
    if (
      (items?.length || fromOrder.items?.length || 0) > 1 &&
      provider.options_.multiple_items === 'split_shipment'
    ) {
      provider.logger_.warn(
        "Shiprocket: Split shipments can't be created via API. Creating a Shiprocket Return Order instead."
      )

      response = await reverseOrder(reverseData)
    } else {
      response = await reverseFulfillment(reverseData)
    }
  } else {
    response = await reverseOrder(reverseData)
  }

  return {
    data: response,
    labels: [],
  }
}

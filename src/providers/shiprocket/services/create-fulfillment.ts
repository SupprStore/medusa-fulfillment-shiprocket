import { forwardFulfillment, forwardOrder, processShipmentData } from '../../../helpers'

export async function createFulfillmentHandler(
  provider: any,
  data: any,
  items: any[],
  order: any,
  fulfillment: any
): Promise<any> {
  await provider.ensureToken_()

  const fromOrder = order || fulfillment?.order

  if (!fromOrder) {
    throw new Error('Shiprocket: Missing order context for fulfillment.')
  }

  const { billing_address, shipping_address, metadata = {} } = fromOrder

  if (!shipping_address || !billing_address) {
    throw new Error('Shiprocket: Missing shipping or billing address.')
  }

  const {
    isCOD,
    gstin,
    shipment_length,
    shipment_width,
    shipment_height,
    shipment_weight,
  } = metadata

  const fulfillmentItems = items?.length ? items : fromOrder.items || []

  const { lengthInCM, widthInCM, heightInCM, shipmentWeight } =
    await processShipmentData(
      fulfillmentItems,
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
  const courier_id = provider.resolveCourierId_(data)

  if (!courier_id) {
    throw new Error('Shiprocket: Courier ID missing from method data.')
  }

  const forwardData = {
    options: provider.options_,
    client: provider.client_,
    totalsService: provider.totalsService_,
    courier_id: courier_id,
    fulfillmentItems: fulfillmentItems,
    fromOrder: fromOrder,
    billing_address: billing_address,
    shipping_address: shipping_address,
    isCOD: isCOD,
    gstin: gstin,
    lengthInCM: lengthInCM,
    widthInCM: widthInCM,
    heightInCM: heightInCM,
    shipmentWeight: shipmentWeight,
    pickupLocations: pickupLocations,
    getCountryDisplayName: provider.getCountryDisplayName.bind(provider),
  }

  let response: any

  if (provider.options_.forward_action === 'create_fulfillment') {
    if (
      items?.length > 1 &&
      provider.options_.multiple_items === 'split_shipment'
    ) {
      provider.logger_.warn(
        "Shiprocket: Split shipments can't be created via API. Creating a Shiprocket Order instead."
      )

      response = await forwardOrder(forwardData)
    } else {
      response = await forwardFulfillment(forwardData)
    }
  } else {
    response = await forwardOrder(forwardData)
  }

  return {
    data: response,
    labels: [],
  }
}

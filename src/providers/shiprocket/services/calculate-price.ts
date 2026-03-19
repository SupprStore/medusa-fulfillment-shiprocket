import { normalizeAmount, sumLineItemTotals } from '../../../utils/amounts'

export async function calculatePriceHandler(
  provider: any,
  optionData: any,
  _data: any,
  context: any
): Promise<any> {
  if (provider.options_.pricing === 'flat_rate') {
    throw new Error('Shiprocket: Pricing strategy is set to flat_rate')
  }

  await provider.ensureToken_()

  const items = context?.items || []
  const shipmentWeight = items.reduce(
    (acc: number, item: any) => acc + provider.getItemWeightInKg_(item),
    0
  )

  const pickupLocations = await provider.client_.company.retrieveAll()
  const pickupLocation = pickupLocations?.shipping_address?.[0]

  if (!pickupLocation) {
    throw new Error('Shiprocket: No pickup location found.')
  }

  const isReturn = Boolean(context?.items?.[0]?.is_return || context?.is_return)
  const pickupPostcode = isReturn
    ? pickupLocation.pin_code
    : context?.shipping_address?.postal_code
  const deliveryPostcode = isReturn
    ? context?.shipping_address?.postal_code
    : pickupLocation.pin_code

  if (!pickupPostcode || !deliveryPostcode) {
    throw new Error(
      'Shiprocket: Missing pickup or delivery postal code for rate calculation.'
    )
  }

  const declaredValue = normalizeAmount(
    context?.subtotal ?? sumLineItemTotals(items),
    context?.currency_code
  )

  const resp = await provider.client_.couriers.getServiceability({
    pickup_postcode: parseInt(pickupPostcode),
    delivery_postcode: parseInt(deliveryPostcode),
    cod: context?.metadata?.isCOD ? true : false,
    weight: shipmentWeight,
    declared_value: declaredValue,
  })

  const selOpt = resp?.available_courier_companies?.filter(
    (opt: any) => opt.courier_company_id === optionData.id
  )

  const rate = selOpt?.[0]?.rate || 0

  return {
    calculated_amount: Math.round(rate * 100),
    is_calculated_price_tax_inclusive: false,
  }
}

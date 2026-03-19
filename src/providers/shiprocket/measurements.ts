import { ShiprocketError } from './errors'
import { MedusaLineItem, ShiprocketLengthUnit, ShipmentMeasurements } from './types'
import { toNumber } from './utils'

type MeasurementOverrides = {
  shipment_length?: number
  shipment_width?: number
  shipment_height?: number
  shipment_weight?: number
}

const getVariantDimensions = (item: MedusaLineItem) => {
  const variant = item.variant || item.product_variant || item.productVariant

  return {
    length: variant?.length ?? item.length,
    width: variant?.width ?? item.width,
    height: variant?.height ?? item.height,
    weight: variant?.weight ?? item.weight,
  }
}

const ensureLengthUnit = (lengthUnit?: string): ShiprocketLengthUnit => {
  if (lengthUnit === 'mm' || lengthUnit === 'cm' || lengthUnit === 'inches') {
    return lengthUnit
  }
  throw new ShiprocketError(
    'Shiprocket: Please add a length_unit. Supported values are mm, cm, inches'
  )
}

const convertToCm = (value: number, lengthUnit: ShiprocketLengthUnit): number => {
  switch (lengthUnit) {
    case 'mm':
      return value / 10
    case 'cm':
      return value
    case 'inches':
      return value * 2.54
  }
}

const volumetricWeightKg = (
  length: number,
  width: number,
  height: number,
  lengthUnit: ShiprocketLengthUnit
): number => {
  switch (lengthUnit) {
    case 'mm':
      return (length * width * height) / (5000 * 1000)
    case 'cm':
      return (length * width * height) / 5000
    case 'inches':
      return (length * width * height * 16.387064) / 5000
  }
}

export const getLineItemWeightKg = (item: MedusaLineItem): number => {
  const { weight } = getVariantDimensions(item)
  const quantity = Number(item.quantity || 1)
  if (weight == null) {
    return 0
  }
  return (Number(weight) * quantity) / 1000
}

export const resolveShipmentMeasurements = (
  items: MedusaLineItem[],
  lengthUnitInput: string | undefined,
  overrides: MeasurementOverrides = {}
): ShipmentMeasurements => {
  const lengthUnit = ensureLengthUnit(lengthUnitInput)

  const hasOverrides =
    overrides.shipment_length &&
    overrides.shipment_width &&
    overrides.shipment_height &&
    overrides.shipment_weight

  if (hasOverrides) {
    return {
      lengthCm: convertToCm(toNumber(overrides.shipment_length, 'shipment_length'), lengthUnit),
      widthCm: convertToCm(toNumber(overrides.shipment_width, 'shipment_width'), lengthUnit),
      heightCm: convertToCm(toNumber(overrides.shipment_height, 'shipment_height'), lengthUnit),
      weightKg: toNumber(overrides.shipment_weight, 'shipment_weight'),
    }
  }

  if (!items?.length) {
    throw new ShiprocketError(
      'Shiprocket: Missing item dimensions or weight for shipment calculations'
    )
  }

  let totalWeightKg = 0
  const volumetricWeights: Record<string, number> = {}

  items.forEach((item, index) => {
    const { length, width, height, weight } = getVariantDimensions(item)

    if (length == null || width == null || height == null || weight == null) {
      throw new ShiprocketError(
        'Shiprocket: Missing item dimensions or weight for shipment calculations'
      )
    }

    totalWeightKg += getLineItemWeightKg(item)

    const volWeight = volumetricWeightKg(
      Number(length),
      Number(width),
      Number(height),
      lengthUnit
    )

    const key = item.id || String(index)
    volumetricWeights[key] = volWeight
  })

  const largestItemKey = Object.keys(volumetricWeights).reduce((a, b) =>
    volumetricWeights[a] > volumetricWeights[b] ? a : b
  )

  const largestItem =
    items.find((item) => item.id === largestItemKey) ||
    items[parseInt(largestItemKey, 10)] ||
    items[0]

  const largestItemDimensions = getVariantDimensions(largestItem)

  if (
    largestItemDimensions.length == null ||
    largestItemDimensions.width == null ||
    largestItemDimensions.height == null
  ) {
    throw new ShiprocketError(
      'Shiprocket: Missing item dimensions or weight for shipment calculations'
    )
  }

  return {
    lengthCm: convertToCm(Number(largestItemDimensions.length), lengthUnit),
    widthCm: convertToCm(Number(largestItemDimensions.width), lengthUnit),
    heightCm: convertToCm(Number(largestItemDimensions.height), lengthUnit),
    weightKg: totalWeightKg,
  }
}

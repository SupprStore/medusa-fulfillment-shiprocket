async function processShipmentData(
  order_items: any[],
  length_unit: string,
  shipment_length?: number,
  shipment_width?: number,
  shipment_height?: number,
  shipment_weight?: number
): Promise<{
  lengthInCM: number
  widthInCM: number
  heightInCM: number
  shipmentWeight: number
}> {
  let lengthInCM: number
  let widthInCM: number
  let heightInCM: number
  let shipmentWeight: number

  let sumOfWeights = 0

  let largestItem: any

  const getVariantDimensions = (item: any) => {
    const variant = item.variant || item.product_variant || item.productVariant

    return {
      length: variant?.length ?? item.length,
      width: variant?.width ?? item.width,
      height: variant?.height ?? item.height,
      weight: variant?.weight ?? item.weight,
    }
  }

  if (shipment_length && shipment_width && shipment_height && shipment_weight) {
    switch (length_unit) {
      case 'mm':
        lengthInCM = shipment_length / 10
        widthInCM = shipment_width / 10
        heightInCM = shipment_height / 10
        break
      case 'cm':
        lengthInCM = shipment_length
        widthInCM = shipment_width
        heightInCM = shipment_height
        break
      case 'inches':
        lengthInCM = shipment_length * 2.54
        widthInCM = shipment_width * 2.54
        heightInCM = shipment_height * 2.54
        break
      default:
        throw new Error(
          'Shiprocket: Please add a length_unit. Supported values are mm, cm, inches'
        )
    }

    shipmentWeight = shipment_weight
  } else {
    console.log(
      "Shiprocket: Item dimensions and weight not found in order's metadata. Using largest item's dimensions and sum of weights"
    )

    let volWeights: Record<string, number> = {}

    order_items.forEach((item) => {
      const { length, width, height, weight } = getVariantDimensions(item)

      if (!length || !width || !height || !weight) {
        throw new Error(
          'Shiprocket: Missing item dimensions or weight for shipment calculations'
        )
      }

      sumOfWeights += weight / 1000 //Shiprocket requires weight in KGS

      let volWeight

      switch (length_unit) {
        case 'mm':
          volWeight = (length * width * height) / (5000 * 1000)
          break
        case 'cm':
          volWeight = (length * width * height) / 5000
          break
        case 'inches':
          volWeight = (length * width * height * 16.387064) / 5000
          break
        default:
          throw new Error(
            'Shiprocket: Please add a length_unit. Supported values are mm, cm, inches'
          )
      }

      volWeights[item.id] = volWeight
    })

    const largestItemId = Object.keys(volWeights).reduce((a, b) =>
      volWeights[a] > volWeights[b] ? a : b
    )

    largestItem = order_items.find((item) => item.id === largestItemId)
    const largestItemDimensions = getVariantDimensions(largestItem)

    switch (length_unit) {
      case 'mm':
        lengthInCM = largestItemDimensions.length / 10
        widthInCM = largestItemDimensions.width / 10
        heightInCM = largestItemDimensions.height / 10
        break
      case 'cm':
        lengthInCM = largestItemDimensions.length
        widthInCM = largestItemDimensions.width
        heightInCM = largestItemDimensions.height
        break
      case 'inches':
        lengthInCM = largestItemDimensions.length * 2.54
        widthInCM = largestItemDimensions.width * 2.54
        heightInCM = largestItemDimensions.height * 2.54
        break
      default:
        throw new Error(
          'Shiprocket: Please add a length_unit. Supported values are mm, cm, inches'
        )
    }

    shipmentWeight = sumOfWeights
  }

  return { lengthInCM, widthInCM, heightInCM, shipmentWeight }
}

export default processShipmentData

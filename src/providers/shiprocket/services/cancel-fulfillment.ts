export async function cancelFulfillmentHandler(provider: any, data: any): Promise<void> {
  await provider.ensureToken_()

  const shipmentId = data?.shipment_id || data?.data?.shipment_id
  const awbCode = data?.awb_code || data?.data?.awb_code
  const orderId = data?.order_id || data?.data?.order_id

  if (!shipmentId) {
    throw new Error(
      'Shiprocket: Unable to cancel shipment. shipment_id not found.'
    )
  }

  const shipmentDetails = await provider.client_.shipments.retrieveById(shipmentId)

  if (shipmentDetails.status > 5 && shipmentDetails.status !== 11) {
    throw new Error(
      'Shiprocket: Shipment has already been shipped, cannot be cancelled.'
    )
  }

  if (awbCode) {
    await provider.client_.orders.cancelShipment({
      awbs: [awbCode],
    })
  }

  if (orderId) {
    await provider.client_.orders.cancelOrder({
      ids: [orderId],
    })
  }
}

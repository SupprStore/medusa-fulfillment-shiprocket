import { AbstractFulfillmentProviderService } from '@medusajs/utils'
import type {
  FulfillmentOption,
  CreateShippingOptionDTO,
  CalculateShippingOptionPriceDTO,
  CalculatedShippingOptionPrice,
  FulfillmentItemDTO,
  FulfillmentOrderDTO,
  FulfillmentDTO,
  CreateFulfillmentResult,
  ValidateFulfillmentDataContext,
} from '@medusajs/types'
import ShiprocketClient from '../core/client'
import { TOKEN_TTL_MS } from '../utils/constants'
import { normalizeAmount, sumLineItemTotals } from '../utils/amounts'
import {
  buildForwardFulfillmentPayload,
  buildForwardOrderPayload,
  buildReturnFulfillmentPayload,
  buildReturnOrderPayload,
} from '../utils/mappers'
import { getLineItemWeightKg, resolveShipmentMeasurements } from '../utils/measurements'
import { ShiprocketError } from '../utils/errors'
import {
  MedusaLineItem,
  MedusaOrder,
  PriceCalculationContext,
  ProviderContainer,
  ShiprocketLogger,
  ShiprocketPickupLocation,
  ShiprocketProviderOptions,
} from '../types'
import { ensurePresent, resolveCourierId, toInt } from '../utils'

const normalizeOptions = (options: ShiprocketProviderOptions): ShiprocketProviderOptions => ({
  pricing: 'calculated',
  length_unit: 'cm',
  multiple_items: 'single_shipment',
  inventory_sync: false,
  forward_action: 'create_order',
  return_action: 'create_order',
  ...options,
})

class ShiprocketFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = 'shiprocket'

  public options_: ShiprocketProviderOptions
  public logger_: ShiprocketLogger
  public totalsService_?: any
  public client_: ShiprocketClient
  private token_?: string
  private tokenExpiresAt_: number | null
  private auth_: { email?: string; password?: string }
  private regionNames_: Intl.DisplayNames | null
  private refreshPromise_: Promise<void> | null
  private pickupLocationCache_: ShiprocketPickupLocation | null

  constructor(container: ProviderContainer, options: ShiprocketProviderOptions) {
    super()

    const normalized = normalizeOptions(options)

    if (!normalized.channel_id) {
      throw new ShiprocketError('Shiprocket: channel_id is required.')
    }

    this.options_ = normalized
    this.logger_ = container?.logger || console
    this.totalsService_ = container?.totalsService

    this.client_ = new ShiprocketClient({ token: this.options_.token, logger: this.logger_ })
    this.token_ = this.options_.token
    this.tokenExpiresAt_ = this.token_ ? Date.now() + TOKEN_TTL_MS : null
    this.auth_ = {
      email: this.options_.email,
      password: this.options_.password,
    }

    this.regionNames_ =
      typeof Intl !== 'undefined' && (Intl as any).DisplayNames
        ? new (Intl as any).DisplayNames(['en'], { type: 'region' })
        : null
    this.refreshPromise_ = null
    this.pickupLocationCache_ = null
  }

  public getCountryDisplayName(alpha2?: string): string {
    if (!alpha2) return ''
    if (!this.regionNames_) return alpha2.toUpperCase()
    return this.regionNames_.of(alpha2.toUpperCase()) || alpha2.toUpperCase()
  }

  private async refreshToken_(): Promise<void> {
    if (!this.auth_.email || !this.auth_.password) {
      if (!this.token_) {
        throw new ShiprocketError(
          'Shiprocket: Missing credentials. Provide email/password or a valid token.'
        )
      }
      return
    }

    if (this.refreshPromise_) {
      await this.refreshPromise_
      return
    }

    this.refreshPromise_ = (async () => {
      const token = await this.client_.auth.login(this.auth_.email!, this.auth_.password!)
      this.token_ = token
      this.client_.setToken(token)
      this.tokenExpiresAt_ = Date.now() + TOKEN_TTL_MS
    })()

    try {
      await this.refreshPromise_
    } finally {
      this.refreshPromise_ = null
    }
  }

  public async ensureToken_(): Promise<void> {
    if (this.token_ && this.tokenExpiresAt_ && Date.now() < this.tokenExpiresAt_) {
      return
    }
    await this.refreshToken_()
  }

  private async getPrimaryPickupLocation_(): Promise<ShiprocketPickupLocation> {
    if (this.pickupLocationCache_) {
      return this.pickupLocationCache_
    }

    const pickupLocations = await this.client_.company.retrieveAll()
    const pickupLocation = pickupLocations?.shipping_address?.[0]

    if (!pickupLocation) {
      throw new ShiprocketError('Shiprocket: No pickup location found.')
    }

    this.pickupLocationCache_ = pickupLocation
    return pickupLocation
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    await this.ensureToken_()
    const couriers = await this.client_.couriers.retrieveAll('active')
    return (couriers || []).map((courier: any) => ({
      id: String(courier.id || courier.courier_company_id),
      name: courier.name || courier.courier_name,
      courier_company_id: courier.courier_company_id,
      ...courier,
    }))
  }

  async validateOption(data: any): Promise<boolean> {
    await this.ensureToken_()
    const allOpts = await this.client_.couriers.retrieveAll('active')
    const resolvedId = resolveCourierId(data)
    const selectedOpt = allOpts.find(
      (opt: any) => opt.id === resolvedId || opt.courier_company_id === resolvedId
    )
    return !!selectedOpt
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: ValidateFulfillmentDataContext
  ): Promise<any> {
    return { ...optionData, ...data }
  }

  async canCalculate(_data: CreateShippingOptionDTO): Promise<boolean> {
    return this.options_.pricing === 'calculated'
  }

  async calculatePrice(
    optionData: CalculateShippingOptionPriceDTO['optionData'],
    _data: CalculateShippingOptionPriceDTO['data'],
    context: CalculateShippingOptionPriceDTO['context']
  ): Promise<CalculatedShippingOptionPrice> {
    const ctx = context as PriceCalculationContext
    if (this.options_.pricing === 'flat_rate') {
      throw new ShiprocketError('Shiprocket: Pricing strategy is set to flat_rate')
    }

    await this.ensureToken_()

    const items = ctx?.items || []
    const shipmentWeight = items.reduce(
      (acc: number, item: MedusaLineItem) => acc + getLineItemWeightKg(item),
      0
    )

    const pickupLocation = await this.getPrimaryPickupLocation_()

    const isReturn = Boolean(ctx?.items?.[0]?.is_return || ctx?.is_return)
    const pickupPostcode = isReturn
      ? pickupLocation.pin_code
      : ctx?.shipping_address?.postal_code
    const deliveryPostcode = isReturn
      ? ctx?.shipping_address?.postal_code
      : pickupLocation.pin_code

    if (!pickupPostcode || !deliveryPostcode) {
      throw new ShiprocketError(
        'Shiprocket: Missing pickup or delivery postal code for rate calculation.'
      )
    }

    const declaredValue = normalizeAmount(
      ctx?.subtotal ?? sumLineItemTotals(items),
      ctx?.currency_code
    )

    const resp = await this.client_.couriers.getServiceability({
      pickup_postcode: toInt(pickupPostcode, 'pickup postal code'),
      delivery_postcode: toInt(deliveryPostcode, 'delivery postal code'),
      cod: Boolean(ctx?.metadata?.isCOD || ctx?.metadata?.is_cod),
      weight: shipmentWeight,
      declared_value: declaredValue,
    })

    const selected = resp?.available_courier_companies?.find(
      (opt: any) => opt.courier_company_id === optionData.id || opt.id === optionData.id
    )

    const rate = selected?.rate || 0

    return {
      calculated_amount: Math.round(rate * 100),
      is_calculated_price_tax_inclusive: false,
    }
  }

  async createFulfillment(
    data: Record<string, unknown>,
    items: Partial<Omit<FulfillmentItemDTO, 'fulfillment'>>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<Omit<FulfillmentDTO, 'provider_id' | 'data' | 'items'>>
  ): Promise<CreateFulfillmentResult> {
    await this.ensureToken_()

    const fromOrder = (order as MedusaOrder) || (fulfillment as any)?.order

    if (!fromOrder) {
      throw new ShiprocketError('Shiprocket: Missing order context for fulfillment.')
    }

    const billingAddress = ensurePresent(
      fromOrder.billing_address,
      'Shiprocket: Missing billing address.'
    )
    const shippingAddress = ensurePresent(
      fromOrder.shipping_address,
      'Shiprocket: Missing shipping address.'
    )

    const metadata = fromOrder.metadata || {}
    const isCod = Boolean(metadata.isCOD || metadata.is_cod || metadata.cod)
    const gstin = metadata.gstin

    const fulfillmentItems = (items?.length ? items : fromOrder.items || []) as MedusaLineItem[]

    const shipment = resolveShipmentMeasurements(fulfillmentItems, this.options_.length_unit, {
      shipment_length: metadata.shipment_length,
      shipment_width: metadata.shipment_width,
      shipment_height: metadata.shipment_height,
      shipment_weight: metadata.shipment_weight,
    })

    const pickupLocation = await this.getPrimaryPickupLocation_()
    const courierId = resolveCourierId(data)

    if (!courierId) {
      throw new ShiprocketError('Shiprocket: Courier ID missing from method data.')
    }

    const payloadInput = {
      options: this.options_,
      order: fromOrder,
      billingAddress,
      shippingAddress,
      fulfillmentItems,
      totalsService: this.totalsService_,
      courierId,
      shipment,
      pickupLocation,
      isCod,
      gstin,
      getCountryDisplayName: this.getCountryDisplayName.bind(this),
    }

    let response: any

    if (this.options_.forward_action === 'create_fulfillment') {
      if (
        fulfillmentItems.length > 1 &&
        this.options_.multiple_items === 'split_shipment'
      ) {
        this.logger_?.warn?.(
          "Shiprocket: Split shipments can't be created via API. Creating a Shiprocket Order instead."
        )

        const orderPayload = await buildForwardOrderPayload(payloadInput)
        response = this.options_.inventory_sync
          ? await this.client_.orders.createForChannel(orderPayload)
          : await this.client_.orders.createCustom(orderPayload)
      } else {
        const payload = await buildForwardFulfillmentPayload(payloadInput)
        response = await this.client_.wrapper.forward(payload)
      }
    } else {
      const payload = await buildForwardOrderPayload(payloadInput)
      response = this.options_.inventory_sync
        ? await this.client_.orders.createForChannel(payload)
        : await this.client_.orders.createCustom(payload)
    }

    return {
      data: response,
      labels: [],
    }
  }

  async createReturnFulfillment(fulfillment: Record<string, unknown>): Promise<CreateFulfillmentResult> {
    await this.ensureToken_()

    const fulfillmentInput = fulfillment as any
    const data = fulfillmentInput.data || {}
    const items = (fulfillmentInput.items as MedusaLineItem[]) || []
    const fromOrder = (fulfillmentInput.order as MedusaOrder) || fulfillmentInput?.order

    if (!fromOrder) {
      throw new ShiprocketError('Shiprocket: Missing order context for return fulfillment.')
    }

    const methodData = data || fulfillmentInput?.shipping_method?.data || fulfillmentInput?.shipping_method
    const courierId = resolveCourierId(methodData)

    if (!courierId) {
      throw new ShiprocketError('Shiprocket: Courier ID missing from return method data.')
    }

    ensurePresent(fromOrder.shipping_address, 'Shiprocket: Missing shipping address for return.')

    const metadata = fromOrder.metadata || {}
    const returnItems = (items?.length ? items : fromOrder.items || []) as MedusaLineItem[]

    const shipment = resolveShipmentMeasurements(returnItems, this.options_.length_unit, {
      shipment_length: metadata.shipment_length,
      shipment_width: metadata.shipment_width,
      shipment_height: metadata.shipment_height,
      shipment_weight: metadata.shipment_weight,
    })

    const pickupLocation = await this.getPrimaryPickupLocation_()
    const orderDiscountTotal = Number(fromOrder.discount_total || 0)

    const payloadInput = {
      options: this.options_,
      order: fromOrder,
      returnItems,
      totalsService: this.totalsService_,
      courierId,
      shipment,
      pickupLocation,
      orderDiscountTotal,
      getCountryDisplayName: this.getCountryDisplayName.bind(this),
    }

    let response: any

    if (this.options_.return_action === 'create_fulfillment') {
      if (returnItems.length > 1 && this.options_.multiple_items === 'split_shipment') {
        this.logger_?.warn?.(
          "Shiprocket: Split shipments can't be created via API. Creating a Shiprocket Return Order instead."
        )

        const payload = await buildReturnOrderPayload(payloadInput)
        response = await this.client_.returns.createReturn(payload)
      } else {
        const payload = await buildReturnFulfillmentPayload(payloadInput)
        response = await this.client_.wrapper.reverse(payload)
      }
    } else {
      const payload = await buildReturnOrderPayload(payloadInput)
      response = await this.client_.returns.createReturn(payload)
    }

    return {
      data: response,
      labels: [],
    }
  }

  async cancelFulfillment(data: any): Promise<void> {
    await this.ensureToken_()

    const shipmentId = data?.shipment_id || data?.data?.shipment_id
    const awbCode = data?.awb_code || data?.data?.awb_code
    const orderId = data?.order_id || data?.data?.order_id

    if (!shipmentId) {
      throw new ShiprocketError(
        'Shiprocket: Unable to cancel shipment. shipment_id not found.'
      )
    }

    const shipmentDetails = await this.client_.shipments.retrieveById(shipmentId)

    if (shipmentDetails?.status > 5 && shipmentDetails?.status !== 11) {
      throw new ShiprocketError(
        'Shiprocket: Shipment has already been shipped, cannot be cancelled.'
      )
    }

    if (awbCode) {
      await this.client_.orders.cancelShipment({
        awbs: [awbCode],
      })
    }

    if (orderId) {
      await this.client_.orders.cancelOrder({
        ids: [orderId],
      })
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Document retrieval stubs
  // Shiprocket's API does not expose endpoints for retrieving shipping labels
  // or documents by fulfillment. These stubs satisfy the
  // AbstractFulfillmentProviderService interface contract.
  // ────────────────────────────────────────────────────────────────────────────

  async getFulfillmentDocuments(
    _data: Record<string, unknown>
  ): Promise<never[]> {
    return []
  }

  async getReturnDocuments(
    _data: Record<string, unknown>
  ): Promise<never[]> {
    return []
  }

  async getShipmentDocuments(
    _data: Record<string, unknown>
  ): Promise<never[]> {
    return []
  }

  async retrieveDocuments(
    _fulfillmentData: Record<string, unknown>,
    _documentType: string
  ): Promise<void> {
    // Shiprocket does not support document retrieval by type via API.
    // This is a no-op stub to satisfy the abstract interface.
  }
}

export default ShiprocketFulfillmentProviderService

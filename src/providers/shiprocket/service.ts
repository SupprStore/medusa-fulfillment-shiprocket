import axios from 'axios'
import { AbstractFulfillmentProviderService } from '@medusajs/framework/utils'
import Shiprocket from '../../utils/shiprocket'
import {
  forwardFulfillment,
  forwardOrder,
  reverseFulfillment,
  reverseOrder,
  processShipmentData,
} from '../../helpers'
import { normalizeAmount, sumLineItemTotals } from '../../utils/amounts'

type ShiprocketProviderOptions = {
  channel_id: string | number
  email?: string
  password?: string
  token?: string
  pricing: 'flat_rate' | 'calculated'
  length_unit: 'mm' | 'cm' | 'inches'
  multiple_items: 'single_shipment' | 'split_shipment'
  inventory_sync: boolean
  forward_action: 'create_order' | 'create_fulfillment'
  return_action: 'create_order' | 'create_fulfillment'
}

type ProviderContainer = {
  logger?: { warn: (message: string) => void }
  totalsService?: any
}

const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000

class ShiprocketFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = 'shiprocket'

  private options_: ShiprocketProviderOptions
  private logger_: { warn: (message: string) => void }
  private totalsService_?: any
  private client_: Shiprocket
  private token_?: string
  private tokenExpiresAt_: Date | null
  private auth_: { email?: string; password?: string }
  private regionNames_: any

  constructor(container: ProviderContainer, options: ShiprocketProviderOptions) {
    super(container, options)

    this.options_ = options || {}
    this.logger_ = container?.logger || console
    this.totalsService_ = container?.totalsService

    this.client_ = new Shiprocket({ token: this.options_.token })
    this.token_ = this.options_.token
    this.tokenExpiresAt_ = this.token_ ? new Date(Date.now() + TOKEN_TTL_MS) : null
    this.auth_ = {
      email: this.options_.email,
      password: this.options_.password,
    }

    this.regionNames_ =
      typeof Intl !== 'undefined' && Intl.DisplayNames
        ? new Intl.DisplayNames(['en'], { type: 'region' })
        : null
  }

  getCountryDisplayName(alpha2?: string): string {
    if (!alpha2) {
      return ''
    }

    if (!this.regionNames_) {
      return alpha2.toUpperCase()
    }

    return this.regionNames_.of(alpha2.toUpperCase()) || alpha2.toUpperCase()
  }

  resolveCourierId_(data: any): string | number | undefined {
    if (!data) {
      return undefined
    }

    return (
      data.id ||
      data.courier_id ||
      data.courier_company_id ||
      data.data?.id ||
      data.data?.courier_id ||
      data.data?.courier_company_id
    )
  }

  async refreshToken_(): Promise<void> {
    if (!this.auth_.email || !this.auth_.password) {
      if (!this.token_) {
        throw new Error(
          'Shiprocket: Missing credentials. Provide email/password or a valid token.'
        )
      }

      return
    }

    const response = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/auth/login',
      {
        email: this.auth_.email,
        password: this.auth_.password,
      }
    )

    const token = response?.data?.token

    if (!token) {
      throw new Error('Shiprocket: Failed to refresh token.')
    }

    this.token_ = token
    this.client_.setToken(token)
    this.tokenExpiresAt_ = new Date(Date.now() + TOKEN_TTL_MS)
  }

  async ensureToken_(): Promise<void> {
    if (this.token_ && !this.tokenExpiresAt_) {
      return
    }

    if (this.tokenExpiresAt_ && Date.now() < this.tokenExpiresAt_.getTime()) {
      return
    }

    await this.refreshToken_()
  }

  getItemWeightInKg_(item: any): number {
    const variant = item?.variant || item?.product_variant || item?.productVariant
    const weight = variant?.weight ?? item?.weight ?? 0
    return Number(weight || 0) / 1000
  }

  async getFulfillmentOptions(): Promise<any> {
    await this.ensureToken_()
    return await this.client_.couriers.retrieveAll('active')
  }

  async validateOption(data: any): Promise<boolean> {
    await this.ensureToken_()

    const allOpts = await this.client_.couriers.retrieveAll('active')
    const selectedOpt = allOpts.find((opt) => opt.id === data.id)

    return !!selectedOpt
  }

  validateFulfillmentData(optionData: any, data: any, _context: any): any {
    return {
      ...optionData,
      ...data,
    }
  }

  async canCalculate(_data: any): Promise<boolean> {
    return this.options_.pricing === 'calculated'
  }

  async calculatePrice(optionData: any, _data: any, context: any): Promise<any> {
    if (this.options_.pricing === 'flat_rate') {
      throw new Error('Shiprocket: Pricing strategy is set to flat_rate')
    }

    await this.ensureToken_()

    const items = context?.items || []
    const shipmentWeight = items.reduce(
      (acc, item) => acc + this.getItemWeightInKg_(item),
      0
    )

    const pickupLocations = await this.client_.company.retrieveAll()
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

    const resp = await this.client_.couriers.getServiceability({
      pickup_postcode: parseInt(pickupPostcode),
      delivery_postcode: parseInt(deliveryPostcode),
      cod: context?.metadata?.isCOD ? true : false,
      weight: shipmentWeight,
      declared_value: declaredValue,
    })

    const selOpt = resp?.available_courier_companies?.filter(
      (opt) => opt.courier_company_id === optionData.id
    )

    const rate = selOpt?.[0]?.rate || 0

    return {
      calculated_amount: Math.round(rate * 100),
      is_calculated_price_tax_inclusive: false,
    }
  }

  async createFulfillment(
    data: any,
    items: any[],
    order: any,
    fulfillment: any
  ): Promise<any> {
    await this.ensureToken_()

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
        this.options_.length_unit,
        shipment_length,
        shipment_width,
        shipment_height,
        shipment_weight
      )

    const pickupLocations = await this.client_.company.retrieveAll()
    const pickupLocation = pickupLocations?.shipping_address?.[0]

    if (!pickupLocation) {
      throw new Error('Shiprocket: No pickup location found.')
    }
    const courier_id = this.resolveCourierId_(data)

    if (!courier_id) {
      throw new Error('Shiprocket: Courier ID missing from method data.')
    }

    const forwardData = {
      options: this.options_,
      client: this.client_,
      totalsService: this.totalsService_,
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
      getCountryDisplayName: this.getCountryDisplayName.bind(this),
    }

    let response: any

    if (this.options_.forward_action === 'create_fulfillment') {
      if (
        items?.length > 1 &&
        this.options_.multiple_items === 'split_shipment'
      ) {
        this.logger_.warn(
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

  async createReturnFulfillment(
    data: any,
    items: any[],
    order: any,
    returnRequest: any
  ): Promise<any> {
    await this.ensureToken_()

    const fromOrder = order || returnRequest?.order

    if (!fromOrder) {
      throw new Error('Shiprocket: Missing order context for return fulfillment.')
    }

    const methodData =
      data || returnRequest?.shipping_method?.data || returnRequest?.shipping_method

    const courier_id = this.resolveCourierId_(methodData)

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
        this.options_.length_unit,
        shipment_length,
        shipment_width,
        shipment_height,
        shipment_weight
      )

    const pickupLocations = await this.client_.company.retrieveAll()
    const pickupLocation = pickupLocations?.shipping_address?.[0]

    if (!pickupLocation) {
      throw new Error('Shiprocket: No pickup location found.')
    }
    const orderDiscountTotal = Number(fromOrder.discount_total || 0)

    const returnItems = items?.length ? items : fromOrder.items

    const reverseData = {
      options: this.options_,
      client: this.client_,
      totalsService: this.totalsService_,
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
      getCountryDisplayName: this.getCountryDisplayName.bind(this),
    }

    let response: any

    if (this.options_.return_action === 'create_fulfillment') {
      if (
        (items?.length || fromOrder.items?.length || 0) > 1 &&
        this.options_.multiple_items === 'split_shipment'
      ) {
        this.logger_.warn(
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

  async cancelFulfillment(data: any): Promise<void> {
    await this.ensureToken_()

    const shipmentId = data?.shipment_id || data?.data?.shipment_id
    const awbCode = data?.awb_code || data?.data?.awb_code
    const orderId = data?.order_id || data?.data?.order_id

    if (!shipmentId) {
      throw new Error(
        'Shiprocket: Unable to cancel shipment. shipment_id not found.'
      )
    }

    const shipmentDetails = await this.client_.shipments.retrieveById(shipmentId)

    if (shipmentDetails.status > 5 && shipmentDetails.status !== 11) {
      throw new Error(
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
}

export default ShiprocketFulfillmentProviderService

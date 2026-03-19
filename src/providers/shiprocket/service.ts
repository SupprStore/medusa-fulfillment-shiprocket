import axios from 'axios'
import { AbstractFulfillmentProviderService } from '@medusajs/utils'
import Shiprocket from '../../utils/shiprocket'
import { calculatePriceHandler } from './services/calculate-price'
import { createFulfillmentHandler } from './services/create-fulfillment'
import { createReturnFulfillmentHandler } from './services/create-return-fulfillment'
import { cancelFulfillmentHandler } from './services/cancel-fulfillment'

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

  public options_: ShiprocketProviderOptions
  public logger_: { warn: (message: string) => void }
  public totalsService_?: any
  public client_: Shiprocket
  private token_?: string
  private tokenExpiresAt_: Date | null
  private auth_: { email?: string; password?: string }
  private regionNames_: any

  constructor(container: ProviderContainer, options: ShiprocketProviderOptions) {
    super()

    this.options_ = options as ShiprocketProviderOptions
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
      typeof Intl !== 'undefined' && (Intl as any).DisplayNames
        ? new (Intl as any).DisplayNames(['en'], { type: 'region' })
        : null
  }

  public getCountryDisplayName(alpha2?: string): string {
    if (!alpha2) return ''
    if (!this.regionNames_) return alpha2.toUpperCase()
    return this.regionNames_.of(alpha2.toUpperCase()) || alpha2.toUpperCase()
  }

  public resolveCourierId_(data: any): string | number | undefined {
    if (!data) return undefined
    return (
      data.id ||
      data.courier_id ||
      data.courier_company_id ||
      data.data?.id ||
      data.data?.courier_id ||
      data.data?.courier_company_id
    )
  }

  public async refreshToken_(): Promise<void> {
    if (!this.auth_.email || !this.auth_.password) {
      if (!this.token_) {
        throw new Error(
          'Shiprocket: Missing credentials. Provide email/password or a valid token.'
        )
      }
      return
    }

    const { data } = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/auth/login',
      {
        email: this.auth_.email,
        password: this.auth_.password,
      }
    )

    const token = data?.token
    if (!token) throw new Error('Shiprocket: Failed to refresh token.')

    this.token_ = token
    this.client_.setToken(token)
    this.tokenExpiresAt_ = new Date(Date.now() + TOKEN_TTL_MS)
  }

  public async ensureToken_(): Promise<void> {
    if (this.token_ && (!this.tokenExpiresAt_ || Date.now() < this.tokenExpiresAt_.getTime())) {
      return
    }
    await this.refreshToken_()
  }

  public getItemWeightInKg_(item: any): number {
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
    const selectedOpt = allOpts.find((opt: any) => opt.id === data.id)
    return !!selectedOpt
  }

  validateFulfillmentData(optionData: any, data: any, _context: any): any {
    return { ...optionData, ...data }
  }

  async canCalculate(_data: any): Promise<boolean> {
    return this.options_.pricing === 'calculated'
  }

  async calculatePrice(optionData: any, _data: any, context: any): Promise<any> {
    return calculatePriceHandler(this, optionData, _data, context)
  }

  async createFulfillment(
    data: Record<string, unknown>,
    items: Record<string, unknown>[],
    order: Record<string, unknown> | undefined,
    fulfillment: Record<string, unknown>
  ): Promise<any> {
    return createFulfillmentHandler(this, data, items, order, fulfillment)
  }

  async createReturnFulfillment(fulfillment: Record<string, unknown>): Promise<any> {
    return createReturnFulfillmentHandler(
      this,
      fulfillment.data || {},
      (fulfillment.items as any[]) || [],
      fulfillment.order || {},
      fulfillment
    )
  }

  async cancelFulfillment(data: any): Promise<void> {
    return cancelFulfillmentHandler(this, data)
  }
}

export default ShiprocketFulfillmentProviderService

import axios, { type AxiosInstance } from 'axios'
import axiosRetry from 'axios-retry'
import rateLimit from 'axios-rate-limit'

type ShiprocketOptions = {
  token?: string
}

export interface ShiprocketServiceabilityPayload {
  pickup_postcode: number
  delivery_postcode: number
  cod: boolean
  weight: number
  declared_value?: number
}

class Shiprocket {
  private token_?: string
  private client_: AxiosInstance
  orders: ReturnType<typeof this.buildOrderEndpoints_>
  shipments: ReturnType<typeof this.buildShipmentEndpoints_>
  couriers: ReturnType<typeof this.buildCourierEndpoints_>
  company: ReturnType<typeof this.buildCompanyEndpoints_>
  returns: ReturnType<typeof this.buildReturnEndpoints_>
  wrapper: ReturnType<typeof this.buildWrapperEndpoints_>

  constructor({ token }: ShiprocketOptions = {}) {
    this.token_ = token
    const baseClient = axios.create({
      baseURL: `https://apiv2.shiprocket.in/v1/external`,
      headers: {
        'content-type': 'application/json',
      },
    })

    // Apply rate limit (2 requests per second) and retry logic (3 retries with exponential backoff)
    this.client_ = rateLimit(baseClient, { maxRequests: 2, perMilliseconds: 1000 })
    axiosRetry(this.client_, { retries: 3, retryDelay: axiosRetry.exponentialDelay })

    if (token) {
      this.client_.defaults.headers.Authorization = `Bearer ${token}`
    }

    this.orders = this.buildOrderEndpoints_()
    this.shipments = this.buildShipmentEndpoints_()
    this.couriers = this.buildCourierEndpoints_()
    this.company = this.buildCompanyEndpoints_()
    this.returns = this.buildReturnEndpoints_()
    this.wrapper = this.buildWrapperEndpoints_()
  }

  setToken = (token?: string) => {
    this.token_ = token
    if (token) {
      this.client_.defaults.headers.Authorization = `Bearer ${token}`
    } else {
      delete this.client_.defaults.headers.Authorization
    }
  }

  private buildOrderEndpoints_ = () => ({
    retrieveById: async (id: string | number) => {
      const { data: { data } } = await this.client_.get(`/orders/show/${id}`)
      return data
    },
    createCustom: async (payload: any) => {
      const { data } = await this.client_.post(`/orders/create/adhoc`, payload)
      return data
    },
    createForChannel: async (payload: any) => {
      const { data } = await this.client_.post(`/orders/create`, payload)
      return data
    },
    cancelOrder: async (payload: any) => {
      await this.client_.post(`/orders/cancel`, payload)
    },
    cancelShipment: async (payload: any) => {
      const { data } = await this.client_.post(`orders/cancel/shipment/awbs`, payload)
      return data.message
    }
  })

  private buildShipmentEndpoints_ = () => ({
    retrieveById: async (id: string | number) => {
      const { data: { data } } = await this.client_.get(`/shipments/${id}`)
      return data
    }
  })

  private buildCourierEndpoints_ = () => ({
    retrieveAll: async (type: string) => {
      const { data: { courier_data } } = await this.client_.get(`/courier/courierListWithCounts`, { params: { type } })
      return courier_data
    },
    getServiceability: async (payload: ShiprocketServiceabilityPayload) => {
      const { data: { data } } = await this.client_.get(`/courier/serviceability`, { params: payload })
      return data
    }
  })

  private buildCompanyEndpoints_ = () => ({
    retrieveAll: async () => {
      const { data: { data } } = await this.client_.get(`/settings/company/pickup`)
      return data
    }
  })

  private buildReturnEndpoints_ = () => ({
    createReturn: async (payload: any) => {
      const { data } = await this.client_.post(`/orders/create/return`, payload)
      return data
    }
  })

  private buildWrapperEndpoints_ = () => ({
    forward: async (payload: any) => {
      const { data: { payload: resPayload } } = await this.client_.post(`/shipments/create/forward-shipment`, payload)
      return resPayload
    },
    reverse: async (payload: any) => {
      const { data: { payload: resPayload } } = await this.client_.post(`/shipments/create/return-shipment`, payload)
      return resPayload
    }
  })
}

export default Shiprocket

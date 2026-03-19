import axios, { type AxiosInstance } from 'axios'
import axiosRetry from 'axios-retry'
import rateLimit from 'axios-rate-limit'
import { DEFAULT_RATE_LIMIT, DEFAULT_RETRIES, SHIPROCKET_BASE_URL } from './constants'
import { ShiprocketError } from './errors'
import { ShiprocketLogger } from './types'

type ShiprocketClientOptions = {
  token?: string
  logger?: ShiprocketLogger
}

class ShiprocketClient {
  private client_: AxiosInstance
  private logger_?: ShiprocketLogger

  constructor({ token, logger }: ShiprocketClientOptions = {}) {
    this.logger_ = logger

    const baseClient = axios.create({
      baseURL: SHIPROCKET_BASE_URL,
      headers: {
        'content-type': 'application/json',
      },
    })

    this.client_ = rateLimit(baseClient, {
      maxRequests: DEFAULT_RATE_LIMIT.maxRequests,
      perMilliseconds: DEFAULT_RATE_LIMIT.perMilliseconds,
    })

    axiosRetry(this.client_, {
      retries: DEFAULT_RETRIES,
      retryDelay: axiosRetry.exponentialDelay,
    })

    if (token) {
      this.setToken(token)
    }
  }

  setToken = (token?: string) => {
    if (token) {
      this.client_.defaults.headers.Authorization = `Bearer ${token}`
    } else {
      delete this.client_.defaults.headers.Authorization
    }
  }

  private async request_<T>(
    config: Parameters<AxiosInstance['request']>[0],
    errorMessage: string
  ): Promise<T> {
    try {
      const response = await this.client_.request<T>(config)
      return response.data
    } catch (error: any) {
      const statusCode = error?.response?.status
      const details = error?.response?.data
      if (this.logger_?.error) {
        this.logger_.error(`Shiprocket: ${errorMessage}`)
      }
      throw new ShiprocketError(errorMessage, {
        statusCode,
        details,
        cause: error,
      })
    }
  }

  auth = {
    login: async (email: string, password: string): Promise<string> => {
      const data = await this.request_<{ token?: string }>(
        {
          method: 'post',
          url: '/auth/login',
          data: { email, password },
        },
        'Failed to authenticate with Shiprocket.'
      )

      if (!data?.token) {
        throw new ShiprocketError('Shiprocket: Failed to refresh token.')
      }

      return data.token
    },
  }

  orders = {
    retrieveById: async (id: string | number) => {
      const data = await this.request_<{ data?: { data?: any } }>(
        {
          method: 'get',
          url: `/orders/show/${id}`,
        },
        'Failed to retrieve Shiprocket order.'
      )
      return data?.data?.data
    },
    createCustom: async (payload: any) => {
      return this.request_<any>(
        {
          method: 'post',
          url: '/orders/create/adhoc',
          data: payload,
        },
        'Failed to create Shiprocket order.'
      )
    },
    createForChannel: async (payload: any) => {
      return this.request_<any>(
        {
          method: 'post',
          url: '/orders/create',
          data: payload,
        },
        'Failed to create Shiprocket order for channel.'
      )
    },
    cancelOrder: async (payload: any) => {
      await this.request_<any>(
        {
          method: 'post',
          url: '/orders/cancel',
          data: payload,
        },
        'Failed to cancel Shiprocket order.'
      )
    },
    cancelShipment: async (payload: any) => {
      const data = await this.request_<{ message?: string }>(
        {
          method: 'post',
          url: '/orders/cancel/shipment/awbs',
          data: payload,
        },
        'Failed to cancel Shiprocket shipment.'
      )
      return data?.message
    },
  }

  shipments = {
    retrieveById: async (id: string | number) => {
      const data = await this.request_<{ data?: { data?: any } }>(
        {
          method: 'get',
          url: `/shipments/${id}`,
        },
        'Failed to retrieve Shiprocket shipment.'
      )
      return data?.data?.data
    },
  }

  couriers = {
    retrieveAll: async (type: string) => {
      const data = await this.request_<{ courier_data?: any }>(
        {
          method: 'get',
          url: '/courier/courierListWithCounts',
          params: { type },
        },
        'Failed to retrieve Shiprocket couriers.'
      )
      return data?.courier_data
    },
    getServiceability: async (payload: any) => {
      const data = await this.request_<{ data?: any }>(
        {
          method: 'get',
          url: '/courier/serviceability',
          params: payload,
        },
        'Failed to retrieve Shiprocket serviceability.'
      )
      return data?.data
    },
  }

  company = {
    retrieveAll: async () => {
      const data = await this.request_<{ data?: any }>(
        {
          method: 'get',
          url: '/settings/company/pickup',
        },
        'Failed to retrieve Shiprocket pickup locations.'
      )
      return data?.data
    },
  }

  returns = {
    createReturn: async (payload: any) => {
      return this.request_<any>(
        {
          method: 'post',
          url: '/orders/create/return',
          data: payload,
        },
        'Failed to create Shiprocket return order.'
      )
    },
  }

  wrapper = {
    forward: async (payload: any) => {
      const data = await this.request_<{ payload?: any }>(
        {
          method: 'post',
          url: '/shipments/create/forward-shipment',
          data: payload,
        },
        'Failed to create Shiprocket forward shipment.'
      )
      return data?.payload
    },
    reverse: async (payload: any) => {
      const data = await this.request_<{ payload?: any }>(
        {
          method: 'post',
          url: '/shipments/create/return-shipment',
          data: payload,
        },
        'Failed to create Shiprocket return shipment.'
      )
      return data?.payload
    },
  }
}

export default ShiprocketClient

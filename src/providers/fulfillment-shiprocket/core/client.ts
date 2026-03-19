import axios, { type AxiosInstance } from 'axios'
import axiosRetry from 'axios-retry'
import rateLimit from 'axios-rate-limit'
import { DEFAULT_RATE_LIMIT, DEFAULT_RETRIES, SHIPROCKET_BASE_URL } from '../utils/constants'
import { ShiprocketError } from '../utils/errors'
import { ShiprocketLogger } from '../types'
import { DefaultApi, Configuration } from '../../../lib/shiprocket-client'

type ShiprocketClientOptions = {
  token?: string
  logger?: ShiprocketLogger
}

class ShiprocketClient {
  private axiosInstance_: AxiosInstance
  private logger_?: ShiprocketLogger
  private api_: DefaultApi

  constructor({ token, logger }: ShiprocketClientOptions = {}) {
    this.logger_ = logger

    const baseClient = axios.create({
      headers: {
        'content-type': 'application/json',
      },
    })

    this.axiosInstance_ = rateLimit(baseClient, {
      maxRequests: DEFAULT_RATE_LIMIT.maxRequests,
      perMilliseconds: DEFAULT_RATE_LIMIT.perMilliseconds,
    })

    axiosRetry(this.axiosInstance_, {
      retries: DEFAULT_RETRIES,
      retryDelay: axiosRetry.exponentialDelay,
    })

    const config = new Configuration({
      basePath: SHIPROCKET_BASE_URL,
    })

    this.api_ = new DefaultApi(config, SHIPROCKET_BASE_URL, this.axiosInstance_)

    if (token) {
      this.setToken(token)
    }
  }

  setToken = (token?: string) => {
    if (token) {
      this.axiosInstance_.defaults.headers.Authorization = `Bearer ${token}`
    } else {
      delete this.axiosInstance_.defaults.headers.Authorization
    }
  }

  private async handleError(error: any, errorMessage: string): Promise<never> {
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

  auth = {
    login: async (email: string, password: string): Promise<string> => {
      try {
        const { data } = await this.api_.login({ loginRequest: { email, password } })
        if (!(data as any)?.token) {
          throw new ShiprocketError('Shiprocket: Failed to refresh token.')
        }
        return (data as any).token
      } catch (err: any) {
        throw await this.handleError(err, 'Failed to authenticate with Shiprocket.')
      }
    }
  }

  orders = {
    retrieveById: async (id: string | number) => {
      try {
        const { data } = await this.api_.getOrder({ id: String(id) })
        return (data as any)?.data
      } catch (err: any) {
        throw await this.handleError(err, 'Failed to retrieve Shiprocket order.')
      }
    },
    createCustom: async (payload: any) => {
      try {
        const { data } = await this.api_.createCustomOrder({ body: payload })
        return data
      } catch (err: any) {
        throw await this.handleError(err, 'Failed to create Shiprocket order.')
      }
    },
    createForChannel: async (payload: any) => {
      try {
        const { data } = await this.api_.createChannelOrder({ body: payload })
        return data
      } catch (err: any) {
        throw await this.handleError(err, 'Failed to create Shiprocket order for channel.')
      }
    },
    cancelOrder: async (payload: any) => {
      try {
        const { data } = await this.api_.cancelOrder({ cancelOrderRequest: payload })
        return data
      } catch (err: any) {
        throw await this.handleError(err, 'Failed to cancel Shiprocket order.')
      }
    },
    cancelShipment: async (payload: any) => {
      try {
        const { data } = await this.api_.cancelShipment({ cancelShipmentRequest: payload })
        return (data as any)?.message
      } catch (err: any) {
        throw await this.handleError(err, 'Failed to cancel Shiprocket shipment.')
      }
    },
  }

  shipments = {
    retrieveById: async (id: string | number) => {
      try {
        const { data } = await this.api_.getShipment({ id: String(id) })
        return (data as any)?.data
      } catch (err: any) {
        throw await this.handleError(err, 'Failed to retrieve Shiprocket shipment.')
      }
    },
  }

  couriers = {
    retrieveAll: async (type: string) => {
      try {
        const { data } = await this.api_.getCouriers({ type })
        return (data as any)?.courier_data
      } catch (err: any) {
        throw await this.handleError(err, 'Failed to retrieve Shiprocket couriers.')
      }
    },
    getServiceability: async (payload: any) => {
      try {
        const { data } = await this.api_.getServiceability({
          pickupPostcode: payload.pickup_postcode,
          deliveryPostcode: payload.delivery_postcode,
          cod: payload.cod,
          weight: payload.weight,
          declaredValue: payload.declared_value
        })
        return (data as any)?.data
      } catch (err: any) {
        throw await this.handleError(err, 'Failed to retrieve Shiprocket serviceability.')
      }
    }
  }

  company = {
    retrieveAll: async () => {
      try {
        const { data } = await this.api_.getPickupLocations()
        return (data as any)?.data
      } catch (err: any) {
        throw await this.handleError(err, 'Failed to retrieve Shiprocket pickup locations.')
      }
    }
  }

  returns = {
    createReturn: async (payload: any) => {
      try {
        const { data } = await this.api_.createReturn({ body: payload })
        return data
      } catch (err: any) {
        throw await this.handleError(err, 'Failed to create Shiprocket return order.')
      }
    }
  }

  wrapper = {
    forward: async (payload: any) => {
      try {
        const { data } = await this.api_.createForwardShipment({ body: payload })
        return (data as any)?.payload
      } catch (err: any) {
        throw await this.handleError(err, 'Failed to create Shiprocket forward shipment.')
      }
    },
    reverse: async (payload: any) => {
      try {
        const { data } = await this.api_.createReturnShipment({ body: payload })
        return (data as any)?.payload
      } catch (err: any) {
        throw await this.handleError(err, 'Failed to create Shiprocket return shipment.')
      }
    }
  }
}

export default ShiprocketClient

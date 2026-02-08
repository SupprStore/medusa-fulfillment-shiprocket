import axios, { type AxiosInstance } from 'axios'

type ShiprocketOptions = {
  account?: string
  token?: string
}

type OrderEndpoints = {
  retrieveById: (id: string | number) => Promise<any>
  createCustom: (data: any) => Promise<any>
  createForChannel: (data: any) => Promise<any>
  cancelOrder: (data: any) => Promise<void>
  cancelShipment: (data: any) => Promise<any>
}

type ShipmentEndpoints = {
  retrieveById: (id: string | number) => Promise<any>
}

type CourierEndpoints = {
  retrieveAll: (type: string) => Promise<any>
  getServiceability: (data: any) => Promise<any>
}

type CompanyEndpoints = {
  retrieveAll: () => Promise<any>
}

type ReturnEndpoints = {
  createReturn: (data: any) => Promise<any>
}

type WrapperEndpoints = {
  forward: (data: any) => Promise<any>
  reverse: (data: any) => Promise<any>
}

class Shiprocket {
  private token_?: string
  private client_: AxiosInstance
  orders: OrderEndpoints
  shipments: ShipmentEndpoints
  couriers: CourierEndpoints
  company: CompanyEndpoints
  returns: ReturnEndpoints
  wrapper: WrapperEndpoints

  constructor({ account, token }: ShiprocketOptions = {}) {
    //this.account_ = account
    this.token_ = token
    this.client_ = axios.create({
      baseURL: `https://apiv2.shiprocket.in/v1/external`,
      headers: {
        'content-type': 'application/json',
      },
    })

    if (token) {
      this.client_.defaults.headers.Authorization = `Bearer ${token}`
    }

    // this.documents = this.buildDocumentEndpoints_()
    // this.shippingRates = this.buildShippingRateEndpoints_()
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

  buildOrderEndpoints_ = (): OrderEndpoints => {
    return {
      // retrieveAll: async () => {
      //   const path = `/orders`
      //   return this.client_({
      //     method: 'GET',
      //     url: path,
      //   }).then(({ data: {data:actualData} }) => actualData)
      // },
      retrieveById: async (id) => {
        const path = `/orders/show/${id}`
        return this.client_({
          method: 'GET',
          url: path,
        })
          .then(({ data: { data: actualData } }) => actualData)
          .catch((err) => {
            console.log(err.response.data)
            throw new Error('Shiprocket Order: Failed to retrieveById')
          })
      },
      // exportCSV: async (data) => {
      //   const path = `/v2/orders/export`
      //   return this.client_({
      //     method: 'POST',
      //     url: path,
      //   }).then(({data}) => data)
      // },
      createCustom: async (data) => {
        const path = `/orders/create/adhoc`
        return this.client_({
          method: 'POST',
          url: path,
          data: {
            ...data,
          },
        })
          .then(({ data }) => data)
          .catch((err) => {
            console.log(err.response.data)
            throw new Error('Shiprocket Order: Failed to createCustom')
          })
      },
      createForChannel: async (data) => {
        const path = `/orders/create`
        return this.client_({
          method: 'POST',
          url: path,
          data: {
            ...data,
          },
        })
          .then(({ data }) => data)
          .catch((err) => {
            console.log(err.response.data)
            throw new Error('Shiprocket Order: Failed to createForChannel')
          })
      },
      // updatePickup: async (data) => {
      //   const path = `/orders/address/pickup`
      //   return this.client_({
      //     method: 'PATCH',
      //     url: path,
      //     data: {
      //       data,
      //     },
      //   }).then(({ message }) => message)
      // },
      // updateDelivery: async (data) => {
      //   const path = `/orders/address/update`
      //   return this.client_({
      //     method: 'POST',
      //     url: path,
      //     data: {
      //       data,
      //     },
      //   }).then(() => {}) //This request doesn't return any response body
      // },
      // updateOrder: async (data) => {
      //   const path = `/orders/update/adhoc`
      //   return this.client_({
      //     method: 'POST',
      //     url: path,
      //     data: {
      //       data,
      //     },
      //   }).then(({data}) => data)
      // },
      cancelOrder: async (data) => {
        const path = `/orders/cancel`
        return this.client_({
          method: 'POST',
          url: path,
          data: {
            ...data,
          },
        })
          .then(() => {}) //This request doesn't return any response body
          .catch((err) => {
            console.log(err.response.data)
            throw new Error('Shiprocket Order: Failed to cancelOrder')
          })
      },
      // //Inventory sync mush be enabled to use this
      // addInventoryForOrdered: async (data) => {
      //   const path = `/orders/fulfill`
      //   return this.client_({
      //     method: 'PATCH',
      //     url: path,
      //     data: {
      //       data,
      //     },
      //   }).then(({data}) => data)
      // },
      // mapUnmapped: async (data) => {
      //   const path = `/orders/fulfill`
      //   return this.client_({
      //     method: 'PATCH',
      //     url: path,
      //     data: {
      //       data,
      //     },
      //   }).then(({data}) => data)
      // },
      // bulkImport: async (data) => {
      //   const path = `/orders/import`
      //   return this.client_({
      //     method: 'POST',
      //     url: path,
      //     data: {
      //       data,
      //     },
      //   }).then(({data}) => data)
      // },
      cancelShipment: async (data) => {
        const path = `orders/cancel/shipment/awbs`
        return this.client_({
          method: 'POST',
          url: path,
          data: {
            ...data,
          },
        })
          .then(({ message }) => message)
          .catch((err) => {
            console.log(err.response.data)
            throw new Error('Shiprocket Order: Failed to cancelShipment')
          })
      },
    }
  }

  buildShipmentEndpoints_ = (): ShipmentEndpoints => {
    return {
      retrieveById: async (id) => {
        const path = `/shipments/${id}`
        return this.client_({
          method: 'GET',
          url: path,
        })
          .then(({ data: { data: actualData } }) => actualData)
          .catch((err) => {
            console.log(err.response.data)
            throw new Error('Shiprocket Shipment: Failed to retrieveById')
          })
      },
      // retrieveAll: async () => {
      //   const path = `/shipments`
      //   return this.client_({
      //     method: 'GET',
      //     url: path,
      //   }).then(({ data: {data:actualData} }) => actualData)
      // },
    }
  }

  buildCourierEndpoints_ = (): CourierEndpoints => {
    return {
      // createAWB: async (data) => {
      //   const path = `/courier/assign/awb`
      //   return this.client_({
      //     method: 'POST',
      //     url: path,
      //     data: {
      //       data,
      //     },
      //   }).then(({data}) => data)
      // },
      retrieveAll: async (type) => {
        const path = `/courier/courierListWithCounts?type=${type}`
        return this.client_({
          method: 'GET',
          url: path,
        })
          .then(({ data: { courier_data } }) => courier_data)
          .catch((err) => {
            console.log(err.response.data)
            throw new Error('Shiprocket Courier: Failed to retrieveAll')
          })
      },
      getServiceability: async (data) => {
        const path = `/courier/serviceability`
        return this.client_({
          method: 'GET',
          url: path,
          params: {
            ...data,
          },
        })
          .then(({ data: { data: actualData } }) => actualData)
          .catch((err) => {
            console.log(err.response.data)
            throw new Error('Shiprocket Courier: Failed to getServiceability')
          })
      },
      // getIntServiceability: async (data) => {
      //   const path = `/courier/international/serviceability`
      //   return this.client_({
      //     method: 'GET',
      //     url: path,
      //     data: {
      //       data,
      //     },
      //   }).then(({ data: {data:actualData} }) => actualData)
      // },
      // createPickup: async (data) => {
      //   const path = `/courier/generate/pickup`
      //   return this.client_({
      //     method: 'POST',
      //     url: path,
      //     data: {
      //       data,
      //     },
      //   }).then(({data}) => data)
      // },
    }
  }

  buildCompanyEndpoints_ = (): CompanyEndpoints => {
    return {
      retrieveAll: async () => {
        const path = `/settings/company/pickup`
        return this.client_({
          method: 'GET',
          url: path,
        })
          .then(({ data: { data: actualData } }) => actualData)
          .catch((err) => {
            console.log(err.response.data)
            throw new Error(
              'Shiprocket Company: Failed to retrieveAll pickup locations'
            )
          })
      },
      // createLocation: async (data) => {
      //   const path = `/settings/company/addpickup`
      //   return this.client_({
      //     method: 'POST',
      //     url: path,
      //     data: {
      //       data,
      //     },
      //   }).then(({data}) => data)
      // },
    }
  }

  buildReturnEndpoints_ = (): ReturnEndpoints => {
    return {
      createReturn: async (data) => {
        const path = `/orders/create/return`
        return this.client_({
          method: 'POST',
          url: path,
          data: {
            ...data,
          },
        })
          .then(({ data }) => data)
          .catch((err) => {
            console.log(err.response.data)
            throw new Error('Shiprocket Return: Failed to createReturn')
          })
      },
      // retrieveAll: async () => {
      //   const path = `/orders/processing/return`
      //   return this.client_({
      //     method: 'GET',
      //     url: path,
      //   }).then(({ data: {data:actualData} }) => actualData)
      // },
    }
  }

  buildWrapperEndpoints_ = (): WrapperEndpoints => {
    return {
      forward: async (data) => {
        const path = `/shipments/create/forward-shipment`
        return this.client_({
          method: 'POST',
          url: path,
          data: {
            ...data,
          },
        })
          .then(({ data: { payload } }) => payload)
          .catch((err) => {
            console.log(err.response.data)
            throw new Error(
              'Shiprocket Wrapper: Failed to create forward shipment'
            )
          })
      },
      reverse: async (data) => {
        const path = `/shipments/create/return-shipment`
        return this.client_({
          method: 'POST',
          url: path,
          data: {
            ...data,
          },
        })
          .then(({ data: { payload } }) => payload)
          .catch((err) => {
            console.log(err.response.data)
            throw new Error(
              'Shiprocket Wrapper: Failed to create reverse shipment'
            )
          })
      },
    }
  }
}

export default Shiprocket

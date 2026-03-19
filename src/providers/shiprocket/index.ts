import { ModuleProvider, Modules } from '@medusajs/utils'
import ShiprocketFulfillmentProviderService from './service'

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [ShiprocketFulfillmentProviderService],
})

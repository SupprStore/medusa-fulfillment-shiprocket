import { ModuleProvider, Modules } from '@medusajs/utils'
import ShiprocketFulfillmentProviderService from './services/shiprocket'

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [ShiprocketFulfillmentProviderService],
})

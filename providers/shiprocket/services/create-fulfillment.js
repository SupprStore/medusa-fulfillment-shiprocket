"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createFulfillmentHandler = createFulfillmentHandler;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _helpers = require("../../../helpers");
function createFulfillmentHandler(_x, _x2, _x3, _x4, _x5) {
  return _createFulfillmentHandler.apply(this, arguments);
}
function _createFulfillmentHandler() {
  _createFulfillmentHandler = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(provider, data, items, order, fulfillment) {
    var _pickupLocations$ship;
    var fromOrder, billing_address, shipping_address, _fromOrder$metadata, metadata, isCOD, gstin, shipment_length, shipment_width, shipment_height, shipment_weight, fulfillmentItems, _yield$processShipmen, lengthInCM, widthInCM, heightInCM, shipmentWeight, pickupLocations, pickupLocation, courier_id, forwardData, response;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.next = 1;
          return provider.ensureToken_();
        case 1:
          fromOrder = order || (fulfillment === null || fulfillment === void 0 ? void 0 : fulfillment.order);
          if (fromOrder) {
            _context.next = 2;
            break;
          }
          throw new Error('Shiprocket: Missing order context for fulfillment.');
        case 2:
          billing_address = fromOrder.billing_address, shipping_address = fromOrder.shipping_address, _fromOrder$metadata = fromOrder.metadata, metadata = _fromOrder$metadata === void 0 ? {} : _fromOrder$metadata;
          if (!(!shipping_address || !billing_address)) {
            _context.next = 3;
            break;
          }
          throw new Error('Shiprocket: Missing shipping or billing address.');
        case 3:
          isCOD = metadata.isCOD, gstin = metadata.gstin, shipment_length = metadata.shipment_length, shipment_width = metadata.shipment_width, shipment_height = metadata.shipment_height, shipment_weight = metadata.shipment_weight;
          fulfillmentItems = items !== null && items !== void 0 && items.length ? items : fromOrder.items || [];
          _context.next = 4;
          return (0, _helpers.processShipmentData)(fulfillmentItems, provider.options_.length_unit, shipment_length, shipment_width, shipment_height, shipment_weight);
        case 4:
          _yield$processShipmen = _context.sent;
          lengthInCM = _yield$processShipmen.lengthInCM;
          widthInCM = _yield$processShipmen.widthInCM;
          heightInCM = _yield$processShipmen.heightInCM;
          shipmentWeight = _yield$processShipmen.shipmentWeight;
          _context.next = 5;
          return provider.client_.company.retrieveAll();
        case 5:
          pickupLocations = _context.sent;
          pickupLocation = pickupLocations === null || pickupLocations === void 0 ? void 0 : (_pickupLocations$ship = pickupLocations.shipping_address) === null || _pickupLocations$ship === void 0 ? void 0 : _pickupLocations$ship[0];
          if (pickupLocation) {
            _context.next = 6;
            break;
          }
          throw new Error('Shiprocket: No pickup location found.');
        case 6:
          courier_id = provider.resolveCourierId_(data);
          if (courier_id) {
            _context.next = 7;
            break;
          }
          throw new Error('Shiprocket: Courier ID missing from method data.');
        case 7:
          forwardData = {
            options: provider.options_,
            client: provider.client_,
            totalsService: provider.totalsService_,
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
            getCountryDisplayName: provider.getCountryDisplayName.bind(provider)
          };
          if (!(provider.options_.forward_action === 'create_fulfillment')) {
            _context.next = 12;
            break;
          }
          if (!((items === null || items === void 0 ? void 0 : items.length) > 1 && provider.options_.multiple_items === 'split_shipment')) {
            _context.next = 9;
            break;
          }
          provider.logger_.warn("Shiprocket: Split shipments can't be created via API. Creating a Shiprocket Order instead.");
          _context.next = 8;
          return (0, _helpers.forwardOrder)(forwardData);
        case 8:
          response = _context.sent;
          _context.next = 11;
          break;
        case 9:
          _context.next = 10;
          return (0, _helpers.forwardFulfillment)(forwardData);
        case 10:
          response = _context.sent;
        case 11:
          _context.next = 14;
          break;
        case 12:
          _context.next = 13;
          return (0, _helpers.forwardOrder)(forwardData);
        case 13:
          response = _context.sent;
        case 14:
          return _context.abrupt("return", {
            data: response,
            labels: []
          });
        case 15:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _createFulfillmentHandler.apply(this, arguments);
}
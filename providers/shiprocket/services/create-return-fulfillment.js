"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createReturnFulfillmentHandler = createReturnFulfillmentHandler;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _helpers = require("../../../helpers");
function createReturnFulfillmentHandler(_x, _x2, _x3, _x4, _x5) {
  return _createReturnFulfillmentHandler.apply(this, arguments);
}
function _createReturnFulfillmentHandler() {
  _createReturnFulfillmentHandler = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(provider, data, items, order, returnRequest) {
    var _returnRequest$shippi, _pickupLocations$ship;
    var fromOrder, methodData, courier_id, shipping_address, _fromOrder$metadata, metadata, shipment_length, shipment_width, shipment_height, shipment_weight, _yield$processShipmen, lengthInCM, widthInCM, heightInCM, shipmentWeight, pickupLocations, pickupLocation, orderDiscountTotal, returnItems, reverseData, response, _fromOrder$items;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.next = 1;
          return provider.ensureToken_();
        case 1:
          fromOrder = order || (returnRequest === null || returnRequest === void 0 ? void 0 : returnRequest.order);
          if (fromOrder) {
            _context.next = 2;
            break;
          }
          throw new Error('Shiprocket: Missing order context for return fulfillment.');
        case 2:
          methodData = data || (returnRequest === null || returnRequest === void 0 ? void 0 : (_returnRequest$shippi = returnRequest.shipping_method) === null || _returnRequest$shippi === void 0 ? void 0 : _returnRequest$shippi.data) || (returnRequest === null || returnRequest === void 0 ? void 0 : returnRequest.shipping_method);
          courier_id = provider.resolveCourierId_(methodData);
          if (courier_id) {
            _context.next = 3;
            break;
          }
          throw new Error('Shiprocket: Courier ID missing from return method data.');
        case 3:
          shipping_address = fromOrder.shipping_address, _fromOrder$metadata = fromOrder.metadata, metadata = _fromOrder$metadata === void 0 ? {} : _fromOrder$metadata;
          if (shipping_address) {
            _context.next = 4;
            break;
          }
          throw new Error('Shiprocket: Missing shipping address for return.');
        case 4:
          shipment_length = metadata.shipment_length, shipment_width = metadata.shipment_width, shipment_height = metadata.shipment_height, shipment_weight = metadata.shipment_weight;
          _context.next = 5;
          return (0, _helpers.processShipmentData)(items !== null && items !== void 0 && items.length ? items : fromOrder.items, provider.options_.length_unit, shipment_length, shipment_width, shipment_height, shipment_weight);
        case 5:
          _yield$processShipmen = _context.sent;
          lengthInCM = _yield$processShipmen.lengthInCM;
          widthInCM = _yield$processShipmen.widthInCM;
          heightInCM = _yield$processShipmen.heightInCM;
          shipmentWeight = _yield$processShipmen.shipmentWeight;
          _context.next = 6;
          return provider.client_.company.retrieveAll();
        case 6:
          pickupLocations = _context.sent;
          pickupLocation = pickupLocations === null || pickupLocations === void 0 ? void 0 : (_pickupLocations$ship = pickupLocations.shipping_address) === null || _pickupLocations$ship === void 0 ? void 0 : _pickupLocations$ship[0];
          if (pickupLocation) {
            _context.next = 7;
            break;
          }
          throw new Error('Shiprocket: No pickup location found.');
        case 7:
          orderDiscountTotal = Number(fromOrder.discount_total || 0);
          returnItems = items !== null && items !== void 0 && items.length ? items : fromOrder.items;
          reverseData = {
            options: provider.options_,
            client: provider.client_,
            totalsService: provider.totalsService_,
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
            getCountryDisplayName: provider.getCountryDisplayName.bind(provider)
          };
          if (!(provider.options_.return_action === 'create_fulfillment')) {
            _context.next = 12;
            break;
          }
          if (!(((items === null || items === void 0 ? void 0 : items.length) || ((_fromOrder$items = fromOrder.items) === null || _fromOrder$items === void 0 ? void 0 : _fromOrder$items.length) || 0) > 1 && provider.options_.multiple_items === 'split_shipment')) {
            _context.next = 9;
            break;
          }
          provider.logger_.warn("Shiprocket: Split shipments can't be created via API. Creating a Shiprocket Return Order instead.");
          _context.next = 8;
          return (0, _helpers.reverseOrder)(reverseData);
        case 8:
          response = _context.sent;
          _context.next = 11;
          break;
        case 9:
          _context.next = 10;
          return (0, _helpers.reverseFulfillment)(reverseData);
        case 10:
          response = _context.sent;
        case 11:
          _context.next = 14;
          break;
        case 12:
          _context.next = 13;
          return (0, _helpers.reverseOrder)(reverseData);
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
  return _createReturnFulfillmentHandler.apply(this, arguments);
}
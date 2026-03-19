"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.calculatePriceHandler = calculatePriceHandler;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _amounts = require("../../../utils/amounts");
function calculatePriceHandler(_x, _x2, _x3, _x4) {
  return _calculatePriceHandler.apply(this, arguments);
}
function _calculatePriceHandler() {
  _calculatePriceHandler = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(provider, optionData, _data, context) {
    var _pickupLocations$ship, _context$items, _context$items$, _context$shipping_add, _context$shipping_add2, _context$subtotal, _context$metadata, _resp$available_couri, _selOpt$;
    var items, shipmentWeight, pickupLocations, pickupLocation, isReturn, pickupPostcode, deliveryPostcode, declaredValue, resp, selOpt, rate;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (!(provider.options_.pricing === 'flat_rate')) {
            _context.next = 1;
            break;
          }
          throw new Error('Shiprocket: Pricing strategy is set to flat_rate');
        case 1:
          _context.next = 2;
          return provider.ensureToken_();
        case 2:
          items = (context === null || context === void 0 ? void 0 : context.items) || [];
          shipmentWeight = items.reduce(function (acc, item) {
            return acc + provider.getItemWeightInKg_(item);
          }, 0);
          _context.next = 3;
          return provider.client_.company.retrieveAll();
        case 3:
          pickupLocations = _context.sent;
          pickupLocation = pickupLocations === null || pickupLocations === void 0 ? void 0 : (_pickupLocations$ship = pickupLocations.shipping_address) === null || _pickupLocations$ship === void 0 ? void 0 : _pickupLocations$ship[0];
          if (pickupLocation) {
            _context.next = 4;
            break;
          }
          throw new Error('Shiprocket: No pickup location found.');
        case 4:
          isReturn = Boolean((context === null || context === void 0 ? void 0 : (_context$items = context.items) === null || _context$items === void 0 ? void 0 : (_context$items$ = _context$items[0]) === null || _context$items$ === void 0 ? void 0 : _context$items$.is_return) || (context === null || context === void 0 ? void 0 : context.is_return));
          pickupPostcode = isReturn ? pickupLocation.pin_code : context === null || context === void 0 ? void 0 : (_context$shipping_add = context.shipping_address) === null || _context$shipping_add === void 0 ? void 0 : _context$shipping_add.postal_code;
          deliveryPostcode = isReturn ? context === null || context === void 0 ? void 0 : (_context$shipping_add2 = context.shipping_address) === null || _context$shipping_add2 === void 0 ? void 0 : _context$shipping_add2.postal_code : pickupLocation.pin_code;
          if (!(!pickupPostcode || !deliveryPostcode)) {
            _context.next = 5;
            break;
          }
          throw new Error('Shiprocket: Missing pickup or delivery postal code for rate calculation.');
        case 5:
          declaredValue = (0, _amounts.normalizeAmount)((_context$subtotal = context === null || context === void 0 ? void 0 : context.subtotal) !== null && _context$subtotal !== void 0 ? _context$subtotal : (0, _amounts.sumLineItemTotals)(items), context === null || context === void 0 ? void 0 : context.currency_code);
          _context.next = 6;
          return provider.client_.couriers.getServiceability({
            pickup_postcode: parseInt(pickupPostcode),
            delivery_postcode: parseInt(deliveryPostcode),
            cod: context !== null && context !== void 0 && (_context$metadata = context.metadata) !== null && _context$metadata !== void 0 && _context$metadata.isCOD ? true : false,
            weight: shipmentWeight,
            declared_value: declaredValue
          });
        case 6:
          resp = _context.sent;
          selOpt = resp === null || resp === void 0 ? void 0 : (_resp$available_couri = resp.available_courier_companies) === null || _resp$available_couri === void 0 ? void 0 : _resp$available_couri.filter(function (opt) {
            return opt.courier_company_id === optionData.id;
          });
          rate = (selOpt === null || selOpt === void 0 ? void 0 : (_selOpt$ = selOpt[0]) === null || _selOpt$ === void 0 ? void 0 : _selOpt$.rate) || 0;
          return _context.abrupt("return", {
            calculated_amount: Math.round(rate * 100),
            is_calculated_price_tax_inclusive: false
          });
        case 7:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _calculatePriceHandler.apply(this, arguments);
}
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cancelFulfillmentHandler = cancelFulfillmentHandler;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
function cancelFulfillmentHandler(_x, _x2) {
  return _cancelFulfillmentHandler.apply(this, arguments);
}
function _cancelFulfillmentHandler() {
  _cancelFulfillmentHandler = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee(provider, data) {
    var _data$data, _data$data2, _data$data3;
    var shipmentId, awbCode, orderId, shipmentDetails;
    return _regenerator["default"].wrap(function (_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.next = 1;
          return provider.ensureToken_();
        case 1:
          shipmentId = (data === null || data === void 0 ? void 0 : data.shipment_id) || (data === null || data === void 0 ? void 0 : (_data$data = data.data) === null || _data$data === void 0 ? void 0 : _data$data.shipment_id);
          awbCode = (data === null || data === void 0 ? void 0 : data.awb_code) || (data === null || data === void 0 ? void 0 : (_data$data2 = data.data) === null || _data$data2 === void 0 ? void 0 : _data$data2.awb_code);
          orderId = (data === null || data === void 0 ? void 0 : data.order_id) || (data === null || data === void 0 ? void 0 : (_data$data3 = data.data) === null || _data$data3 === void 0 ? void 0 : _data$data3.order_id);
          if (shipmentId) {
            _context.next = 2;
            break;
          }
          throw new Error('Shiprocket: Unable to cancel shipment. shipment_id not found.');
        case 2:
          _context.next = 3;
          return provider.client_.shipments.retrieveById(shipmentId);
        case 3:
          shipmentDetails = _context.sent;
          if (!(shipmentDetails.status > 5 && shipmentDetails.status !== 11)) {
            _context.next = 4;
            break;
          }
          throw new Error('Shiprocket: Shipment has already been shipped, cannot be cancelled.');
        case 4:
          if (!awbCode) {
            _context.next = 5;
            break;
          }
          _context.next = 5;
          return provider.client_.orders.cancelShipment({
            awbs: [awbCode]
          });
        case 5:
          if (!orderId) {
            _context.next = 6;
            break;
          }
          _context.next = 6;
          return provider.client_.orders.cancelOrder({
            ids: [orderId]
          });
        case 6:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _cancelFulfillmentHandler.apply(this, arguments);
}
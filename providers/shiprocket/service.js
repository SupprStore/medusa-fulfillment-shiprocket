"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));
var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _axios = _interopRequireDefault(require("axios"));
var _utils = require("@medusajs/utils");
var _shiprocket = _interopRequireDefault(require("../../utils/shiprocket"));
var _calculatePrice2 = require("./services/calculate-price");
var _createFulfillment2 = require("./services/create-fulfillment");
var _createReturnFulfillment2 = require("./services/create-return-fulfillment");
var _cancelFulfillment2 = require("./services/cancel-fulfillment");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _callSuper(t, o, e) { return o = (0, _getPrototypeOf2["default"])(o), (0, _possibleConstructorReturn2["default"])(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], (0, _getPrototypeOf2["default"])(t).constructor) : o.apply(t, e)); }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
var TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;
var ShiprocketFulfillmentProviderService = /*#__PURE__*/function (_AbstractFulfillmentP) {
  function ShiprocketFulfillmentProviderService(container, options) {
    var _this;
    (0, _classCallCheck2["default"])(this, ShiprocketFulfillmentProviderService);
    _this = _callSuper(this, ShiprocketFulfillmentProviderService, [container, options]);
    _this.options_ = options || {};
    _this.logger_ = (container === null || container === void 0 ? void 0 : container.logger) || console;
    _this.totalsService_ = container === null || container === void 0 ? void 0 : container.totalsService;
    _this.client_ = new _shiprocket["default"]({
      token: _this.options_.token
    });
    _this.token_ = _this.options_.token;
    _this.tokenExpiresAt_ = _this.token_ ? new Date(Date.now() + TOKEN_TTL_MS) : null;
    _this.auth_ = {
      email: _this.options_.email,
      password: _this.options_.password
    };
    _this.regionNames_ = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['en'], {
      type: 'region'
    }) : null;
    return _this;
  }
  (0, _inherits2["default"])(ShiprocketFulfillmentProviderService, _AbstractFulfillmentP);
  return (0, _createClass2["default"])(ShiprocketFulfillmentProviderService, [{
    key: "getCountryDisplayName",
    value: function getCountryDisplayName(alpha2) {
      if (!alpha2) return '';
      if (!this.regionNames_) return alpha2.toUpperCase();
      return this.regionNames_.of(alpha2.toUpperCase()) || alpha2.toUpperCase();
    }
  }, {
    key: "resolveCourierId_",
    value: function resolveCourierId_(data) {
      var _data$data, _data$data2, _data$data3;
      if (!data) return undefined;
      return data.id || data.courier_id || data.courier_company_id || ((_data$data = data.data) === null || _data$data === void 0 ? void 0 : _data$data.id) || ((_data$data2 = data.data) === null || _data$data2 === void 0 ? void 0 : _data$data2.courier_id) || ((_data$data3 = data.data) === null || _data$data3 === void 0 ? void 0 : _data$data3.courier_company_id);
    }
  }, {
    key: "refreshToken_",
    value: function () {
      var _refreshToken_ = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee() {
        var _yield$axios$post, data, token;
        return _regenerator["default"].wrap(function (_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              if (!(!this.auth_.email || !this.auth_.password)) {
                _context2.next = 2;
                break;
              }
              if (this.token_) {
                _context2.next = 1;
                break;
              }
              throw new Error('Shiprocket: Missing credentials. Provide email/password or a valid token.');
            case 1:
              return _context2.abrupt("return");
            case 2:
              _context2.next = 3;
              return _axios["default"].post('https://apiv2.shiprocket.in/v1/external/auth/login', {
                email: this.auth_.email,
                password: this.auth_.password
              });
            case 3:
              _yield$axios$post = _context2.sent;
              data = _yield$axios$post.data;
              token = data === null || data === void 0 ? void 0 : data.token;
              if (token) {
                _context2.next = 4;
                break;
              }
              throw new Error('Shiprocket: Failed to refresh token.');
            case 4:
              this.token_ = token;
              this.client_.setToken(token);
              this.tokenExpiresAt_ = new Date(Date.now() + TOKEN_TTL_MS);
            case 5:
            case "end":
              return _context2.stop();
          }
        }, _callee, this);
      }));
      function refreshToken_() {
        return _refreshToken_.apply(this, arguments);
      }
      return refreshToken_;
    }()
  }, {
    key: "ensureToken_",
    value: function () {
      var _ensureToken_ = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee2() {
        return _regenerator["default"].wrap(function (_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              if (!(this.token_ && (!this.tokenExpiresAt_ || Date.now() < this.tokenExpiresAt_.getTime()))) {
                _context3.next = 1;
                break;
              }
              return _context3.abrupt("return");
            case 1:
              _context3.next = 2;
              return this.refreshToken_();
            case 2:
            case "end":
              return _context3.stop();
          }
        }, _callee2, this);
      }));
      function ensureToken_() {
        return _ensureToken_.apply(this, arguments);
      }
      return ensureToken_;
    }()
  }, {
    key: "getItemWeightInKg_",
    value: function getItemWeightInKg_(item) {
      var _ref, _variant$weight;
      var variant = (item === null || item === void 0 ? void 0 : item.variant) || (item === null || item === void 0 ? void 0 : item.product_variant) || (item === null || item === void 0 ? void 0 : item.productVariant);
      var weight = (_ref = (_variant$weight = variant === null || variant === void 0 ? void 0 : variant.weight) !== null && _variant$weight !== void 0 ? _variant$weight : item === null || item === void 0 ? void 0 : item.weight) !== null && _ref !== void 0 ? _ref : 0;
      return Number(weight || 0) / 1000;
    }
  }, {
    key: "getFulfillmentOptions",
    value: function () {
      var _getFulfillmentOptions = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee3() {
        return _regenerator["default"].wrap(function (_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              _context4.next = 1;
              return this.ensureToken_();
            case 1:
              _context4.next = 2;
              return this.client_.couriers.retrieveAll('active');
            case 2:
              return _context4.abrupt("return", _context4.sent);
            case 3:
            case "end":
              return _context4.stop();
          }
        }, _callee3, this);
      }));
      function getFulfillmentOptions() {
        return _getFulfillmentOptions.apply(this, arguments);
      }
      return getFulfillmentOptions;
    }()
  }, {
    key: "validateOption",
    value: function () {
      var _validateOption = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee4(data) {
        var allOpts, selectedOpt;
        return _regenerator["default"].wrap(function (_context5) {
          while (1) switch (_context5.prev = _context5.next) {
            case 0:
              _context5.next = 1;
              return this.ensureToken_();
            case 1:
              _context5.next = 2;
              return this.client_.couriers.retrieveAll('active');
            case 2:
              allOpts = _context5.sent;
              selectedOpt = allOpts.find(function (opt) {
                return opt.id === data.id;
              });
              return _context5.abrupt("return", !!selectedOpt);
            case 3:
            case "end":
              return _context5.stop();
          }
        }, _callee4, this);
      }));
      function validateOption(_x) {
        return _validateOption.apply(this, arguments);
      }
      return validateOption;
    }()
  }, {
    key: "validateFulfillmentData",
    value: function validateFulfillmentData(optionData, data, _context) {
      return _objectSpread(_objectSpread({}, optionData), data);
    }
  }, {
    key: "canCalculate",
    value: function () {
      var _canCalculate = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee5(_data) {
        return _regenerator["default"].wrap(function (_context6) {
          while (1) switch (_context6.prev = _context6.next) {
            case 0:
              return _context6.abrupt("return", this.options_.pricing === 'calculated');
            case 1:
            case "end":
              return _context6.stop();
          }
        }, _callee5, this);
      }));
      function canCalculate(_x2) {
        return _canCalculate.apply(this, arguments);
      }
      return canCalculate;
    }()
  }, {
    key: "calculatePrice",
    value: function () {
      var _calculatePrice = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee6(optionData, _data, context) {
        return _regenerator["default"].wrap(function (_context7) {
          while (1) switch (_context7.prev = _context7.next) {
            case 0:
              return _context7.abrupt("return", (0, _calculatePrice2.calculatePriceHandler)(this, optionData, _data, context));
            case 1:
            case "end":
              return _context7.stop();
          }
        }, _callee6, this);
      }));
      function calculatePrice(_x3, _x4, _x5) {
        return _calculatePrice.apply(this, arguments);
      }
      return calculatePrice;
    }()
  }, {
    key: "createFulfillment",
    value: function () {
      var _createFulfillment = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee7(data, items, order, fulfillment) {
        return _regenerator["default"].wrap(function (_context8) {
          while (1) switch (_context8.prev = _context8.next) {
            case 0:
              return _context8.abrupt("return", (0, _createFulfillment2.createFulfillmentHandler)(this, data, items, order, fulfillment));
            case 1:
            case "end":
              return _context8.stop();
          }
        }, _callee7, this);
      }));
      function createFulfillment(_x6, _x7, _x8, _x9) {
        return _createFulfillment.apply(this, arguments);
      }
      return createFulfillment;
    }()
  }, {
    key: "createReturnFulfillment",
    value: function () {
      var _createReturnFulfillment = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee8(data, items, order, returnRequest) {
        return _regenerator["default"].wrap(function (_context9) {
          while (1) switch (_context9.prev = _context9.next) {
            case 0:
              return _context9.abrupt("return", (0, _createReturnFulfillment2.createReturnFulfillmentHandler)(this, data, items, order, returnRequest));
            case 1:
            case "end":
              return _context9.stop();
          }
        }, _callee8, this);
      }));
      function createReturnFulfillment(_x0, _x1, _x10, _x11) {
        return _createReturnFulfillment.apply(this, arguments);
      }
      return createReturnFulfillment;
    }()
  }, {
    key: "cancelFulfillment",
    value: function () {
      var _cancelFulfillment = (0, _asyncToGenerator2["default"])(/*#__PURE__*/_regenerator["default"].mark(function _callee9(data) {
        return _regenerator["default"].wrap(function (_context0) {
          while (1) switch (_context0.prev = _context0.next) {
            case 0:
              return _context0.abrupt("return", (0, _cancelFulfillment2.cancelFulfillmentHandler)(this, data));
            case 1:
            case "end":
              return _context0.stop();
          }
        }, _callee9, this);
      }));
      function cancelFulfillment(_x12) {
        return _cancelFulfillment.apply(this, arguments);
      }
      return cancelFulfillment;
    }()
  }]);
}(_utils.AbstractFulfillmentProviderService);
(0, _defineProperty2["default"])(ShiprocketFulfillmentProviderService, "identifier", 'shiprocket');
var _default = exports["default"] = ShiprocketFulfillmentProviderService;
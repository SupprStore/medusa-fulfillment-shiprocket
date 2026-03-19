"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _utils = require("@medusajs/framework/utils");
var _service = _interopRequireDefault(require("./service"));
var _default = exports["default"] = (0, _utils.ModuleProvider)(_utils.Modules.FULFILLMENT, {
  services: [_service["default"]]
});
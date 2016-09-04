'use strict';

var AppsService = require('./AppsService');

module.exports.registerApp = function registerApp(req, res, next) {
  AppsService.registerApp(req, res, next);
};

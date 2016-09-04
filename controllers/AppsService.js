'use strict';

var url = require('url');

var App = require('../models/App');

var events = require("events");
var swaggerHelpers = require('../libs/swagger-helpers');
var cryptoHelpers = require('../libs/crypto-helpers');
var societyclient = require('../libs/societyclient');
var logger = require("loglevel");
var EventEmitter = require('events').EventEmitter;

// When we submit an appication it can take a long time
var submitApplicationProcess = new EventEmitter();

/**
 * Offline processing of an application should be handled here. Ensure that the
 * processing status is updated when you are done.
 */
submitApplicationProcess.on('submit-application', function (application) {
  societyclient.sendMessage(application.data.id);
});

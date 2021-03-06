'use strict';
var express = require("express");
var fs = require("fs");
var path = require("path");
var bodyParser = require("body-parser");

var environment = process.env.NODE_ENV || 'development';
exports.environment = environment;

var EventEmitter = require('events').EventEmitter;
var societyclient = require('./libs/societyclient');
var credential = require('./model/Credential');
var applicationStore = require('./libs/salesforceConnect');
var fetchBasicAuthFromDatabase = {};
var fetchBasicAuthFromConfig = {};

// When we submit an appication it can take a long time
var submitApplicationProcess = new EventEmitter();

/**
 * Offline processing of an application should be handled here. Ensure that the
 * processing status is updated when you are done.
 */
submitApplicationProcess.on('submit-application', function (application) {
  //console.log(" submit submitApplicationProcess ", application)
    applicationStore.saveApplication(application); //A131909 A130016
});

var app = express();
var basicAuth = require('basic-auth');
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());

// Initialize the app.
var server = app.listen(process.env.PORT || 8080, function () {
  var port = server.address().port;
  console.log("Origination Application now running on port", port);
});

console.log(" NODE ENV ", environment);
// Validate Basic Authenticatation details for Config JSON
fetchBasicAuthFromConfig = () => {

  var configuration = JSON.parse(
    fs.readFileSync('./config/configs.js')
  );


  var user = configuration[environment].apiKeys.username;
  var pass = configuration[environment].apiKeys.password;
  return new Promise(function (resolve, reject) {
    credential.username = user;
    credential.client_secret = pass;
    resolve(credential);
  });
}


var auth = function (req, res, next) {
  var user = basicAuth(req);
  fetchBasicAuthFromConfig().then(accessToken => {
    if (!user || !user.name || !user.pass) {
      res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
      res.sendStatus(401);
      return;
    }
    if (user.name == accessToken.username && user.pass == accessToken.client_secret) {
      console.log("User Authenticated.");
      next();
    } else {
      res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
      res.sendStatus(401);
      return;
    }
  });
}

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({ "error": message });
}

// Generic Success handler used by all endpoints.
function handleSucess(res, reason, message, code) {
  console.log("SUCCESS: " + reason);
  res.status(code || 201).json({ "success": message });
}



app.all("/*", auth);

app.post("/api/v0/application", function (req, res) {
  var newContact = req.body;
  var app = req.body.id;
  var content = req.body.content;
  console.log("Origination Application Notification Received:", app);
  //newContact.createDate = new Date();
  console.log("ID: " + req.body);
  console.log("UNIQUE ID : " + req.body.uniqueId);
  console.log("SESION ID : " + req.body.sessionId);
  console.log("leadSource: " + req.body.leadSource);
  console.log("sourceId: " + req.body.sourceId);
  //console.log(req.headers['content-type']);
  if (!(req.body.uniqueId || req.body.sessionId)) {
    handleError(res, "Invalid user input", "Must provide a Unique ID  or Valid Session ID.", 400);
    //res.status(400).send("Invalid user input");
  } else if (req.body.optOut == true) {
    handleError(res, "Opt Out is true", "Exclude these leads from entering Salesforce", 400);
  }
  else {
    console.log("In ELSE UNIQUE ID : " + req.body.uniqueId);
    console.log("In ELSE  SESION ID : " + req.body.sessionId);
    console.log("In ELSE  leadSource: " + req.body.leadSource);
    console.log("In ELSE  sourceId: " + req.body.sourceId);

    if (req.body.callbackTime == 'online') {
      return new Promise(function (resolve, reject) {
        applicationStore.saveOnlineApplication(req, res, function (err, response) {
          if (err) {
            reject(err);
          } else {
            resolve(response);
            //handleSucess(response, "notification done", 201);
          }
        }, {
            timeout: 5000
          }, {
            time: true
          });
      });

    } else {
      submitApplicationProcess.emit('submit-application', req);
      //emit sync response
      handleSucess(res, "notification done", 201);
      res.end();
    }

  }



});
module.exports = app;
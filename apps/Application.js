'use strict';

var EventEmitter = require('events').EventEmitter;
//var societyclient = require('./libs/societyclient');
//var credential = require('./model/Credential');
var basicAuth = require('basic-auth');
var fetchBasicAuthFromDatabase = {};
var fetchBasicAuthFromConfig = {};
var express = require("express");
const bodyParser = require("body-parser");
// When we submit an appication it can take a long time
var submitApplicationProcess = new EventEmitter();

/**
 * Offline processing of an application should be handled here. Ensure that the
 * processing status is updated when you are done.
 */
submitApplicationProcess.on('submit-application', function (application) {
    console.log(" submit submitApplicationProcess ", application);
    //societyclient.sendMessage(application); //A131909 A130016
});



var app = express();
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());

// Validate Basic Authenticatation details for Config JSON
fetchBasicAuthFromConfig = () => {

    var configuration = JSON.parse(
        fs.readFileSync('./config/configs.js')
    );

    console.log(" NODE ENV ", environment);
    var user = configuration[environment].apiKeys.username;
    var pass = configuration[environment].apiKeys.password;
    return new Promise(function (resolve, reject) {
        credential.username = user;
        credential.client_secret = pass;
        console.log("user name ::", credential.username);
        console.log("pass code ::", credential.client_secret);
        resolve(credential);
    });
}

var auth = function (req, res, next) {
    var user = basicAuth(req);
    fetchBasicAuthFromConfig().then(accessToken => {
        console.log("user.name: ", user.name);
        console.log("user.pass: ", user.pass);
        console.log("credential.username: ", accessToken.username);
        console.log("credential.client_secret: ", accessToken.client_secret);

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
    console.log("Society One Application Notification Received:", app);
    //newContact.createDate = new Date();
    console.log("ID: " + req.body);
    //console.log(req.headers['content-type']);
    if (!(req.body.sessionId || req.body.uniqueId)) {
        handleError(res, "Invalid user input", "Must provide a S1 app ID or content.", 400);
        //res.status(400).send("Invalid user input");
    } else {
        console.log("sessionId : " + req.body.sessionId);
        console.log("uniqueId : " + req.body.uniqueId);
        console.log("sourceId : " + req.body.sourceId);
        console.log("leadSource : " + req.body.leadSource);
        //emit sync response
        handleSucess(res, "notification done", 201);
        //then emit save application to PG
        //submitApplicationProcess.emit('submit-application', app);
        res.end();
    }
});
module.exports = app;


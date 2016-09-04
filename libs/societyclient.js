'use strict';

var mockEnabled = process.env.MOCK_ENABLED || 'yes';
var request = require("request");
var https = require('https');
var clienttokens = '';
var parsedresponsedata = '';
var responsedata = '';
var fs = require('fs');
var querystring = require('querystring');
var body = '';
var parsed = '';
var accesstoken = '';
var bodyforapplication = '';
var env = require('../server');
var applicationStore = require('./salesforceConnect');
var applicationResourceURL = '';
var EventEmitter = require('events').EventEmitter;

// When we submit an appication it can take a long time
var saveApplication = new EventEmitter();

/**
 * Offline processing of an application should be handled here. Ensure that the
 * processing status is updated when you are done.
 */
saveApplication.on('save-application', function (application) {
	//save application
	applicationStore.saveApplication(application);
});

//mockEnabled
function applicationResource(accesstoken, applicationNumber, quotaguardstaticURL ,applicationResourceAPI) {
	console.log(" Access Token Inside Application Resource API Call ", accesstoken);
	console.log(" Application Number Inside Application Resource API Call ", applicationNumber);
	if (mockEnabled == 'yes') {
		applicationResourceURL = 'http://www.mocky.io/v2/' + applicationNumber;
	} else {
		applicationResourceURL = applicationResourceAPI + applicationNumber;
	}
	console.log(" applicationResourceURL ======= ", applicationResourceURL);
    var optionsget = {
		proxy: quotaguardstaticURL,
		//url: 'https://uat2-api.clearmatch.co/v1/unsecuredLoans/application/' + applicationNumber,
		//url: 'http://www.mocky.io/v2/' + applicationNumber,
		url: applicationResourceURL,
		method: 'GET',
		headers: {
			'Authorization': 'Bearer ' + accesstoken,
			//'Content-Length': '450000',
		}
	};

	function societyoneApplicationService(error, response, body) {
		//console.log(" response ", response);
		console.log(" response ", response.statusCode);
		if (!error && response.statusCode == 200) {
			parsedresponsedata = JSON.parse(body);
			saveApplication.emit('save-application', parsedresponsedata);
			//console.info('parsedresponsedata : ', parsedresponsedata);
			var status = parsedresponsedata.applicationStatus;
		}
		if (response.statusCode == 400) {
			console.info('societyoneApplicationService : User does not have permissions to the application :', applicationNumber);
		}
	}

    request(optionsget, societyoneApplicationService);

}

exports.sendMessage = (applicationNumber) => {
	console.log("Application Number in SocietyOne Client Code ", applicationNumber);
	var access_token = null;
	var expires_in = null;
	var configuration = JSON.parse(
		fs.readFileSync('./config/configs.js')
	);
    console.log(" NODE ENV IN EXPORT APPS", env.environment);

	var clientID = configuration[env.environment].messages.client_id;
	var clientSecret = configuration[env.environment].messages.client_secret;
	var userName = configuration[env.environment].messages.username;
	var passwordValue = configuration[env.environment].messages.password;
	var notificationAPI = configuration[env.environment].messages.notificationURL;
	var applicationResourceAPI = configuration[env.environment].messages.applicationResourceURL;
	var quotaguardstaticURL = configuration[env.environment].messages.quotaguardstaticURL;

	console.log(" quotaguardstaticURL " ,quotaguardstaticURL);
console.log(" applicationResourceAPI " ,applicationResourceAPI);
	//return new Promise(function (resolve, reject) {

	var postData = querystring.stringify({
		'client_id': clientID,
		'client_secret': clientSecret,
		'grant_type': 'password',
		'username': userName,
		'password': passwordValue,
		'scope': 'api',
	})

	var options = {
		proxy: quotaguardstaticURL,
		url: notificationAPI ,//'https://uat2-identityservice.clearmatch.co/connect/token',
		body: postData,
		method: 'POST',
		headers: {
			'User-Agent': 'node.js'
		}
	};

	function tokenService(error, response, body) {
		//console.log(" Response code for Token Service ::", response.statusCode);
		if (!error && response.statusCode == 200) {
			//console.log(body);
			parsed = JSON.parse(body);
			access_token = parsed.access_token;
			expires_in = parsed.expires_in;
			console.log("access token Value : ", access_token);
			console.log("access token Expire : ", expires_in);
			applicationResource(access_token, applicationNumber,quotaguardstaticURL,applicationResourceAPI);
		}
		if (error) {
			console.log(error);
		}
	}

	request(options, tokenService);
	//});
}




var nforce = require('nforce');
var truncate = require('truncate');
var replace = require('replace');
var dateFormat = require('dateformat');
var fs = require("fs");
var env = require('../server');
var jsonfile = require('jsonfile')

var app = {};
var applicant = {};
var loanPurpose = {};
var acccount = {};
var document = {};
var attachment = {};

//Status field 
var oauth;
var applicationStatusFlag = true;
var applicantStatusFlag = true;
var loanPurposeFlag = true;
var statusMessage = '';
var configuration = '';
var org = '';
var branchLookup = '';
var brandLookup = '';
var productLookup = '';

var oppertunity = '';
var account = '';
var document = '';
var attachment = '';


/* This function will perform tarnsformation for complete Opportunity Data receieved from 3rd Party */
createOpportunity = (application) => {
  console.log(' START oppertunity Object  :');
  var oppertunity = nforce.createSObject('Opportunity');
  var closeDate = dateFormat('11/10/2018', "yyyy-mm-dd");
  oppertunity.set('X3rd_Party_Lead_Number__c', application.body.sessionId);
  oppertunity.set('Promo_Loan_Offer_amount__c', application.body.loanAmount);
  oppertunity.set('Loan_Purpose__c', application.body.loanPurpose); //Car purchase
  oppertunity.set('Loan_Term__c', application.body.loanTerm);
  oppertunity.set('X3rd_Party_Photo__c', application.body.imageUrl);
  oppertunity.set('X3rd_Party_Photo_Tag__c', application.body.imageTag);
  oppertunity.set('CallBack_Time__c', application.body.callbackTime);
  oppertunity.set('X3rd_Party_Lead_Status__c', application.body.status);
  oppertunity.set('X3rd_Party_Lead_Source__c', application.body.leadSource);
  oppertunity.set('Name', 'AUS Outbound 8');
  oppertunity.set('CloseDate', closeDate);
  oppertunity.set('StageName', 'New');
  oppertunity.set('Branch_Name__c', 'AUS Outbound 8');
  oppertunity.set('Region__c', 'AU');
  console.log(' END  oppertunity Object  :');
  return oppertunity;

}

/* This function will perform tarnsformation for complete Opportunity Data receieved from 3rd Party */
createAccount = (application, salesforceID) => {
  console.log(' Inside Account  Object  :');
  account = nforce.createSObject('Account');
  account.set('firstname', application.body.applicantDetails[0].firstName);
  account.set('lastName', application.body.applicantDetails[0].lastName);
  account.set('PersonMobilePhone', application.body.applicantDetails[0].mobilePhone);
  account.set('PersonMailingState', application.body.applicantDetails[0].addresses[0].state);
  return account;

}

createRelatedDcoument = (application, salesforceID) => {
  console.log(' Inside create Related Dcoument  Object  :');
  document = nforce.createSObject('Related_Document__c');
  /*document.set('Document_Category__c', 'Supporting Documents');
  document.set('GE_Link_Type__c', 'Generated Document');
  document.set('Type__c', 'PicStarter Transcript');
  document.set('Application__c', salesforceID);*/
  return document;
}


createAttachment = (application, salesforceID) => {
  console.log(' Inside create Attachment   :');
  var file = 'conversation.text';
  var obj = application.body.conversation;
  jsonfile.writeFileSync(file, obj)
  var attachment = nforce.createSObject('Attachment');
  attachment.setAttachment(file, JSON.stringify(obj));
  attachment.set('Name', 'PicStarter Transcript');
  attachment.set('ParentId', salesforceID);
  return attachment;
}


function insertRelatedDocument(application, oauth, salesforceID) {
  //add expenses
  document = createRelatedDcoument(application, salesforceID);
  if (document) {
    org.insert({ sobject: document, oauth: oauth }, function (err, resp) {
      if (!err) console.log('It worked !! document');
      if (err) {
        expenseStatusFlag = false;
        console.log('ERROR MESSAGE :document', err);
      }
    });

  }
}

function insertDocumentAttachment(application, oauth, salesforceID) {
  //add attachment
  var attachmentDoc = createAttachment(application, salesforceID);
  if (attachmentDoc) {
    org.insert({ sobject: attachmentDoc, oauth: oauth }, function (err, resp) {
      if (!err) console.log('It worked !! attachment');
      if (err) {
        expenseStatusFlag = false;
        console.log('ERROR MESSAGE :attachment', err);
      }
    });

  }
}


exports.saveApplication = (application) => {

  var salesforceID = '';
  var salesforceApplicantID = "";
  var configuration = JSON.parse(
    fs.readFileSync('./config/configs.js')
  );
  console.log(" NODE ENV IN EXPORT APPS", env.environment);
  console.log(" APPLICATIONS ", application.body.leadSource);

  var loginUrl = configuration[env.environment].salesforce.username;
  var clientId = configuration[env.environment].salesforce.clientId;
  var clientSecret = configuration[env.environment].salesforce.clientSecret;
  var redirectUri = configuration[env.environment].salesforce.redirectUri;
  var apiVersion = configuration[env.environment].salesforce.apiVersion;
  var sfdcEnvironment = configuration[env.environment].salesforce.environment;
  var username = configuration[env.environment].salesforce.username; //'gewsprod@ge.com.orig.orignzqa' //502083718@lfs.com.orignzqa';
  var password = configuration[env.environment].salesforce.password; //'rdss@1234KFLKuatCMksPO4Wxr8m6oAlf';

  console.log(" clientId : ", clientId);
  console.log(" clientSecret ", clientSecret);
  console.log(" sfdcEnvironment ", sfdcEnvironment);

  branchLookup = configuration[env.environment].salesforce.Branch__c;
  brandLookup = configuration[env.environment].salesforce.Brand_Lookup__c;
  productLookup = configuration[env.environment].salesforce.Product_Id__c;

  org = nforce.createConnection({
    loginUrl: loginUrl,
    clientId: clientId,
    clientSecret: clientSecret,
    redirectUri: redirectUri,
    apiVersion: apiVersion,  // optional, defaults to current salesforce API version 
    environment: sfdcEnvironment,  // optional, salesforce 'sandbox' or 'production', production default 
    mode: 'multi' // optional, 'single' or 'multi' user mode, multi default 
  });

  org.authenticate({ username: username, password: password }, function (err, resp) {
    // store the oauth object for this user 
    if (!err) oauth = resp;
    console.log('OAuth ', oauth);
    console.log('Access Token: ' + oauth.access_token);
    console.log("User ID: " + oauth.id);
    console.log('Instance URL', oauth.instance_url);
    acccount = createAccount(application);

    org.insert({ sobject: acccount, oauth: oauth }, function (err, resp) {
      if (!err) {
        //add loan purpose
        console.log('It worked !! acccount', resp);
        salesforceID = resp.id;
        opportunity = createOpportunity(application, salesforceID);
        org.insert({ sobject: opportunity, oauth: oauth }, function (err, resp) {
          console.log(resp);
          if (!err) {
            console.log('It worked !! opportunity');
            salesforceApplicantID = resp.id;
            console.log('It worked !! salesforceApplicantID ', salesforceApplicantID);
            //insertRelatedDocument(application, oauth, salesforceID);
            insertDocumentAttachment(application, oauth, salesforceApplicantID);
            setTimeout(function () {
              console.log('Populate Salesforce Application Status Log');
              populateStatus(application, oauth, salesforceApplicantID, statusMessage);
            }, 7000);
          }
          if (err) {
            applicantStatusFlag = false;
            console.log('ERROR MESSAGE :Opportunity ', err);
            statusMessage = err.message;
            //populateStatus(application, oauth, salesforceApplicantID, statusMessage);
            console.log(" STATUS MESSAGE :: ", err.message);
          }

        });

      }
      if (err) {
        applicationStatusFlag = false;
        statusMessage = err.message;
        //populateStatus(application, oauth, salesforceApplicantID, statusMessage);
        console.log('ERROR MESSAGE ', err);
        //console.log(" STATUS MESSAGE :: ", err.message);
      }

    });

  });

}
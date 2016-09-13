var nforce = require('nforce');
var truncate = require('truncate');
var replace = require('replace');
var dateFormat = require('dateformat');
var fs = require("fs");
var env = require('../server');
var jsonfile = require('jsonfile');
var wrap = require('word-wrap');

var app = {};
var applicant = {};
var loanPurpose = {};
var acccount = {};
var document = {};
var attachment = {};

//Status field 
var oauth;
var accountStatusFlag = true;
var oppertunityStatusFlag = true;
var attachmentStatusFlag = true;
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

function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  console.log(' setDate :', result);
  return result;
}

/* This function will perform tarnsformation for complete Opportunity Data receieved from 3rd Party */
createOpportunity = (application, accountID) => {
  console.log(' START oppertunity Object  :');
  var oppertunity = nforce.createSObject('Opportunity');
  var closeDate = ""; //dateFormat('11/10/2018', "yyyy-mm-dd");
  var loanPurpose = application.body.loanPurpose;
  var leadStatus = application.body.status;
  var myDate = new Date();
  var leadFirstName = application.body.applicantDetails[0].firstName;
  var leadID = application.body.sessionId;
  var leadName = "";
  if (application.body.sourceId == '3') {
    leadName = "Veda Quote Lead - " + application.body.uniqueId;
    leadName = truncate(leadName, 120);
  } else {
    leadName = "Picstarter - " + leadFirstName + leadID;
    leadName = truncate(leadName, 120);
  }


  if (loanPurpose == 'Other') {
    loanPurpose = '';
  }
  oppertunity.set('X3rd_Party_Lead_Number__c', application.body.uniqueId);
  oppertunity.set('Promo_Loan_Offer_amount__c', application.body.loanAmount);
  oppertunity.set('Loan_Purpose__c', application.body.loanPurpose); //Car purchase
  oppertunity.set('Loan_Term__c', application.body.loanTerm);
  oppertunity.set('X3rd_Party_Photo__c', application.body.imageUrl);
  oppertunity.set('X3rd_Party_Photo_Tag__c', application.body.imageTag);
  oppertunity.set('CallBack_Time__c', application.body.callbackTime);
  oppertunity.set('X3rd_Party_Lead_Status__c', application.body.status);


  oppertunity.set('Name', leadName);
  var todayDate = dateFormat(myDate, 'yyyy-mm-dd');
  var cdate = '';
  var formattedClosedate = '';
  console.log(" DATE ------ ", todayDate);
  console.log(" Lead Status ", leadStatus);

  if (leadStatus == 'Complete') {
    cdate = addDays(todayDate, 30);
    formattedClosedate = dateFormat(cdate, 'yyyy-mm-dd');
  }
  if (leadStatus == 'Incomplete') {
    cdate = addDays(todayDate, 1);
    formattedClosedate = dateFormat(cdate, 'yyyy-mm-dd');
  }

  console.log(' Lead Name :', leadName);
  console.log(" DATE ------ ", todayDate);
  console.log(" CLOSE DATE ------ ", formattedClosedate);


  if (application.body.sourceId == '3') {
    oppertunity.set('Branch_Name__c', 'AUS Outbound 9');
    oppertunity.set('X3rd_Marketing_Consent__c', true);
    oppertunity.set('X3rd_Party_Lead_Source__c', 'Veda Quote'); //"PicStarter"
    cdate = addDays(todayDate, 30);
    formattedClosedate = dateFormat(cdate, 'yyyy-mm-dd');

  } else {
    oppertunity.set('Branch_Name__c', 'AUS Outbound 8');
    oppertunity.set('X3rd_Party_Lead_Source__c', application.body.leadSource); //"PicStarter"
  }

  oppertunity.set('CloseDate', formattedClosedate);
  oppertunity.set('StageName', 'New');
  oppertunity.set('Region__c', 'AU');
  oppertunity.set('AccountId', accountID);

  console.log(' END  oppertunity Object  :');
  return oppertunity;

}

/* This function will perform tarnsformation for complete Account Data receieved from 3rd Party */
createAccount = (application, salesforceID) => {
  console.log(' Inside Account  Object  :');
  var firstName = '';
  var lastName = '';
  account = nforce.createSObject('Account');
  if (application.body.applicantDetails[0].firstName) {
    firstName = truncate(application.body.applicantDetails[0].firstName, 15);
    account.set('firstName', firstName);
  }

  if (application.body.applicantDetails[0].middleName) {
    account.set('Middle_Name__pc', application.body.applicantDetails[0].middleName);
  }

  if (application.body.applicantDetails[0].lastName && application.body.sourceId == '3') {
    lastName = truncate(application.body.applicantDetails[0].lastName, 20);
    account.set('lastName', lastName);
  } else {
    account.set('lastName', 'PicStarter');
  }

  var genderDesc = {
    "m": "Male",
    "f": "Female"
  };

  if (application.body.applicantDetails[0].gender) {
    account.set('Gender__c', genderDesc[application.body.applicantDetails[0].gender]);
  }

  if (application.body.applicantDetails[0].emailAddress) {
    account.set('PersonEmail', application.body.applicantDetails[0].emailAddress);
  }

  if (application.body.applicantDetails[0].dateOfBirth) {
    var dob = dateFormat(application.body.dateOfBirth, "dd/mm/yyyy");
    account.set('Date_Of_Birth__pc', dob);
  }

  account.set('PersonMobilePhone', application.body.applicantDetails[0].mobilePhone);
  account.set('PersonMailingState', application.body.applicantDetails[0].addresses[0].state);
  account.set('Record_Type_Indicator__c', '1');
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
  var attachmentName = 'PicStarter Conversation ' + salesforceID;
  var attachment = nforce.createSObject('Attachment');
  //var textObj = "";
  var conversationData = [];
  if (obj) {
    obj.forEach(function (conversationObject) {
      var textObj = "";
      textObj = 'Question :  ';
      textObj = textObj + conversationObject.question + "   ";
      wrap(textObj, { newline: '\n\n' });
      textObj = textObj + 'Answer :  ';
      textObj = textObj + conversationObject.answer + "   ";
      wrap(textObj, { newline: '\n\n' });
      conversationData.push(textObj);
    });
    var conversationDataInString = JSON.stringify(conversationData).replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
    console.log(" final chat transcript ", conversationDataInString);
  }

  jsonfile.writeFileSync(file, obj)

  attachment.setAttachment(file, JSON.stringify(conversationData));
  attachment.set('Name', attachmentName);
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
        attachmentStatusFlag = false;
        console.log('ERROR MESSAGE :attachment', err);
      }
    });

  }
}

function populateStatus(application, oauth, salesforceApplicantID, statusMessage) {
  var applicationSubmitStatus = {};
  console.log(' accountStatusFlag ', accountStatusFlag);
  console.log(' oppertunityStatusFlag ', oppertunityStatusFlag);
  console.log(' attachmentStatusFlag ', attachmentStatusFlag);
  applicationSubmitStatus = nforce.createSObject('X3rd_Party_Application_Status_Log__c');
  applicationSubmitStatus.set('X3rd_Party_Application_Number__c', salesforceApplicantID);
  if (accountStatusFlag && oppertunityStatusFlag && attachmentStatusFlag) {
    applicationSubmitStatus.set('Status__c', 'SUC_001');
    applicationSubmitStatus.set('Status_Code__c', 'SUC_001');
    applicationSubmitStatus.set('Status_Message__c', ' Application :Application and Child create successful');
    console.log('S1 Application data insertion completed');
  } else {
    applicationSubmitStatus.set('Status__c', 'ERR_002');
    applicationSubmitStatus.set('Status_Code__c', 'ERR_002');
    applicationSubmitStatus.set('Status_Message__c', statusMessage);
    console.log('ERR_002 : Application data insertion  Failed');
  }

  org.insert({ sobject: applicationSubmitStatus, oauth: oauth }, function (err, resp) {
    if (!err) console.log('It worked !! X3rd_Party_Application_Status_Log__c');
    if (err) {
      //incomeStatusFlag = false;
      console.log('ERROR MESSAGE :X3rd_Party_Application_Status_Log__c', err);
    }
  });

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
  console.log(" username ", username);
  console.log(" password ", password);

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
            if (application.body.sourceId != '3') {
              insertDocumentAttachment(application, oauth, salesforceApplicantID);
            }
            setTimeout(function () {
              console.log('Populate Salesforce Application Status Log');
              populateStatus(application, oauth, salesforceApplicantID, statusMessage);
            }, 7000);
          }
          if (err) {
            oppertunityStatusFlag = false;
            console.log('ERROR MESSAGE :Opportunity ', err);
            statusMessage = err.message;
            populateStatus(application, oauth, salesforceApplicantID, statusMessage);
            console.log(" STATUS MESSAGE :: ", err.message);
          }

        });

      }
      if (err) {
        accountStatusFlag = false;
        statusMessage = err.message;
        populateStatus(application, oauth, salesforceApplicantID, statusMessage);
        console.log('ERROR MESSAGE ', err);
        //console.log(" STATUS MESSAGE :: ", err.message);
      }

    });

  });

}
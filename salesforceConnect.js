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

var onlineApplication = {};
var onlineLoanPurpose = {};
var onlineApplicant = {};

//Status field 
var oauth;
var accountStatusFlag = true;
var oppertunityStatusFlag = true;
var attachmentStatusFlag = true;
var relatedDcoumentFlag = true;
var loanPurposeFlag = true;
var statusMessage = '';
var configuration = '';
var org = '';
var onlineOrg = '';
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

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({ "error": message });
}

// Generic Success handler used by all endpoints.
function handleSucess(res, reason, message, code) {
  console.log("SUCCESS: " + reason);
  res.status(code || 201).json({ "onlineUrl": message });
}

createOnlineApplication = (application) => {
  console.log(' START Application Object  :');
  var applicationObj = nforce.createSObject('Application__C');
  console.log(" session id ---------------------- ", application.body.sessionId);
  applicationObj.set('X3rd_Party_Application_Number__c', application.body.uniqueId);
  applicationObj.set('X3rd_Party_Photo__c', application.body.imageUrl);
  applicationObj.set('X3rd_Party_Photo_Tag__c', application.body.imageTag);
  applicationObj.set('X3rd_Party_Application_Source__c', application.body.leadSource);
  applicationObj.set('Loan_Term__c', application.body.loanTerm);
  applicationObj.set('Application_Type__c', 'Single');
  console.log(' END  Application Object  :');
  return applicationObj;
}

createOnlineLoanPurpose = (application, salesforceID) => {
  console.log(' START LOAN PURPOSE Object  :');
  var loanPurpose = nforce.createSObject('Loan_Purpose__c');
  loanPurpose.set('Loan_Amount__c', application.body.loanAmount);
  loanPurpose.set('Value__c', application.body.loanType);
  loanPurpose.set('Application__c', salesforceID);
  console.log(' END  LOAN PURPOS Object  :');
  return loanPurpose;
}

createOnlineApplicant = (application, salesforceID) => {
  console.log(' START APPLICANT Object  :');
  var applicant = nforce.createSObject('Applicant__c');
  applicant.set('First_Name__c', application.body.applicantDetails[0].firstName);
  applicant.set('Mobile__c', application.body.applicantDetails[0].mobilePhone);
  applicant.set('State_Res__c', application.body.applicantDetails[0].state);
  applicant.set('Application__c', salesforceID);
  console.log(' END  APPLICANTObject  :');
  return applicant;
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
  var leadID = application.body.uniqueId;
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
    var dob = dateFormat(application.body.applicantDetails[0].dateOfBirth, "dd/mm/yyyy");
    account.set('Date_Of_Birth__pc', dob);
  }

  if (application.body.sourceId == '3') {
    account.set('X3rd_Customer_Address__c', application.body.applicantDetails[0].addresses[0].formattedAddress);
  }
  account.set('PersonMobilePhone', application.body.applicantDetails[0].mobilePhone);
  account.set('PersonMailingState', application.body.applicantDetails[0].addresses[0].state);
  account.set('Record_Type_Indicator__c', '1');
  return account;

}

createRelatedDcoument = (application, salesforceID) => {
  console.log(' Inside create Related Dcoument  Object  :');
  document = nforce.createSObject('Related_Document__c');
  document.set('Document_Category__c', 'Supporting Documents');
  document.set('GE_Link_Type__c', 'Generated Document');
  document.set('Type__c', 'PicStarter Transcript');
  document.set('Application__c', salesforceID);
  return document;
}


createAttachment = (application, salesforceID) => {
  console.log(' Inside create Attachment   :');
  var file = 'conversation.text';
  var obj = application.body.conversation;
  var attachmentName = 'PicStarter Conversation ' + salesforceID + ".txt";
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
        relatedDcoumentFlag = false;
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

function insertLoanPurpose(application, oauth, salesforceID) {
  //add attachment
  var loanPusposeForOnline = createOnlineLoanPurpose(application, salesforceID);
  if (loanPusposeForOnline) {
    org.insert({ sobject: loanPusposeForOnline, oauth: oauth }, function (err, resp) {
      if (!err) console.log('It worked !! Loan Purpose ');
      if (err) {
        loanPurposeFlag = false;
        console.log('ERROR MESSAGE :Loan Purpose', err);
      }
    });

  }
}


function getOnlineURL(application, oauth, salesforceID, response) {

  var config = JSON.parse(
    fs.readFileSync('./config/configs.js')
  );

  var URL = {};
  var tokenLink = '';
  var loginUrl = config[env.environment].salesforce.username;
  var clientId = config[env.environment].salesforce.clientId;
  var clientSecret = config[env.environment].salesforce.clientSecret;
  var redirectUri = config[env.environment].salesforce.redirectUri;
  var apiVersion = config[env.environment].salesforce.apiVersion;
  var sfdcEnvironment = config[env.environment].salesforce.environment;
  var username = config[env.environment].salesforce.username; //'gewsprod@ge.com.orig.orignzqa' //502083718@lfs.com.orignzqa';
  var password = config[env.environment].salesforce.password; //'rdss@1234KFLKuatCMksPO4Wxr8m6oAlf';

  console.log(" clientId : ", clientId);
  console.log(" clientSecret ", clientSecret);
  console.log(" sfdcEnvironment ", sfdcEnvironment);
  console.log(" username ", username);
  console.log(" password ", password);

  branchLookup = config[env.environment].salesforce.Branch__c;
  brandLookup = config[env.environment].salesforce.Brand_Lookup__c;
  productLookup = config[env.environment].salesforce.Product_Id__c;

  var orgSalesforce = nforce.createConnection({
    loginUrl: loginUrl,
    clientId: clientId,
    clientSecret: clientSecret,
    redirectUri: redirectUri,
    apiVersion: apiVersion,  // optional, defaults to current salesforce API version 
    environment: sfdcEnvironment,  // optional, salesforce 'sandbox' or 'production', production default 
    mode: 'multi' // optional, 'single' or 'multi' user mode, multi default 
  });

  orgSalesforce.authenticate({ username: username, password: password }, function (err, resp) {
    if (!err) {
      oauth = resp;
      console.log('OAuth ', oauth);
      console.log('Access Token: ' + oauth.access_token);
      console.log("User ID: " + oauth.id);
      console.log('Instance URL', oauth.instance_url);
      var q = 'select X3rd_Party_URL__c from Application__c where id = \'' + salesforceID + '\' ';// + salesforceID;
      orgSalesforce.query({ query: q, oauth: oauth }, function (err, resp) {
        if (!err && resp.records) {
          console.log('It worked !! GetOnlineURL ');
          URL = resp.records[0];
          var link = URL._fields;
          tokenLink = link.x3rd_party_url__c;
          console.log('It worked !! URL  --- ', URL);
          console.log('It worked !! url  --- ', URL.attributes.url);
          console.log('It worked !! type  --- ', URL.attributes.type);
          console.log('It worked !! tokenLink  --- ', tokenLink);
          // console.log('It worked !! URL LINK  --- ', URL._fields[0].x3rd_party_url__c);
          handleSucess(response, tokenLink, tokenLink);
          response.end();
        }

        if (err) {
          loanPurposeFlag = false;
          console.log('ERROR MESSAGE :Loan Purpose', err);
        }
      });
    }
  }
  )
  return tokenLink;
};

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


exports.saveOnlineApplication = (application, response) => {

  var salesforceID = '';
  var salesforceApplicantID = "";
  var configuration = JSON.parse(
    fs.readFileSync('./config/configs.js')
  );
  console.log(" NODE ENV IN EXPORT APPS", env.environment);
  console.log(" ONLINE APPLICATIONS ", application.body.leadSource);
  var onlineUrl = '';//https://orignzqa-gecapitalau.cs6.force.com/latitude/app_eligibility?suid=b51c80ab-03b6-dac0-d16f-ab49ef52e6c2';
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
    onlineApplication = createOnlineApplication(application);

    org.insert({ sobject: onlineApplication, oauth: oauth }, function (err, resp) {
      if (!err) {
        //add loan purpose
        console.log('It worked !! ONLINE  Application', resp);
        salesforceID = resp.id;
        onlineApplicant = createOnlineApplicant(application, salesforceID);
        org.insert({ sobject: onlineApplicant, oauth: oauth }, function (err, resp) {
          console.log(resp);
          if (!err) {
            console.log('It worked !! ONLINE  Applicant');
            salesforceApplicantID = resp.id;
            console.log('It worked !! salesforceApplicantID ', salesforceApplicantID);
            insertLoanPurpose(application, oauth, salesforceID);
            insertRelatedDocument(application, oauth, salesforceID);
            insertDocumentAttachment(application, oauth, salesforceApplicantID);

            setTimeout(function () {
              console.log('Populate Salesforce Application Status Log');
              populateStatus(application, oauth, salesforceApplicantID, statusMessage);
              onlineUrl = getOnlineURL(application, oauth, salesforceID, response);
              //console.log(" OOOOOOONNNNNN ---------- ", onlineUrl);  
            }, 7000);


          }
          if (err) {
            oppertunityStatusFlag = false;
            console.log('ERROR MESSAGE :Opportunity ', err);
            statusMessage = err.message;
            populateStatus(application, oauth, salesforceApplicantID, statusMessage);
            handleError(response, err.errorCode, statusMessage);
            response.end();
            console.log(" STATUS MESSAGE :: ", err.message);
          }

        });

      }
      if (err) {
        accountStatusFlag = false;
        statusMessage = err.message;
        populateStatus(application, oauth, salesforceApplicantID, statusMessage);
        handleError(response, err.errorCode, statusMessage);
        response.end();
        console.log('ERROR MESSAGE ', err);
        //return err;
        //console.log(" STATUS MESSAGE :: ", err.message);
      }

    });

  });

  //return statusMessage;

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
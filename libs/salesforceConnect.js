
var nforce = require('nforce');
var truncate = require('truncate');
var dateFormat = require('dateformat');
var fs = require("fs");
var env = require('../server');

var app = {};
var applicant = {};
var loanPurpose = {};
var expense = {};
var income = {};
var otherIncome = {};
var asset = {};
var liability = {};

//Status field 
var oauth;
var applicationStatusFlag = true;
var applicantStatusFlag = true;
var loanPurposeFlag = true;
var incomeStatusFlag = true;
var otherIncomeStatusFlag = true;
var assetStatusFlag = true;
var debtStatusFlag = true;
var expenseStatusFlag = true;
var statusMessage = '';
var configuration = '';
var org = '';
var branchLookup = '';
var brandLookup = '';
var productLookup = '';


/* This function will perform tarnsformation for complete Application Data receieved from Society One */
createApplication = (application) => {
  console.log(' Inside createApplication Object  :');
  app = nforce.createSObject('Application__c');
  //Loan Term
  var loanTerm = {
    "24": "2 years",
    "36": "3 years",
    "60": "5 years",
  };

  if (loanTerm[application.term]) {
    app.set('Loan_Term__c', loanTerm[application.term]);
  } else {
    app.set('Loan_Term__c', '');
  }
  // Risk Grade Taransformation 
  var riskGrade = application.secondaryCreditRating;
  riskGrade = riskGrade.replace(/[0-9]/g, '');
  console.log(" RISK GRADE ", riskGrade);
  app.set('Application_Type__c', 'Single');
  app.set('Higher_Approval_Consent__c', application.optionalDisclaimer2);
  app.set('Product_Id__c', productLookup);
  app.set('Mirror__c', 'Society One');
  app.set('Channel__c', '3rd Party Application');
  app.set('Business_Source__c', 'INTERNET APPLICATION');
  app.set('Branch__c', branchLookup);
  app.set('X3rd_Party_Quoted_Risk_Grade__c', riskGrade);
  app.set('X3rd_Party_Quoted_Rate__c', application.interestRate);
  app.set('X3rd_Party_Application_Source__c', 'INTERNET APPLICATION');
  app.set('X3rd_Party_Application_Number__c', application.applicationNumber); //application.applicationNumber 'A0009'
  app.set('Loan_Term_Months__c', application.term);
  app.set('Payment_Frequency__c', application.paymentFrequency);
  app.set('Loan_Term_Months__c', application.term);
  app.set('Total_Loan_Amount__c', application.originalAmountRequested);
  app.set('Application_Source__c', 'INTERNET');
  app.set('X3rd_Party_Security_Token__c', application.originalAmountRequested);
  app.set('X3rd_Party_Application_Source__c', 'Society One');
  app.set('Brand_Lookup__c', brandLookup);
  app.set('Brand_String__c', 'Latitude');
  app.set('Type_of_Product__c', 'Personal Loan');
  console.log('Society One Application Number ', application.applicationNumber);
  console.log('Origination Loan Amount ', application.originalAmountRequested);
  return app;
};

/* This function will perform tarnsformation for complete Loan Purpose Data receieved from Society One */
createLoanPurpose = (application, salesforceID) => {
  console.log(' Inside createLoanPurpose Object  :', salesforceID);
  loanPurpose = nforce.createSObject('Loan_Purpose__c');
  var loanType = {
    "Buy or Refinance a Vehicle": "Car Purchase",
    "Pay Off Credit Cards or loans": "Debt consolidation",
    "Education Expenses": "Educational expenses",
    "Holiday": "Travel/Holiday"
  };

  var loanDesc = {
    "Wedding": "Wedding",
    "Retail Finance": "Retail Finance",
    "Major Purchase": "Major Purchase"
  };

  loanPurpose.set('Loan_Amount__c', application.originalAmountRequested); //application.originalAmountRequested
  if (loanType[application.loanType]) {
    loanPurpose.set('Value__c', loanType[application.loanType]);
  } else if (application.loanType === 'Other') {
    loanPurpose.set('Value__c', 'Other');
    loanPurpose.set('Other_Loan_Purpose__c', truncate(application.loanTypeDescription, 19));
  } else {
    loanPurpose.set('Value__c', 'Other');
    loanPurpose.set('Other_Loan_Purpose__c', truncate(application.loanType, 19));
  }
  console.log(" salesforceID  :::", salesforceID);
  loanPurpose.set('Application__c', salesforceID); //application.applicationNumber
  console.log('createLoanPurpose Operation :(LOAN AMOUNT ) ===============', application.originalAmountRequested);
  console.log('createLoanPurpose Operation :(LOAN TYPE ) ===============', application.loanType);
  console.log('createLoanPurpose Operation :(LOAN DESC ) ===============', application.loanDescription);
  return loanPurpose;
};

/* This function will perform tarnsformation for complete Applicant Data receieved from Society One */
createApplicant = (application, salesforceID) => {
  console.log(' Inside createApplicant Object  :');
  applicant = nforce.createSObject('Applicant__c');
  //if there is no security set asset_exempt__c = true // TO DO LATER
  var EidvConent = {
    "true": "Yes",
    "false": "No"
  };
  applicant.set('Meets_Eligibility_Criteria__c', true);
  applicant.set('Agrees_to_Fees__c', true);
  applicant.set('Agrees_to_Privacy_Policy__c', true);
  applicant.set('EIDV__c', EidvConent[application.optionalDisclaimer1]);
  console.log(" EIDV CONSENT ", application.optionalDisclaimer1);
  var titleDesc = {
    "Sir": "Mr",
    "Prof.": "Mr",
    "Mrs.": "Mrs",
    "Mr.": "Mr",
    "Ms.": "Ms",
    "Miss.": "Miss",
    "Dr.": "Dr"
  };

  if (titleDesc[application.customerRelationships[0].title]) {
    applicant.set('Title__c', titleDesc[application.customerRelationships[0].title]);
  } else {
    applicant.set('Title__c', application.customerRelationships[0].title);
  }

  var firstName = truncate(application.customerRelationships[0].firstNames, 14);
  console.log(" First Name ", firstName);
  var lastName = truncate(application.customerRelationships[0].surname, 19);
  console.log(" First Name ", firstName);
  console.log(" Last Name ", lastName);

  applicant.set('first_Name__c', firstName);
  applicant.set('Middle_Name__c', application.customerRelationships[0].middleNames);
  applicant.set('Last_Name__c', lastName);
  applicant.set('Gender__c', application.customerRelationships[0].gender);

  var dob = dateFormat(application.customerRelationships[0].dateOfBirth, "dd-mm-yyyy");
  console.log(' application date of birth ||||| Before transform  ', application.customerRelationships[0].dateOfBirth);
  console.log(' application date of birth ||||| After  transform  ', dob);
  applicant.set('Date_of_Birth__c', dob);
  applicant.set('Rel_Status__c', application.customerRelationships[0].maritalStatus);
  applicant.set('No_of_Deps__c', application.customerRelationships[0].dependents);
  var driverLicense = application.customerRelationships[0].driversLicense;
  console.log('application.customerRelationships[0].gender', application.customerRelationships[0].gender);
  var driverLicenseFlag = true;
  if (driverLicense) {
    driverLicense = driverLicense.replace(/[^a-zA-Z0-9]/g, '');
    driverLicense = truncate(driverLicense, 9);
    driverLicenseFlag = false;
  }
  console.log(' application driverLicense ||||| After  trancute  ', driverLicense);
  console.log(' application driverLicense flag after transaformation  ', driverLicenseFlag);
  applicant.set('Drivers_Lic_No__c', driverLicense);
  applicant.set('Drivers_Lic_Flg__c', driverLicenseFlag);
  applicant.set('Pref_Contact_Method__c', application.customerRelationships[0].preferredContactMethod);
  applicant.set('Mobile__c', application.customerRelationships[0].mobileContact);
  var homePh = application.customerRelationships[0].homePhoneContact;
  var workPh = application.customerRelationships[0].workPhoneContact;
  if (homePh) {
    homePh = homePh.replace(/-/g, '');
    applicant.set('Home__c', homePh);
    console.log(' application homePhoneContact ||||| After  trancute  ', homePh);
  }
  if (workPh) {
    workPh = workPh.replace(/-/g, '');
    applicant.set('Work__c', workPh);
    console.log(' application workPhoneContact ||||| After  trancute  ', workPh);
  }

  var emailAddress = application.customerRelationships[0].emailContact;
  if (emailAddress.length > 40) {
    emailAddress = '';
  }
  console.log("EMAIL ADDRESSS FIELD ", emailAddress);
  applicant.set('Email_Address__c', emailAddress);

  var stateDesc = {
    "Australian Capital Territory": "ACT",
    "South Australia": "SA",
    "Northern Territory": "NT",
    "Queensland": "QLD",
    "Tasmania": "TAS",
    "New South Wales": "NSW",
    "Victoria": "VIC",
    "Western Australia": "WA",
  };

  var streetType = {
    "Access": "Access",
    "Accs": "Accs",
    "Alley": "Ally",
    "Alleyway": "Alleyway",
    "Ally": "Ally",
    "Amble": "Amble",
    "Anchorage": "Anchorage",
    "Approach": "Approach",
    "Arcade": "Arc",
    "Artery": "Artery",
    "Avenue": "Ave",
    "Beach": "Beach",
    "Bend": "Bend",
    "Block": "Block",
    "Boulevard": "Bvd",
    "Brace": "Brce",
    "Brae": "Brae",
    "Brce": "Brce",
    "Break": "Break",
    "Bridge": "Bridge",
    "Broadway": "Broadway",
    "Brow": "Brow",
    "Bvd": "Bvd",
    "Byway": "Byway",
    "Causeway": "Causeway",
    "Centre": "Ctr",
    "Centreway": "Centreway",
    "Chase": "Ch",
    "Circle": "Cir",
    "Circlet": "Circlet",
    "Circuit": "Cct",
    "Circus": "Crcs",
    "Close": "Cl",
    "Cmmn": "Cmmn",
    "Colonnade": "Colonnade",
    "Common": "Common",
    "Con": "Con",
    "Concourse": "Con",
    "Corner": "Cnr",
    "Corso": "Cso",
    "Court": "Ct",
    "Courtyard": "Courtyard",
    "Cove": "Cove",
    "Cres": "Cres",
    "Crescent": "Cres",
    "Crest": "Crest",
    "Cross": "Cross",
    "Crossing": "Crsg",
    "Crossroad": "Crossroad",
    "Crsg": "Crsg",
    "Cruiseway": "Cruiseway",
    "Cul-De-Sac": "Cul-De-Sac",
    "Dale": "Dale",
    "Deviation": "Deviation",
    "Devn": "Devn",
    "Drive": "Dr",
    "Driveway": "Driveway",
    "Drwy": "Drwy",
    "Edge": "Edge",
    "Elbow": "Elbow",
    "Elink": "Elink",
    "End": "End",
    "Entrance": "Ent",
    "Esplanade": "Esp",
    "Estate": "Estate",
    "Extension": "Extension",
    "Fairway": "Fairway",
    "Fawy": "Fawy",
    "Firetrail": "Firetrail",
    "Flat": "Flat",
    "Foreshore": "Foreshore",
    "Freeway": "Fwy",
    "Front": "Front",
    "Frontage": "Frtg",
    "Frtg": "Frtg",
    "Gap": "Gap",
    "Garden": "Gdn",
    "Gardens": "Gardens",
    "Gate": "Gte",
    "Gdns": "Gdns",
    "Glade": "Gld",
    "Gld": "Gld",
    "Glen": "Glen",
    "Gr": "Gr",
    "Grange": "Gra",
    "Green": "Grn",
    "Ground": "Grnd",
    "Grove": "Gr",
    "Heights": "Hts",
    "Highway": "Hwy",
    "Hill": "Hill",
    "Junction": "Jnc",
    "Key": "Key",
    "Landing": "Landing",
    "Lane": "Lane",
    "Laneway": "Laneway",
    "Lees": "Lees",
    "Line": "Line",
    "Lkt": "Lkt",
    "Loop": "Loop",
    "Lower": "Lower",
    "Mall": "Mall",
    "Meander": "Meander",
    "Mew": "Mew",
    "Mews": "Mews",
    "Mndr": "Mndr",
    "Motorway": "Motorway",
    "Mount": "Mt",
    "Nook": "Nook",
    "Otlk": "Otlk",
    "Outlook": "Otlk",
    "Parade": "Pde",
    "Park": "Park",
    "Parkway": "Pkwy",
    "Part": "Part",
    "Pass": "Pass",
    "Path": "Path",
    "Pde": "Pde",
    "Piazza": "Piazza",
    "Pkwy": "Pkwy",
    "Place": "Pl",
    "Plateau": "Plateau",
    "Plaza": "Plza",
    "Pocket": "Pocket",
    "Point": "Pnt",
    "Port": "Port",
    "Prom": "Prom",
    "Promenade": "Prom",
    "Qdrt": "Qdrt",
    "Quadrant": "Qdrt",
    "Quay": "Qy",
    "Quays": "Quays",
    "Ramble": "Ramble",
    "Rd": "Rd",
    "RD E": "RD E",
    "Rdge": "Rdge",
    "Reach": "Reach",
    "Reserve": "Res",
    "Rest": "Rest",
    "Retreat": "Rtt",
    "Ride": "Ride",
    "Ridge": "Rdge",
    "Ridgeway": "Ridgeway",
    "Right of Way": "Rowy",
    "Ring": "Ring",
    "Rise": "Rise",
    "River": "River",
    "Rmbl": "Rmbl",
    "Road": "Rd",
    "Roads": "Roads",
    "Roadside": "Roadside",
    "Roadway": "Rdwy",
    "Ronde": "Ronde",
    "Round": "Rnd",
    "Route": "Route",
    "Row": "Row",
    "Rtt": "Rtt",
    "Run": "Run",
    "Service Way": "Service Way",
    "Siding": "Sdng",
    "Spur": "Spur",
    "Square": "Sq",
    "St": "St",
    "ST E": "ST E",
    "ST N": "ST N",
    "Stairs": "Stairs",
    "State Highway": "State Highway",
    "Strand": "Strand",
    "Street": "St",
    "Strip": "Strip",
    "Strp": "Strp",
    "Terrace": "Tce",
    "Top": "Top",
    "Towers": "Towers",
    "Track": "Trk",
    "Trail": "Trail",
    "Trk": "Trk",
    "Turn": "Turn",
    "Upper": "Upper",
    "Vale": "Vale",
    "View": "View",
    "Villas": "Villas",
    "Vista": "Vista",
    "Vsta": "Vsta",
    "Walk": "Walk",
    "Walkway": "Wkwy",
    "Way": "Way",
    "Wharf": "Wharf",
    "Wynd": "Wynd",
    "Yard": "Yard"
  };

  var residentialStatus = {
    "Renting": "Renting",
    "Living With Parents": "Boarding with Parents",
    "Mortgage": "Own a home with a mortgage",
    "Freehold": "Own a home outright",
    "Boarding": "Boarding Other",
  };

  var noOfAddress = application.customerRelationships[0].addresses;
  var postalAddressFlag = false;
  applicant.set('Postal_Addr_Flg__c', postalAddressFlag);

  if (noOfAddress) {
    noOfAddress.forEach(function (address) {
      var addressTypeInfo = address.addressType;
      console.log(" ADDRESS INFO ", addressTypeInfo);
      if (addressTypeInfo == 'CurrentAddress') {
        console.info('Current address type');
        applicant.set('Unit_No_Res__c', address.flatUnitNumber);
        applicant.set('Street_No_Res__c', address.streetNumber);
        applicant.set('Street_Res__c', address.streetName);
        applicant.set('Street_Type_Res__c', streetType[address.streetType]);
        applicant.set('Suburb_Res__c', address.suburb);
        applicant.set('Postcode_Res__c', address.postCode);
        applicant.set('Country_Res__c', 'Australia');
        applicant.set('State_Res__c', stateDesc[address.state]);
        applicant.set('Years_At_Addr__c', address.years);
        applicant.set('Months_At_Addr__c', address.months);
        applicant.set('Res_Status__c', residentialStatus[address.typeOfResidence]);
      } else if (addressTypeInfo == 'MailingAddress') {
        console.info('MailingAddress  type');
        postalAddressFlag = true;
        applicant.set('Postal_Addr_Flg__c', postalAddressFlag);
        applicant.set('Unit_No_Pos__c', address.flatUnitNumber);
        applicant.set('Street_No_Pos__c', address.streetNumber);
        applicant.set('Street_Pos__c', address.streetName);
        applicant.set('Street_Type_Pos__c', streetType[address.streetType]);
        applicant.set('Suburb_Pos__c', address.suburb);
        applicant.set('Postcode_Pos__c', address.postCode);
        applicant.set('Country_Pos__c', 'Australia');
        applicant.set('State_Pos__c', stateDesc[address.state]);
        applicant.set('PO_Box__c', false);
      } else if (addressTypeInfo == 'PreviousAddress') {
        console.info('PreviousAddress  type');
        applicant.set('Unit_No_Pre__c', address.flatUnitNumber);
        applicant.set('Street_No_Pre__c', address.streetNumber);
        applicant.set('Street_Pre__c', address.streetName);
        applicant.set('Street_Type_Pre__c', streetType[address.streetType]);
        applicant.set('Suburb_Pre__c', address.suburb);
        applicant.set('Postcode_Pre__c', address.postCode);
        applicant.set('Country_Pre__c', 'Australia');
        applicant.set('State_Pre__c', stateDesc[address.state]);
        applicant.set('Years_At_Prev_Addr__c', address.years);
        applicant.set('Months_At_Prev_Addr__c', address.months);
      }
    }, this);

  }
  var primaryEmploymentStatus = {
    "Full Time": "Permanent (work over 20 hours per week)",
    "Part Time": "Permanent or Part Time (work less than 20 hours per week)",
    "Casual": "Casual / Temporary / Seasonal",
    "Seasonal": "Casual / Temporary / Seasonal",
    "Contract": "Contractor",
    "Self Employed": "Self Employed",
    "Pension/Government Benefits": "Other Pension",
    "Not In Paid Employment": "Unemployed",
    "Unemployed": "Unemployed"
  };

  var noOfemployment = application.customerRelationships[0].employment;
  var employmentType = application.customerRelationships[0].employmentType;
  if (noOfemployment) {
    noOfemployment.forEach(function (employmentDetails) {
      var employmentTypeInfo = employmentDetails.employmentType;
      console.log("employment type ", employmentTypeInfo);
      if (employmentTypeInfo == 'CurrentEmployment') {
        applicant.set('Primary_Employment_Status__c', primaryEmploymentStatus[employmentDetails.employmentStatus]);
      }
      if (employmentTypeInfo == 'PreviousEmployment') {
        applicant.set('Previous_Employment_Status__c', primaryEmploymentStatus[employmentDetails.employmentStatus]);
        applicant.set('Time_at_previous_employer_years__c', employmentDetails.employmentYears);
        applicant.set('Time_at_previous_employer_months__c', employmentDetails.employmentMonths);
        console.log(' application employmentStatus Months |||||  ', employmentDetails.employmentMonths);
        console.log(' application Years  |||||  ', employmentDetails.employmentYears);
        console.log(' application employmentStatus  ', primaryEmploymentStatus[employmentDetails.employmentStatus]);
      }

    }, this);
  }

  var securities = application.securities
  var debts = application.debt
  if (securities) {
    applicant.set('Asset_Exempt__c', false);
  } else {
    applicant.set('Asset_Exempt__c', true);
  }
  if (debts) {
    applicant.set('Debts_Exempt__c', false);
  } else {
    applicant.set('Debts_Exempt__c', true);
  }

  applicant.set('Is_Primary_Applicant__c', true);
  applicant.set('Accept_Terms_and_Conditions__c', true);

  var dobWebService = dateFormat(application.customerRelationships[0].dateOfBirth, "yyyy-mm-dd");
  var dobWebServiceDocGen = dateFormat(application.customerRelationships[0].dateOfBirth, "dd/mm/yyyy");
  applicant.set('Date_of_Birth_WS__c', dobWebService);
  applicant.set('Date_of_Birth_Doc_Gen__c', dobWebServiceDocGen)
  var homePhoneNo = application.customerRelationships[0].homePhoneContact;
  var homePhoneNoAreaCode = application.customerRelationships[0].homePhoneContact;
  var workPhoneNo = application.customerRelationships[0].workPhoneContact;
  var workPhoneNoAreaCode = application.customerRelationships[0].workPhoneContact;

  console.log(' application homePhoneNo |||||  ', homePhoneNo);
  console.log(' application homePhoneNoAreaCode |||||  ', homePhoneNoAreaCode);

  if (homePhoneNo) {
    homePhoneNo = homePhoneNo.replace(/-/g, '');
    homePhoneNoAreaCode = homePhoneNoAreaCode.replace(/-/g, '');
    homePhoneNo = homePhoneNo.substring(2, homePhoneNo.length);
    homePhoneNoAreaCode = homePhoneNoAreaCode.substring(0, 2);
    applicant.set('Home_WS__c', homePhoneNo);
    applicant.set('Home_Area_Code__c', homePhoneNoAreaCode);
    console.log(' application homePhoneNo ||||| After  trancute  ', homePhoneNo);
    console.log(' application homePhoneNoAreaCode ||||| After  trancute  ', homePhoneNoAreaCode);
  }
  if (workPhoneNo) {
    workPhoneNo = workPhoneNo.replace(/-/g, '');
    workPhoneNoAreaCode = workPhoneNoAreaCode.replace(/-/g, '');
    workPhoneNo = workPhoneNo.substring(2, workPhoneNo.length);
    workPhoneNoAreaCode = workPhoneNoAreaCode.substring(0, 2);
    applicant.set('Work_WS__c', workPhoneNo);
    applicant.set('Work_Area_Code__c', workPhoneNoAreaCode);
  }
  console.log(' salesoforce id in applicant block ', salesforceID);
  applicant.set('Application__c', salesforceID);
  return applicant;
}

/* This function will perform tarnsformation for Applicant Income Data receieved from Society One */
createIncome = (application, salesforceApplicantID) => {
  //  app.Loan_Term_Months__c = application.field;
  var income = '';
  console.log('Inside createIncome Object  :', salesforceApplicantID)
  income = nforce.createSObject('Income__c');
  var incomeSourceList = {
    "Full Time": "My permanent - full time job",
    "Part Time": "My permanent - part time job",
    "Casual": "My casual/temporary job",
    "Contract": "My contracting job",
    "Seasonal": "My seasonal job",
    "Self Employed": "My self-employed business",
    "Pension/Government Benefits": "My pension",
    "Not In Paid Employment": "Unemployed",
    "Unemployed": "Unemployed"
  };

  var incomeFrequency = {
    "Weekly": "Week",
    "Fortnightly": "Fortnight",
    "Monthly": "Month",
    "Yearly": "Year",
  };
  var employmentType = application.customerRelationships[0].employment[0].employmentType;
  var incomeSource = incomeSourceList[application.customerRelationships[0].employment[0].employmentStatus];
  var incomeFrequency = incomeFrequency[application.customerRelationships[0].incomeFrequency];
  var incomeAmount = application.customerRelationships[0].annualIncomeAfterTax;//"10000.00"; 
  if (application.customerRelationships[0].incomeFrequency == 'Monthly') {
    incomeAmount = incomeAmount / 12;
  } else if (application.customerRelationships[0].incomeFrequency == 'Fortnightly') {
    incomeAmount = incomeAmount / 26;
  } else if (application.customerRelationships[0].incomeFrequency == 'Weekly') {
    incomeAmount = incomeAmount / 52;
  }
  console.log(' Employment Type ||||| ', employmentType);
  console.log(' Income Source ||||| ', incomeSource);
  console.log(' Income incomeAmount ||||| ', incomeAmount);
  console.log(" INDUSTRY ", application.customerRelationships[0].industry);

  var employerPhoneAreaCode = '';
  var employerPhoneNumber = '';
  var employerPhone = application.customerRelationships[0].employment[0].employerPhone;
  if (employerPhone) {
    employerPhone = employerPhone.replace(/-/g, '');
    employerPhoneAreaCode = employerPhone.substring(0, 2);
    employerPhoneNumber = employerPhone.substring(2, employerPhone.length);
  }


  if (employmentType == 'CurrentEmployment') {
    income.set('Income_Source__c', incomeSource);
    income.set('Income_Interval__c', incomeFrequency);
    income.set('Income_Amount__c', incomeAmount);
    income.set('Total_Income__c', incomeAmount);
    income.set('Emp_Bus_Name__c', application.customerRelationships[0].employment[0].employerName);
    income.set('Emp_Bus_Contact_No__c', employerPhone);
    income.set('Years_With_Employer__c', application.customerRelationships[0].employment[0].employmentYears);
    income.set('Months_With_Employer__c', application.customerRelationships[0].employment[0].employmentMonths);
    income.set('Occupation__c', application.customerRelationships[0].industry);
    if (employerPhone) {
      income.set('Employer_Business_Contact_No_Area_Code__c', employerPhoneAreaCode);
      income.set('Employer_Business_Contact_No_WS__c', employerPhoneNumber);
    }

  }
  income.set('Applicant__c', salesforceApplicantID);
  return income;
};

/* This function will perform tarnsformation for Applicant Other Income Data receieved from Society One */
createOtherIncome = (application, salesforceApplicantID) => {
  console.log(' Inside Otehr Income  Object  :', salesforceApplicantID);
  var otherIncome = [];
  var incomeSourceList = {
    "My permanent - full time job": "My permanent - full time job",
    "Full Time": "My permanent - full time job",
    "My permanent - part time job": "My permanent - part time job",
    "Part Time": "My permanent - part time job",
    "Temporary": "My casual/temporary job",
    "Casual": "My casual/temporary job",
    "Contracting": "My contracting job",
    "Contract": "My contracting job",
    "Seasonal": "My seasonal job",
    "Self Employed": "My self-employed business",
    "Pension": "My pension",
    "Workers Compensation": "My workers compensation",
    "Rental": "My rental property",
    "Child Support": "My child support",
    "Other": "My other source of income"
  };
  var incomeFrequency = {
    "Weekly": "Week",
    "Fortnightly": "Fortnight",
    "Monthly": "Month",
    "Yearly": "Year",
  };

  if (application.otherIncome) {
    application.otherIncome.forEach(function (otherIncomeObject) {
      var sfIncomeOther = nforce.createSObject('Income__c');
      sfIncomeOther.set('Income_Source__c', incomeSourceList[otherIncomeObject.otherIncomeSource]);
      sfIncomeOther.set('Income_Interval__c', incomeFrequency[otherIncomeObject.otherIncomeFrequency]);
      var otherIncomeAmount = otherIncomeObject.otherAnnualIncomeAfterTax;//"10000.00"; 
      if (otherIncomeObject.otherIncomeFrequency == 'Monthly') {
        otherIncomeAmount = otherIncomeAmount / 12;
      } else if (otherIncomeObject.otherIncomeFrequency == 'Fortnightly') {
        otherIncomeAmount = otherIncomeAmount / 26;
      } else if (otherIncomeObject.otherIncomeFrequency == 'Weekly') {
        otherIncomeAmount = otherIncomeAmount / 52;
      }

      var employerOtherPhone = otherIncomeObject.employerPhone;
      var employerOtherPhoneAreaCode = '';
      var employerOtherPhoneNumber = '';
      if (employerOtherPhone) {
        employerOtherPhone = employerOtherPhone.replace(/-/g, '');
        employerOtherPhoneAreaCode = employerOtherPhone.substring(0, 2);
        employerOtherPhoneNumber = employerOtherPhone.substring(2, employerOtherPhone.length);
        sfIncomeOther.set('Employer_Business_Contact_No_Area_Code__c', employerOtherPhoneAreaCode);
        sfIncomeOther.set('Employer_Business_Contact_No_WS__c', employerOtherPhoneNumber);
      }

      sfIncomeOther.set('Income_Amount__c', otherIncomeAmount);
      sfIncomeOther.set('Total_Income__c', otherIncomeAmount);
      sfIncomeOther.set('Emp_Bus_Name__c', otherIncomeObject.employerName);
      sfIncomeOther.set('Emp_Bus_Contact_No__c', employerOtherPhone);
      sfIncomeOther.set('Years_With_Employer__c', otherIncomeObject.employerYear);
      sfIncomeOther.set('Months_With_Employer__c', otherIncomeObject.employerMonth);
      sfIncomeOther.set('Occupation__c', otherIncomeObject.industry);
      sfIncomeOther.set('Applicant__c', salesforceApplicantID);
      otherIncome.push(sfIncomeOther);
    }, this);
  }
  return otherIncome;
};

/* Populated Expense field mapping */
createExpense = (application, salesforceApplicantID) => {
  var sfExpense = nforce.createSObject('Expense__c');
  console.log(' Inside createExpense Object  :', salesforceApplicantID);
  var expenseDetails = application.expenses;
  if (application.expenses) {
    //application.expenses.forEach(function (expenseObject) {
    var homeTotal = expenseDetails.homeTotal;
    var largeBillsAndRecurringExpense = expenseDetails.largeBillsAndRecurringExpense;
    var totalLiveingExpense = homeTotal + largeBillsAndRecurringExpense;
    sfExpense.set('Living_Exp__c', totalLiveingExpense);
    sfExpense.set('Living_Exp_Int__c', 'Month');
    sfExpense.set('Rent_Board_Pay_Amt__c', expenseDetails.homeMortgageOrRent);
    var addressTypeInfo = application.customerRelationships[0].addresses[0].addressType;
    if (addressTypeInfo == 'CurrentAddress') {
      sfExpense.set('Agent_Landlord_Name__c', truncate(application.customerRelationships[0].addresses[0].agentLandlord, 30));
    }
    sfExpense.set('I_Pay_All_Exp__c', expenseDetails.isPayAllExpense);
    sfExpense.set('Applicant__c', salesforceApplicantID);
  }
  return sfExpense;
};

/* Populated Asset field mapping */
createAsset = (application, salesforceApplicantID) => {
  var assets = [];
  var assetExempt = true;
  console.log(' Inside createAsset Object | salesforceApplicantID :', salesforceApplicantID);
  var securityArray = application.securities;
  if (application.securities) {
    assetExempt = false;
    application.securities.forEach(function (assetObject) {
      var sfAsset = nforce.createSObject('Asset__c');
      console.log('ASSET CATEGORY : assetCategory ', assetObject.assetCategory);
      console.log('ASSET CATEGORY : vehicleMake', assetObject.vehicleMake);
      console.log('ASSET CATEGORY : vehicleModel', assetObject.vehicleModel);
      console.log('ASSET CATEGORY : vehicleYear', assetObject.vehicleYear);
      sfAsset.set('Asset_Category__c', assetObject.assetCategory);
      sfAsset.set('Asset_Value__c', assetObject.value);
      sfAsset.set('Vehicle_Make__c', assetObject.vehicleMake);
      sfAsset.set('Vehicle_Model__c', assetObject.vehicleModel);
      sfAsset.set('Vehicle_Year__c', assetObject.vehicleYear);
      sfAsset.set('Ownership_Status__c', assetObject.assetOwnership);
      sfAsset.set('Total_Assets__c', '1');
      sfAsset.set('Applicant__c', salesforceApplicantID);
      assets.push(sfAsset);
    });
  }
  return assets;
};

/* Populated Debts field mapping */
createLiability = (application, salesforceApplicantID) => {
  var liabilities = [];
  console.log(' Inside createAsset Object | salesforceApplicantID :', salesforceApplicantID);
  var debtArray = application.debt;
  if (application.debt) {
    application.debt.forEach(function (debtObject) {
      var sfDebt = nforce.createSObject('Liability__c');
      //if (security.debt) {
      sfDebt.set('Debt_Category__c', debtObject.debtType);
      sfDebt.set('Financier_Name__c', debtObject.financialInstitution);
      if (debtObject.debtType == 'Store card' || debtObject.debtType == 'Credit card' || debtObject.debtType == 'Overdraft') {
        sfDebt.set('Card_Overdraft_Bal_Amt__c', debtObject.outstandingBalance);
        sfDebt.set('Credit_Limit_Amt__c', debtObject.withALimitOf);
      }
      if (debtObject.debtType == 'Overdraft') {
        sfDebt.set('Overdraft_APR__c', debtObject.overdraftInterest);
      }
      if (debtObject.debtType == 'Credit card') {
        //Type_of_Credit_Card__c
        sfDebt.set('Type_of_Credit_Card__c', 'Others');
      }
      if (debtObject.debtType == 'Mortgage') {
        sfDebt.set('Mortgage_Bal_Amt__c', debtObject.outstandingBalance);
        sfDebt.set('Mortgage_Borrowed_Amt__c', debtObject.amountOriginallyBorrowed);
        sfDebt.set('Mortgage_Repayment_Amt__c', debtObject.monthlyRepaymentAmount);
        sfDebt.set('Mortgage_Repayment_Interval__c', 'Month');
      }
      if (debtObject.debtType == 'Personal loan' || debtObject.debtType == 'Car loan' || debtObject.debtType == 'Hire purchase') {
        sfDebt.set('Car_Personal_Bal_Amt__c', debtObject.outstandingBalance);
        sfDebt.set('Car_Personal_Borrowed_Amt__c', debtObject.amountOriginallyBorrowed);
        sfDebt.set('Car_Personal_Repay_Amt__c', debtObject.monthlyRepaymentAmount);
        sfDebt.set('Car_Personal_Repay_Int__c', 'Month');
      }
      if (debtObject.debtType == 'Other') {
        sfDebt.set('Other_Borrowed_Amt__c', debtObject.amountOriginallyBorrowed);
        sfDebt.set('Other_Repay_Amt__c', debtObject.onthlyRepaymentAmount);
        sfDebt.set('Other_Repay_Int__c', 'Month');
      }
      sfDebt.set('Acknowledge_Payout__c', debtObject.isConsolidateDebt);
      sfDebt.set('Applicant__c', salesforceApplicantID);
      liabilities.push(sfDebt);
      // }
    });
  };
  return liabilities;
};


function insertDebtData(application, oauth, salesforceApplicantID) {
  //add Debt
  debt = createLiability(application, salesforceApplicantID);
  if (debt) {
    // salesforceID = resp.id;
    debt.forEach(function (debtRecord) {
      org.insert({ sobject: debtRecord, oauth: oauth }, function (err, resp) {
        if (!err) console.log('It worked !! Liability__c');
        if (err) {
          debtStatusFlag = false;
          console.log('ERROR MESSAGE :Liability__c', err);

        }
      });
    });
  }

}

function insertExpensetData(application, oauth, salesforceApplicantID) {
  //add expenses
  expense = createExpense(application, salesforceApplicantID);
  if (expense) {
    org.insert({ sobject: expense, oauth: oauth }, function (err, resp) {
      if (!err) console.log('It worked !! Expense__c');
      if (err) {
        expenseStatusFlag = false;
        console.log('ERROR MESSAGE :Expense__c', err);
      }
    });

  }

}

function insertAssetData(application, oauth, salesforceApplicantID) {
  //add asset
  asset = createAsset(application, salesforceApplicantID);
  if (asset) {
    // salesforceID = resp.id;
    asset.forEach(function (assetRecord) {
      org.insert({ sobject: assetRecord, oauth: oauth }, function (err, resp) {
        if (!err) console.log('It worked !! Asset__c');
        if (err) {
          assetStatusFlag = false;
          console.log('ERROR MESSAGE :Asset__c', err);
        }
      });
    });
  }

}

function insertIncomeData(application, oauth, salesforceApplicantID) {
  //add primary Income 
  income = createIncome(application, salesforceApplicantID);
  org.insert({ sobject: income, oauth: oauth }, function (err, resp) {
    if (!err) console.log('It worked !! Income__c');
    if (err) {
      incomeStatusFlag = false;
      console.log('ERROR MESSAGE :Income__c', err);
    }
  });
}

function insertOtherIncomeData(application, oauth, salesforceApplicantID) {
  //add Other Income 
  otherIncome = createOtherIncome(application, salesforceApplicantID);
  if (otherIncome) {
    // salesforceID = resp.id;
    otherIncome.forEach(function (otherIncomeRecord) {
      org.insert({ sobject: otherIncomeRecord, oauth: oauth }, function (err, resp) {
        if (!err) console.log('It worked (Other Income Object )!! Income__c');
        if (err) {
          otherIncomeStatusFlag = false;
          console.log('ERROR MESSAGE :Income__c', err);
        }
      });
    });
  }
}

function populateStatus(application, oauth, salesforceApplicantID, statusMessage) {
  var applicationSubmitStatus = {};
  //otherIncomeStatusFlag incomeStatusFlag
  console.log('applicationStatusFlag', applicationStatusFlag);
  console.log('applicantStatusFlag', applicantStatusFlag);
  console.log('loanPurposeFlag', loanPurposeFlag);
  console.log('incomeStatusFlag', incomeStatusFlag);
  console.log('otherIncomeStatusFlag', otherIncomeStatusFlag);
  console.log('assetStatusFlag', assetStatusFlag);
  console.log('debtStatusFlag', debtStatusFlag);
  console.log('expenseStatusFlag', expenseStatusFlag);
  console.log('statusMessage', statusMessage);

  applicationSubmitStatus = nforce.createSObject('X3rd_Party_Application_Status_Log__c');
  applicationSubmitStatus.set('X3rd_Party_Application_Number__c', application.applicationNumber);
  if (applicationStatusFlag && applicantStatusFlag && loanPurposeFlag && incomeStatusFlag && assetStatusFlag && debtStatusFlag && expenseStatusFlag) {
    applicationSubmitStatus.set('Status__c', 'SUC_001');
    applicationSubmitStatus.set('Status_Code__c', 'SUC_001');
    applicationSubmitStatus.set('Status_Message__c', 'S1 Application :Application and Child create successful');
    console.log('S1 Application data insertion completed');
  } else if (statusMessage == 'Email already exists.') {
    applicationSubmitStatus.set('Status__c', 'ERR_001');
    applicationSubmitStatus.set('Status_Code__c', 'ERR_001');
    applicationSubmitStatus.set('Status_Message__c', statusMessage);
    console.log('ERR_001 : S1 Application data insertion  Failed : Email already exists');
  } else {
    applicationSubmitStatus.set('Status__c', 'ERR_002');
    applicationSubmitStatus.set('Status_Code__c', 'ERR_002');
    applicationSubmitStatus.set('Status_Message__c', statusMessage);
    console.log('ERR_002 : S1 Application data insertion  Failed');
  }
  org.insert({ sobject: applicationSubmitStatus, oauth: oauth }, function (err, resp) {
    if (!err) console.log('It worked !! X3rd_Party_Application_Status_Log__c');
    if (err) {
      //incomeStatusFlag = false;
      console.log('ERROR MESSAGE :X3rd_Party_Application_Status_Log__c', err);
    }
  });


  applicationStatusFlag = true;
  applicantStatusFlag = true;
  loanPurposeFlag = true;
  incomeStatusFlag = true;
  otherIncomeStatusFlag = true;
  assetStatusFlag = true;
  debtStatusFlag = true;
  expenseStatusFlag = true;
  statusMessage = '';
  configuration = '';
  org = '';
  branchLookup = '';
  brandLookup = '';
  productLookup = '';

}

exports.saveApplication = (application) => {
  var salesforceID = '';
  var salesforceApplicantID = "";
  var configuration = JSON.parse(
    fs.readFileSync('./config/configs.js')
  );
  console.log(" NODE ENV IN EXPORT APPS", env.environment);
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
    app = createApplication(application);
    org.insert({ sobject: app, oauth: oauth }, function (err, resp) {
      if (!err) {
        //add loan purpose
        console.log('It worked !! Application__c', resp);
        salesforceID = resp.id;
        applicant = createApplicant(application, salesforceID);
        org.insert({ sobject: applicant, oauth: oauth }, function (err, resp) {
          console.log(resp);
          if (!err) {
            console.log('It worked !! Applicant__c');
            salesforceApplicantID = resp.id;
            console.log('It worked !! salesforceApplicantID ', salesforceApplicantID);
            insertAssetData(application, oauth, salesforceApplicantID);
            insertDebtData(application, oauth, salesforceApplicantID);
            insertExpensetData(application, oauth, salesforceApplicantID);
            insertIncomeData(application, oauth, salesforceApplicantID);
            insertOtherIncomeData(application, oauth, salesforceApplicantID);
            //populateStatus(application, oauth, salesforceApplicantID);
            setTimeout(function () {
              console.log('Populate Salesforce Application Status Log');
              populateStatus(application, oauth, salesforceApplicantID, statusMessage);
            }, 7000);
          }//
          if (err) {
            applicantStatusFlag = false;
            console.log('ERROR MESSAGE :Applicant__c ', err);
            statusMessage = err.message;
            populateStatus(application, oauth, salesforceApplicantID, statusMessage);
            console.log(" STATUS MESSAGE :: ", err.message);
          }

        });
        loanPurpose = createLoanPurpose(application, salesforceID);
        org.insert({ sobject: loanPurpose, oauth: oauth }, function (err, resp) {
          if (!err) {
            console.log('It worked !! Loan_Purpose__c', resp);
          }
          if (err) {
            loanPurposeFlag = false;
            console.log('ERROR MESSAGE :Loan_Purpose__c ', err);
          }

        });
      }
      if (err) {
        applicationStatusFlag = false;
        statusMessage = err.message;
        populateStatus(application, oauth, salesforceApplicantID, statusMessage);
        console.log('ERROR MESSAGE ', err);
        console.log(" STATUS MESSAGE :: ", err.message);
      }

    });

  });
}

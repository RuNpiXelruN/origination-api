"# OriginationApps" 
This is the Origination Application, a node application built using express and Salesforce REST API (npm package : nforce) and deploy in Heroku Platform

### How do I get set up? ###

clone or fork the repo then

set environment variable `NODE_ENV` to the appropriate environment name in the
config file. /config/config.js

run `npm install` to install the dependencies

run `npm start` to start the server

### testing ###

start with test cases :)

add them under test/index.js

### start coding ###

Define your API in the swagger yaml spec in `app/api`

Add your APIs as individual JS files in `controller`

Add your API configuration in  `config/configs.js`

Add your Models as individual JS files in `model`

Add your utility or library as individual JS files in `libs`
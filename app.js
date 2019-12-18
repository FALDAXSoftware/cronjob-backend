var express = require('express');
var fs = require('fs')
var path = require('path');
var bodyParser = require('body-parser');
var cors = require('cors');
var dotenv = require('dotenv');
var app = express();
var https = require('https');
var http = require('http');
var mailer = require('express-mailer');

app.use(cors())

dotenv.load(); // Configuration load (ENV file)

// Set views folder for emails
app.set('views', __dirname + '/views');
// Set template engin for view files
app.set('view engine', 'ejs');
// SMTP setting
console.log(process.env.MAIL_HOST)
mailer.extend(app, {
  from: process.env.MAIL_FROM_NAME,
  host: process.env.MAIL_HOST, // hostname
  secureConnection: true, // use SSL
  port: 465, // port forSMTP
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD
  },
  transportMethod: "SMTP",
  // testMode: false
});

app.all('/*', function (req, res, next) {
  // CORS headers
  res.header("Access-Control-Allow-Origin", "*"); // restrict it to the required domain
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  // Set custom headers for CORS
  res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key,Client-Key,x-token');
});

var server = http.createServer(app);

// process.on('uncaughtException', function (error) {}); // Ignore error

// Start the server
app.set('port', process.env.PORT);
server.listen(app.get('port'), function () {
  console.log(process.env.PROJECT_NAME + " Application is running on " + process.env.PORT + " port....");
});

CronSendEmail = async (requestedData) => {
  var template = requestedData.template;
  var email = requestedData.email;
  var body = requestedData.extraData;
  var extraData = requestedData.extraData;
  var subject = requestedData.subject;

  console.log("requestedData", requestedData)

  await app.mailer
    .send(template, {
      to: email,
      subject: process.env.MAIL_FROM_NAME + ': ' + subject,
      content: body,
      data: extraData, // All additional properties are also passed to the template as local variables.
      PRODUCT_NAME: "Faldax",
    }, function (err) {
      console.log(err)
      if (err) {

        return 0;
      } else {
        return 1;
      }
    });
}
module.exports = CronSendEmail;

var cronjobFile = require("./services/cronJobs");
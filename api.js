var logger = require('./model/logger')('API.js');
 var express = require('express');
 var bodyParser = require('body-parser')
 var bb = require('express-busboy');
 var busboy = require('connect-busboy');
 var path = require("path");
 var inspect = require('util').inspect;
 var fs = require('fs');
 var port = process.env.PORT || 5000;
 var LOCAL = process.env.LOCAL && process.env.LOCAL.toString() == '1' || false;
 var apiMessage = null;
 var https = require('https');
 var http = require('http');
 //



 function configure(app) {
  var config = JSON.parse(fs.readFileSync(process.cwd() + '/package.json'));
  apiMessage = 'Diagnostical App Stack running version ' + config.version + '!';
  require('./model/db');
  var configureRoutes = require('./model/app.routes').configure;
  var configureProgrammedTasks = require('./model/tasks').configure;
  //CORS
  app.all('*', function(req, res, next) {
   //console.log(req.method);
   res.header("Access-Control-Allow-Origin", "*");
   res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,POST,PUT,DELETE');
   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
   if ('OPTIONS' == req.method) {
    return res.send(200);
   }
   next();
  });
  //PARSE DATA
  app.use(busboy());
  app.use(function(req, res, next) {
   if (req.busboy) {
    req.busboy.on('field', function(key, value, keyTruncated, valueTruncated) {
     console.log('field', key, value, keyTruncated, valueTruncated);
    });
   }
   next();
  });
  app.use(bodyParser.urlencoded({
   extended: true
  }))
  app.use(bodyParser.json());
  //ROOT
  app.get('/api', function(req, res) {
   res.json({
    messsage: apiMessage,
    support: config.author
   });
  });
  //ROUTES
  configureRoutes(app);
  //DIRS
  var ensureDirectory = (path) => {
    if (!fs.existsSync(path))
     fs.mkdirSync(path);
   }
   
   ensureDirectory(process.cwd()+'/public/temp');
   
   //TASKS
  configureProgrammedTasks(app);
 }
 //START
 exports.configure = configure;
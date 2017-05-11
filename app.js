require('dotenv').config();
var express = require('express');
var path = require("path");
var resolver = require(path.join(process.cwd(),'model/facades/resolver-facade'));
var app = express();
var https = require('https');
var http = require('http');
var fs = require('fs');
var config = require('./model/config');
//enviroment variables
var PROD = config.PROD;
var PORT = config.PORT;
//middlewares
require('./model/middlewares/cache-middleware').bind(app);
require('./model/middlewares/cors-middleware').bind(app);
require('./model/middlewares/skip-source-maps-middleware').bind(app);
require('./model/middlewares/request-parsers-middlewares').bind(app);
//routes
require('./model/routes/app-details-route').bind(app);
require('./model/routes/api-routes').bind(app);
require('./model/routes/views-route').bind(app);
require('./model/routes/static-routes').bind(app, express);
//static generator (generator, angular route, etc)
require('./model/services/static-generator/sg-index').configure(app).then(() => {
	var server = http.createServer(app);
	resolver.serverFacade().set(server);
	resolver.sockets().configure(server);
	server.listen(PORT, function() {
		console.log('Production? ' + (PROD ? 'Oui!' : 'Non!'));
		console.log('ServerURL', process.env.serverURL || 'http://localhost:5000');
		console.log('Diagnostical listening on port ' + PORT + '!');
	});
	
});

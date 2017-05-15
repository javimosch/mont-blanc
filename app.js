require('dotenv').config();
var path = require("path");
var co = require('co');

co(function*() {
	yield require(path.join(process.cwd(), 'model/db')).configure();
	var express = require('express');
	var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
	var logger=resolver.loggerFacade({
		name:"APP"
	});
	var app = express();
	var https = require('https');
	var http = require('http');
	var fs = require('fs');
	var config = require('./model/config');
	//enviroment variables
	var PROD = config.PROD;
	var PORT = config.PORT;
	//middlewares
	logger.debugTerminal('Middlewares');
	require('./model/middlewares/cache-middleware').bind(app);
	require('./model/middlewares/cors-middleware').bind(app);
	require('./model/middlewares/skip-source-maps-middleware').bind(app);
	require('./model/middlewares/request-parsers-middlewares').bind(app);
	//routes
	logger.debugTerminal('Routes');
	require('./model/routes/app-details-route').bind(app);
	require('./model/routes/api-routes').bind(app);
	require('./model/routes/test-routes').bind(app, express);
	require('./model/routes/views-route').bind(app);
	require('./model/routes/static-routes').bind(app, express);
	//static generator (generator, angular route, etc)
	require('./model/services/static-generator/sg-index').configure(app).then(() => {
		var server = http.createServer(app);
		resolver.serverFacade().set(server);
		resolver.sockets().configure(server);
		server.listen(PORT, function() {
			logger.debugTerminal('Production? ' + (PROD ? 'Oui!' : 'Non!'));
			logger.debugTerminal('ServerURL', 'http://localhost:'+PORT);
			logger.debugTerminal('Diagnostical listening on port ' + PORT + '!');
		});
	});

}).catch(console.error);

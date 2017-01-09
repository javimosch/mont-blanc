var express = require('express');
var watch = require('watch');
var Firebase = require("firebase");
var path = require("path");
var app = express();
var https = require('https');
var http = require('http');
var fs = require('fs');
require('dotenv').config();

var appDetails = {};

function appDetailsFill() {
	try {
		var data = JSON.parse(fs.readFileSync(process.cwd() + '/package.json'));
		Object.assign(appDetails, {
			name: data.name,
			version: data.version,
			description: data.description,
			author: data.author
		});
	}
	catch (e) {

	}
}
appDetailsFill();

app.get('/appDetails', function(req, res) {
	res.json(appDetails);
});

var PROD = process.env.PROD && process.env.PROD.toString() == '1' || false;
var port = process.env.PORT || 3000;

if (!PROD) {
	
	/*
	//livereload
	var ref = new Firebase("https://madev.firebaseio.com/diagsfront");
	var counter = 0;
	watch.watchTree(process.cwd() + '/public/', function() {
		counter++;
		ref.child('signals').update({
			reload: counter
		});
	});
	*/
}

app.use('/', express.static('./public'));

app.get('/', function(req, res) {
	var n = (PROD ? 'booking-min' : 'booking');
	res.sendFile(path.join(__dirname + '/' + n + '.html'));
});

app.get('/admin', function(req, res) {
	var n = (PROD ? 'admin-min' : 'admin');
	res.sendFile(path.join(__dirname + '/' + n + '.html'));
});

app.get('/serverRawURL', function(req, res) {
	res.json({
		URL: process.env.serverRawURL || process.env.serverURL || 'http://localhost:'+port
	});
});

app.get('/serverURL', function(req, res) {
	res.json({
		URL: process.env.serverURL || 'http://localhost:'+ port
	});
});



require('./api').configure(app);


if (process.env.SSL_CERT) {
	//HTTPS
	var options = {
		key: fs.readFileSync(process.env.SSL_KEY),
		cert: fs.readFileSync(process.env.SSL_CERT),
	};
	https.createServer(options, app).listen(port, listening);
}
else {
	//HTTP
	app.listen(port, listening);
}


function listening() {
	console.log('Production? ' + (PROD ? 'Oui!' : 'Non!'));
	console.log('serverURL', process.env.serverURL || 'http://localhost:5000');
	console.log('diags-project-frontend app listening on port ' + port + '!');
}

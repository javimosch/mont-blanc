var express = require('express');
var watch = require('watch');
var Firebase = require("firebase");
var path = require("path");
var app = express();
var https = require('https');
var http = require('http');
var fs = require('fs');
var skipMap = require('skip-map')
require('dotenv').config();
var sgTemplating = require('./tools/static-generator/sg-templates');

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

app.use(skipMap());

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

/*API ROUTES*/
app.get('/serverRawURL', function(req, res) {
	res.json({
		URL: process.env.serverRawURL || process.env.serverURL || 'http://localhost:' + port
	});
});
app.get('/serverURL', function(req, res) {
	res.json({
		URL: process.env.serverURL || 'http://localhost:' + port
	});
});
require('./api').configure(app);

var compileView = require('./model/views').compile;

//app.use("/views", express.static(__dirname + "/public/views"));


app.get('/views/*', function(req, res) {
	var fullPath = path.join(__dirname + '/public' + req.url);
	//console.log('DEBUG PREPARING VIEW', req.url);
	compileView(fullPath).then((html) => {
		//console.log('DEBUG SENDING VIEW', req.url,html.length);
		res.send(html);
	});
});


app.use("/temp", express.static(__dirname + "/public/temp"));
app.use("/js", express.static(__dirname + "/public/js"));
app.use("/img", express.static(__dirname + "/public/img"));
app.use("/fonts", express.static(__dirname + "/public/fonts"));
app.use("/files", express.static(__dirname + "/public/files"));
app.use("/css", express.static(__dirname + "/public/css"));
//app.use('/', express.static('./public'));

app.get('/app.bundle.booking.js', function(req, res) {
	res.sendFile(path.join(__dirname + '/public/app.bundle.js'));
});
app.get('/app.bundle.js', function(req, res) {
	res.sendFile(path.join(__dirname + '/public/app.bundle.booking.js'));
});
app.get('/config.json', function(req, res) {
	console.log('SENDING FILE ', path.join(__dirname + '/public/config.json'));
	res.sendFile(path.join(__dirname + '/public/config.json'));
});
app.get('/data.json', function(req, res) {
	res.sendFile(path.join(__dirname + '/public/data.json'));
});
app.get('/preprod.html', function(req, res) {
	res.sendFile(path.join(__dirname + '/public/preprod.html'));
});

require('./tools/static-generator/sg-index').configure(app).then(() => {
	//setAppRoute();
	setupServer();
});

function setAppRoute() {
	if (PROD) {
		//production!
		app.get('/*', function(req, res) {
			res.sendFile(__dirname + '/admin-min.html');
		});
	}
	else {
		app.get('/*', function(req, res) {
			res.sendFile(__dirname + '/admin.html');
		});
	}
}

function setupServer() {
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
}

function listening() {
	console.log('Production? ' + (PROD ? 'Oui!' : 'Non!'));
	console.log('ServerURL', process.env.serverURL || 'http://localhost:5000');
	console.log('Diagnostical listening on port ' + port + '!');
}

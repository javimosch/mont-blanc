var express = require('express');
var watch = require('watch');
var Firebase = require("firebase");
var path = require("path");
var app = express();
var https = require('https');
var http = require('http');
var fs = require('fs');

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

if (!PROD) {
	//livereload
	var ref = new Firebase("https://madev.firebaseio.com/diagsfront");
	var counter = 0;
	watch.watchTree(process.cwd() + '/public/', function() {
		counter++;
		ref.child('signals').update({
			reload: counter
		});
	});
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

app.get('/ma', function(req, res) {
	res.sendFile(path.join(__dirname + '/ma.html'));
});


app.get('/serverURL', function(req, res) {
	res.json({
		URL: process.env.serverURL || 'http://localhost:5000'
	});
});

var port = process.env.PORT || 3000;


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

if(process.env.INJECT_BACKEND_FROM && process.env.INJECT_BACKEND_FROM_RELATIVE_CWD){
	try{
		console.log('fs debug bs injecting ...');
	require(process.env.INJECT_BACKEND_FROM).configure(app, process.env.INJECT_BACKEND_FROM_RELATIVE_CWD);
	console.log('fs debug bs injected success');
	}catch(e){
		console.log('fs debug bs inject error',e);
	}
}


function listening() {
	console.log('Production? ' + (PROD ? 'Oui!' : 'Non!'));
	console.log('serverURL', process.env.serverURL || 'http://localhost:5000');
	console.log('diags-project-frontend app listening on port ' + port + '!');
}

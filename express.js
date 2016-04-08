var express = require('express');
var path    = require("path");
var app = express();


var PROD = process.env.PROD && process.env.PROD.toString() == '1' || false;

app.use('/', express.static('./public'));

app.get('/',function(req,res){
	var n = (PROD?'booking-min':'booking');
	res.sendFile(path.join(__dirname+'/'+n+'.html'));
});

app.get('/admin',function(req,res){
	var n = (PROD?'admin-min':'admin');
	res.sendFile(path.join(__dirname+'/'+n+'.html'));
});

app.get('/ma',function(req,res){
	res.sendFile(path.join(__dirname+'/ma.html'));
});


app.get('/serverURL',function(req,res){
	res.json({
		URL: process.env.serverURL || 'http://localhost:5000'
	});
});

var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Production? '+(PROD?'Oui!':'Non!'));
  console.log('serverURL',process.env.serverURL || 'http://localhost:5000');
  console.log('diags-project-frontend app listening on port '+port+'!');
});


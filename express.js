var express = require('express');
var path    = require("path");
var app = express();

var PROD = process.env.PROD || false;

app.use('/', express.static('./'));
app.get('/admin',function(req,res){
	var n = (PROD?'admin-min':'admin');
	res.sendFile(path.join(__dirname+'/'+n+'.html'));
});

app.get('/serverURL',function(req,res){
	res.json({
		URL: process.env.serverURL || 'http://localhost:5000'
	});
});

var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Production? '+(PROD?'Oui!':'Non!'));
  console.log('diags-project-frontend app listening on port '+port+'!');
});


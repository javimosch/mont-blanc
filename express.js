var express = require('express');
var path    = require("path");
var app = express();
app.use('/', express.static('./'));
app.get('/admin',function(req,res){
	res.sendFile(path.join(__dirname+'/admin.html'));
});
var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Example app listening on port '+port+'!');
});


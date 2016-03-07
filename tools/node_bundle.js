var bundle = require('./scripts-bundler').bundle;
var path = require('path');
//console.log(__dirname);
//console.log(path.resolve(__dirname));
bundle('./admin.html','',{name:'app.bundle',base:__dirname});
//bundle('_test.html','',{name:'bundle-test',base:__dirname});

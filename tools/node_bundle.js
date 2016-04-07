var bundle = require('./scripts-bundler').bundle;
var path = require('path');
//console.log(__dirname);
//console.log(path.resolve(__dirname));
bundle('./admin.html','public',{name:'app.bundle',base:__dirname,'root':'public'});
bundle('./booking.html','public',{name:'app.bundle.booking',base:__dirname,'root':'public'});
//bundle('_test.html','',{name:'bundle-test',base:__dirname});

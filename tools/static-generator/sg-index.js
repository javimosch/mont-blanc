var path = require('path');
var Promise = require(path.join(process.cwd(), 'model/utils')).promise;
var heTpls = require('./sg-templates');
var sander = require('sander');
module.exports = {
    configure: configure
}

function configure(app) {
    return Promise((resolve, reject, emit) => {
        heTpls.watch();
        heTpls.build().then(() => {
            console.log('DEBUG: main build all success at ' + new Date());


            var files = sander.readdirSync(path.join(process.cwd(), 'static-generator/output/js'));
            

            files.forEach((fileName) => {
                console.log('DEBUG SG-INDEX route', fileName);
                app.get('/js/'+fileName, function(req, res) {
                    res.sendFile(path.join(process.cwd(), 'static-generator/output/js/'+fileName));
                });
            });

            app.get('/css/vendor.css', function(req, res) {
                res.sendFile(path.join(process.cwd(), 'static-generator/output/css/vendor.css'));
            });
            app.get('/iframe', function(req, res) {
                res.sendFile(path.join(process.cwd(), 'static-generator/output/iframe/index.html'));
            });
            app.get('/*', function(req, res) {
                res.sendFile(path.join(process.cwd(), 'static-generator/output/index.html'));
            });

            resolve();
        });
    });
}

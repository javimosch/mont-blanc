var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var logger = resolver.loggerFacade({
    name: "GENERATOR",
    category: "INDEX"
});
var Promise = require(path.join(process.cwd(), 'model/utils')).promise;
var heTpls = require('./sg-templates');
var heData = require('./sg-data');
var sander = require('sander');
module.exports = {
    configure: configure
}

function configure(app) {

    //fetch texts from db first
    if (!heData().text) {
        return require('../views-service').fetchContext().then(context => {
            heData(context);
            return configure(app);
        });
    }
    else {}


    return Promise((resolve, reject, emit) => {
        heTpls.watch();
        heTpls.build().then(() => {
            logger.debugTerminal('Build all success');


            var files = sander.readdirSync(path.join(process.cwd(), 'static-generator/output/js'));


            files.forEach((fileName) => {
                logger.debugTerminal('Route at', '/js/' + fileName);
                app.get('/js/' + fileName, function(req, res) {
                    res.sendFile(path.join(process.cwd(), 'static-generator/output/js/' + fileName));
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

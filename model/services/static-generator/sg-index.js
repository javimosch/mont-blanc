var path = require('path');
var Promise = require(path.join(process.cwd(), 'model/utils')).promise;
var heTpls = require('./sg-templates');
var heData = require('./sg-data');
var sander = require('sander');
module.exports = {
    configure: configure
}

function configure(app) {
    
    //fetch texts from db first
    if(!heData().text){
        console.log('sg-index-wait');
        return require('../views-service').getContext().then(context=>{
            heData(context);
            console.log('sg-index-set-texts');    
            return configure(app);
        });
    }else{
        console.log('sg-index-continue');
    }
    
    
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

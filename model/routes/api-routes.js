var path = require("path");
var config = require(path.join(process.cwd(), 'model/config'));
var fs = require('fs');
require(path.join(process.cwd(), 'model/db'));
var ensureDirectory = require(path.join(process.cwd(), 'model/utils')).ensureDirectory;
var configureProgrammedTasks = require(path.join(process.cwd(), 'model/tasks')).configure;

var configureRoutes = require(path.join(process.cwd(), 'model/app.routes')).configure;
module.exports = {
    bind: (app) => {
        /*API ROUTES*/
        app.get('/serverRawURL', function(req, res) {
            res.json({
                URL: process.env.serverRawURL || process.env.serverURL || 'http://localhost:' + config.PORT
            });
        });
        app.get('/serverURL', function(req, res) {
            res.json({
                URL: process.env.serverURL || 'http://localhost:' + config.PORT
            });
        });

        app.get('/api', function(req, res) {
            var config = JSON.parse(fs.readFileSync(process.cwd() + '/package.json'));
            var apiMessage = 'Diagnostical App Stack running version ' + config.version + '!';
            res.json({
                messsage: apiMessage,
                support: config.author
            });
        });

        var API_ERRORS = require(path.join(process.cwd(), 'model/errors'));
        app.get('/api/errors', function(req, res) {
            var json = {};
            for (var x in API_ERRORS) {
                if (typeof API_ERRORS[x] != 'function') {
                    json[x] = API_ERRORS[x];
                }
            }
            res.json(json);
        });

        configureRoutes(app);
        ensureDirectory(process.cwd() + '/public/temp');
        configureProgrammedTasks(app);
    }
}

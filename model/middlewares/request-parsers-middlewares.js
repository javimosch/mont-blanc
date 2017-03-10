var busboy = require('connect-busboy');
var bodyParser = require('body-parser')
module.exports = {
    bind: (app) => {
        app.use(busboy());
        app.use(function(req, res, next) {
            if (req.busboy) {
                req.busboy.on('field', function(key, value, keyTruncated, valueTruncated) {
                    console.log('field', key, value, keyTruncated, valueTruncated);
                });
            }
            next();
        });
        app.use(bodyParser.urlencoded({
            extended: true
        }))
        app.use(bodyParser.json());
    }
}

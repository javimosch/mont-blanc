var fs = require('fs');
module.exports = {
    bind: (app) => {
        var appDetails = {};

        function appDetailsFill() {
            try {
                var data = JSON.parse(fs.readFileSync(process.cwd() + '/package.json'));
                Object.assign(appDetails, {
                    name: data.name,
                    version: data.version,
                    description: data.description,
                    author: data.author
                });
            }
            catch (e) {

            }
        }
        appDetailsFill();
        app.get('/appDetails', function(req, res) {

            res.header("Access-Control-Allow-Origin", '*');
            res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,POST,PUT,DELETE');
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            if ('OPTIONS' == req.method) {
                return res.send(200);
            }

            res.json(appDetails);
        });
    }
}

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
            res.json(appDetails);
        });
    }
}

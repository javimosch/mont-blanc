var sander = require('sander');
var path = require("path");
module.exports = {
    bind: (app, express) => {
        if (sander.existsSync(path.join(process.cwd(), 'resources'))) {
            console.log('DEBUG RES -> RESOURCES ON');
            app.use("/res", express.static(path.join(process.cwd(), 'resources')));
        }
        else {
            console.log('DEBUG RES -> RESOURCES OFF');
        }

        var setStatic = (name, _path, app, express) => {
            app.use("/" + name, express.static(path.join(process.cwd(), _path, name)));
        }
        var exposeFile = (fileName, fromPath, app) => {
            app.get('/' + fileName, function(req, res) {
                res.sendFile(path.join(process.cwd(), fromPath, fileName));
            });
        }
        var folders = ['temp', 'js', 'img', 'fonts', 'files', 'css'];

        folders.forEach(folder => {
            setStatic(folder, 'public', app, express);
        });

        var publicFiles = ['app.bundle.js', 'app.bundle.booking.js', 'config.json', 'data.json', 'sitemap.xml', 'preprod.html'];
        publicFiles.forEach(fileName => {
            exposeFile(fileName, 'public', app);
        })


    }
};

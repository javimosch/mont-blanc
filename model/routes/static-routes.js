var sander = require('sander');
var path = require("path");
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var logger = resolver.loggerFacade({
    name: "ROUTES",
    category: "STATIC"
});
module.exports = {
    bind: (app, express) => {
        if (sander.existsSync(resolver.resourcesPath())) {
            logger.debugTerminal('Resource folder ON', resolver.resourcesPath());
            app.use("/res", express.static(resolver.resourcesPath()));
        }
        else {
            logger.debugTerminal('Resource folder OFF');
        }
        
        app.use("/npm", express.static(path.join(process.cwd(),'node_modules')));

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

        var publicFiles = ['app.bundle.js', 'app.bundle.booking.js', 'config.json', 'data.json', 'sitemap.xml', 'preprod.html', '26D4AD87308CB9A1ED87F81FE9DDD388.txt'];
        publicFiles.forEach(fileName => {
            exposeFile(fileName, 'public', app);
        })


    }
};

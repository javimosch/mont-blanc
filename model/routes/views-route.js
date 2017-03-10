var path = require("path");
module.exports = {
    bind: (app) => {
        var compileView = require(path.join(process.cwd(), 'model/services/views-service')).compile;
        //app.use("/views", express.static(__dirname + "/public/views"));
        app.get('/views/*', function(req, res) {
            var fullPath = path.join(process.cwd(),'public',req.url);
            //console.log('DEBUG PREPARING VIEW', req.url);
            compileView(fullPath).then((html) => {
                //console.log('DEBUG SENDING VIEW', req.url,html.length);
                res.send(html);
            });
        });
    }
};

var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var logger = resolver.loggerFacade({
    name: "MIDDLEWARE",
    category: "CORS"
});
module.exports = {
    bind: (app) => {
        if (resolver.env().DISABLE_CORS) {
            logger.debugTerminal('DISABLED');
            return;
        }

        var origin = process.env.CORS_ORIGIN || "*";
        logger.debugTerminal('Origin is', origin);

        app.all('*', function(req, res, next) {
            //console.log(req.method);
            res.header("Access-Control-Allow-Origin", origin);
            res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,POST,PUT,DELETE');
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

            if (req.method === 'POST') {
                if (!req.headers.origin) {
                    logger.warn('Anhautorized request', '(No origin present)', req.url);
                    return res.send(401);
                }
                else {
                    if (origin.indexOf(req.headers.origin) == -1) {
                        logger.warn('Anhautorized request', "(Origin mismatch)", req.url,'Provided:',req.headers.origin);
                    }
                }
            }

            if ('OPTIONS' == req.method) {
                return res.send(200);
            }
            next();
        });
    }
};

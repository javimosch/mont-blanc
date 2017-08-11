var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var logger = resolver.loggerFacade({
    name: "MIDDLEWARE",
    category: "CORS"
});

var helmet = require('helmet')
var cookieParser = require('cookie-parser')
var csrf = require('csurf')

module.exports = {
    bind: (app) => {

        var useragent = require('express-useragent');

        app.use(useragent.express());

        if (!resolver.env().DISABLE_HELMET) {
            app.use(helmet());
        }else{
            logger.debugTerminal("HELMET DISABLED");
        }


        app.use(cookieParser());

        if (!resolver.env().DISABLE_CSRF) {
            app.use(csrf({
                cookie: {
                    key: "CXNlcg"
                }
            }));
        }else{
            logger.debugTerminal("CSRF DISABLED");
        }

        app.get('/CXNlcg', function(req, res) {
            res.json({ result: req.csrfToken() });
        });

        // error handler 
        app.use(function(err, req, res, next) {
            if (err.code !== 'EBADCSRFTOKEN') return next(err);
            res.status(401).json({
                status: 401,
                ok: false,
                err: {
                    message: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTfBwieyP-iyoXZC-8Vu6dn3U8AMqXuRX6IcMePS2fqH605QXTI"
                },
                result: null
            });
        });

        app.all('*', function(req, res, next) {
            //logger.debug('Cookies: ', req.cookies);
            next();
        });

        if (resolver.env().DISABLE_CORS) {
            logger.debugTerminal('DISABLED');
            return;
        }

        var origin = process.env.CORS_ORIGIN || "*";
        logger.debugTerminal('Origin is', origin);

        logger.debugTerminal('SET');
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
                        logger.warn('Anhautorized request', "(Origin mismatch)", req.url, 'Provided:', req.headers.origin);
                    }
                }
            }

            if ('OPTIONS' == req.method) {
                logger.debugTerminal('OPTIONS OK');
                return res.send(200);
            }

            logger.debugTerminal('OK');

            next();
        });
    }
};

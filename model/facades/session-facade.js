var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var logger = resolver.loggerFacade({
    name: "FACADE",
    category: "Session"
});

const SESSION_DURATION_MINUTES = 60 * 4;
const SESSION_EXPIRED_ERROR = 401; //This will trigger a 401 response

var sessionFacade = module.exports = {
    authorize: (data, controllerName, actionName) => {
        return resolver.coWrap(function*() {
            if (!data || !data._token) return resolver.Promise.reject(SESSION_EXPIRED_ERROR);
            var session = yield getSessionFromToken(data._token);
            if (isSessionExpired(session, data._token)) {
                //logger.debug('Session expired!', controllerName, actionName);
                return resolver.Promise.reject(SESSION_EXPIRED_ERROR);
            }
            else {
                //logger.debug('Authorized!', controllerName, actionName);
                delete data._token;
                return resolver.Promise.resolve(data);
            }
        })();
    },
    isExpired: (data, controllerName) => {
        return resolver.coWrap(function*() {
            if (!data || !data._token) return resolver.Promise.resolve(true);
            var session = yield getSessionFromToken(data._token);
            if (isSessionExpired(session, data._token)) {
                return resolver.Promise.resolve(true);
            }
            else {
                return resolver.Promise.resolve(false);
            }
        })();
    },
    update: (user) => {
        return resolver.coWrap(function*() {
            if (!user) {
                logger.warn('(sessionFacade.update) invalid user');
                return resolver.Promise.reject();
            }
            var session = yield resolver.controllers().sessions.model.findOne({
                email: user.email
            });
            var expiresAt = Date.now() + 1000 * 60 * SESSION_DURATION_MINUTES;
            var token = resolver.getFacade('encrypt').encodeObject({
                email: user.email,
                expiresAt: expiresAt
            });
            if (session) {
                session.token = token;
                session.expiresAt = expiresAt;
                yield session.save();
            }
            else {
                var payload = {
                    email: user.email,
                    token: token,
                    expiresAt
                };
                // logger.debug('Session create', payload);
                session = yield resolver.controllers().sessions.model.create(payload);
            }
            user._sessionToken = session.token;
            return resolver.Promise.resolve(user);
        })();
    }
}

function isSessionExpired(session, token) {
    //logger.debug('expired:START',session,token);
    if (session) {
        if (session.token.toString() != token.toString()) {
            //logger.debug('expired:token mismatch','SAVED:',session.token,'XHR',token);
            return true;
        }
        if (session.expiresAt < Date.now()) {
            //logger.debug('expired:token expired');
            return true;
        }
        //logger.debug('expired:false');
        return false;
    }
    //logger.debug('expired:no-session');
    return true;
}

function getSessionFromToken(token) {
    return resolver.coWrap(function*() {
        logger.debug('Decode token:start', token);
        try {
            var decoded = resolver.getFacade('encrypt').decodeObject(token);
            //logger.debug('Decode token:success', decoded);
            var session = yield resolver.controllers().sessions.model.findOne({
                email: decoded.email
            });
            logger.debug('Decode token:session?', session);
            return resolver.Promise.resolve(session);
        }
        catch (err) {}
        return resolver.Promise.resolve(null);
    })();
}

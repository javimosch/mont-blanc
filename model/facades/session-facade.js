var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var logger = resolver.loggerFacade({
    name: "FACADE",
    category: "Session"
});

const SESSION_DURATION_MINUTES = 60 * 4;
const SESSION_EXPIRED_ERROR = 401; //This will trigger a 401 response

var mongoose = require('mongoose');
var BookingSessionSchema = new mongoose.Schema({
    identifier:{
        type:String,
        unique:true,
        index:true
    }
}, { strict: false });
var BookingSession = mongoose.model('BookingSession', BookingSessionSchema);
var bookingSessions = [];
var shortid = require('shortid');
var satelize = require('satelize');
var BOOKING_SESSION_LIFETIME_IN_MINUTES = 5;
setInterval(()=>{
    try{
         BookingSession.find({}).exec().then(docs=>{
             logger.log('DOCS',docs.length);
            docs.forEach(doc=>{
                if(!bookingSessions[doc.identifier]) {
                    return BookingSession.remove({
                        _id:doc._id
                    }).exec();
                }
                let millisecondsLeft = Date.now()-bookingSessions[doc.identifier].start;
                millisecondsLeft = 1000*60*BOOKING_SESSION_LIFETIME_IN_MINUTES - millisecondsLeft;
                BookingSession.update({
                    _id:doc._id
                },{
                    $set:{
                        remaining: (millisecondsLeft/ 1000>60)?((millisecondsLeft / 1000 / 60).toFixed(2)+' minute/s left'):((millisecondsLeft / 1000).toFixed(2)+' seconds left'),
                    }
                }).exec(); 
            });
         }).catch(err=>logger.error(err.stack));
    }catch(err){
        console.error(err.stack);
    }
},1000*5);

setInterval(()=>{
    try{
        BookingSession.find({
            updatedAt:{
                $lt:Date.now()-1000*60*60*24
            }
        }).remove().exec();
        
        BookingSession.find({
            identifier:{
                $nin:Object.keys(bookingSessions)
            }
        }).remove().exec();
    }catch(err){
        console.error(err.stack);
    }
},1000*60*5);
function saveBookingSession(session){
    console.log('bookingSessions:save');
     try{
         (new BookingSession(session)).save();
     }catch(err){logger.error(err.stack);}
}
function validBookingSession(bookingId){
    let bSession = bookingSessions[bookingId] = bookingSessions[bookingId]|| {};
    let millisecondsLeft = Date.now()-bSession.start;
    if(bSession.start && millisecondsLeft<1000*60*BOOKING_SESSION_LIFETIME_IN_MINUTES){
        return true;
    }else{
        return false;
    }
}

const atob = require('atob');
const configure = (app=>{
   app.post('/api/booking/:view',function(req,res){
       logger.log('bookingSessions:start');
        req.session.bookingId = req.session.bookingId || shortid.generate();
        let bSession = bookingSessions[req.session.bookingId] = bookingSessions[req.session.bookingId] || {};
        bSession.start = Date.now();
        bSession.identifier = req.session.bookingId;
        bSession.remaining = BOOKING_SESSION_LIFETIME_IN_MINUTES+" minutes left";
        bSession.updatedAt=Date.now();
        bSession.agent = {
            browser:req.useragent.browser,
            version:req.useragent.version,
            os:req.useragent.os,
            platform:req.useragent.platform,
            source:req.useragent.source
        };
        
        resolver.coWrap(function*(){
            if(req.body._token){
                let session = yield getSessionFromToken(req.body._token);
                bSession.email = session.email;
            }else{
                bSession.email = "(guest)";
            }
            try{
                bSession.view = atob(req.params.view);
            }catch(err){
                logger.error(err.stack);
            }
            var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.clientIp;
            if(ip){
                satelize.satelize({ip:ip}, function(err, payload) {
                    if(!err){
                        bSession.location = {
                            country:payload.country.en,
                            latitude:payload.latitude,
                            longitude:payload.longitude,
                            timezone:payload.timezone
                        };
                    }
                    saveBookingSession(bSession);
                }); 
            }else{
                saveBookingSession(bSession);
            }
        })().catch(err=>logger.error(err.stack));
        
        res.json(true); 
    }); 
});

var sessionFacade = module.exports = {
    authorize: (data, controllerName, actionName,req) => {
        return resolver.coWrap(function*() {
            
            if(req && req.session){
                if(req.session.bookingId && validBookingSession(req.session.bookingId)) {
                    delete data._token;
                    return resolver.Promise.resolve(data);
                }
            }
            
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
};
sessionFacade.configure = configure;

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

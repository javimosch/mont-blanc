var path = require("path");
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var ctrl = require('../model/db.controller').create;
var EmailHandler = null; // require('../helpers/handlers.email').actions;
var moment = require('moment');
var S = require('string');
var btoa = require('btoa')
var _ = require('lodash');
var modelName = 'notification';
var actions = {
    log: (m) => {
        console.log(modelName.toUpperCase() + ': ' + m);
    }
};


var triggerLogger = ctrl('Log').createLogger({
    name: "NOTIFICATION",
    category: "TRIGGER"
});
var dbLogger = ctrl('Log').createLogger({
    name: "NOTIFICATION",
    category: "DB"
});



var NOTIFICATION = {

    ADMIN_BOOKING_MISSING_DEPARTMENT: 'ADMIN_BOOKING_MISSING_DEPARTMENT',
    ADMIN_BOOKING_MISSING_DEPARTMENT_REQUEST: 'ADMIN_BOOKING_MISSING_DEPARTMENT_REQUEST',

    ADMIN_ADMIN_ACCOUNT_CREATED: 'ADMIN_ADMIN_ACCOUNT_CREATED',
    ADMIN_CLIENT_ACCOUNT_CREATED: 'ADMIN_CLIENT_ACCOUNT_CREATED',
    ADMIN_DIAG_ACCOUNT_CREATED: 'ADMIN_DIAG_ACCOUNT_CREATED',
    ADMIN_DIPLOME_EXPIRATION: 'ADMIN_DIPLOME_EXPIRATION',
    ADMIN_NEW_CONTACT_FORM_MESSAGE: 'ADMIN_NEW_CONTACT_FORM_MESSAGE', //notif_newContactFormMessage,
    ADMIN_ORDER_PAYMENT_DELEGATED: 'ADMIN_ORDER_PAYMENT_DELEGATED',
    ADMIN_ORDER_PAYMENT_SUCCESS: 'ADMIN_ORDER_PAYMENT_SUCCESS',
    ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS: 'ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS',
    ADMIN_ORDER_CREATED_SUCCESS: 'ADMIN_ORDER_CREATED_SUCCESS',

    CLIENT_CLIENT_NEW_ACCOUNT: 'CLIENT_CLIENT_NEW_ACCOUNT',
    CLIENT_ORDER_CREATED: 'CLIENT_ORDER_CREATED',
    CLIENT_ORDER_PAYMENT_SUCCESS: 'CLIENT_ORDER_PAYMENT_SUCCESS',
    CLIENT_ORDER_PAYMENT_SUCCESS_CHEQUE:'CLIENT_ORDER_PAYMENT_SUCCESS_CHEQUE',
    CLIENT_ORDER_DELEGATED: 'CLIENT_ORDER_DELEGATED',
    CLIENT_ORDER_QUOTATION: 'CLIENT_ORDER_QUOTATION',

    DIAG_DIAG_ACCOUNT_ACTIVATED: 'DIAG_DIAG_ACCOUNT_ACTIVATED',
    DIAG_DIAG_ACCOUNT_CREATED: 'DIAG_DIAG_ACCOUNT_CREATED',
    DIAG_NEW_RDV: 'DIAG_NEW_RDV',
    DIAG_NEW_RDV_CHEQUE:'DIAG_NEW_RDV_CHEQUE',
    DIAG_RDV_CONFIRMED: 'DIAG_RDV_CONFIRMED',

    LANDLORD_ORDER_PAYMENT_DELEGATED: 'LANDLORD_ORDER_PAYMENT_DELEGATED',
    LANDLORD_ORDER_PAYMENT_SUCCESS: 'LANDLORD_ORDER_PAYMENT_SUCCESS',

    USER_PASSWORD_RESET: 'USER_PASSWORD_RESET'
};

var _actions = {
    trigger: trigger,
    save: save,
    NOTIFICATION: NOTIFICATION,
    init: (_EmailHandler) => EmailHandler = _EmailHandler,
    add: function(data, cb) {
        if (!data.to) return cb("to required");
        if (!data.attachDocument) return cb("attachDocument required");
        resolver.getFacade('diagnostical/notification')
            .addNotification(data.type, data).then(r => cb(null, r)).catch(cb);
    },
    configureSchema: (schema) => {
        schema.pre('save', function(next) {
            //dbLogger.debugTerminal('PRE/SAVE');
            next();
        });
        schema.post('save', function() {
            //dbLogger.debugTerminal('POST/SAVE');
        });
        schema.post('remove', function() {
            dbLogger.debugTerminal('POST/REMOVE');
        });
        schema.pre('remove', function(next) {

            dbLogger.debugTerminal('PRE/REMOVE Cleaning references..', this._id);

            //References in orders are removed
            this.model('Order').update({}, {
                    "$pull": {
                        "_notifications": this._id
                    }
                }, {
                    "multi": true
                },
                next
            );
            //References in users are removed
            this.model('User').update({}, {
                    "$pull": {
                        "_notifications": this._id
                    }
                }, {
                    "multi": true
                },
                next
            );
        });
        return schema;
    }
};
Object.keys(NOTIFICATION).forEach(KEY => {
    _actions[KEY] = (data, cb) => trigger(KEY, data, cb);
});

module.exports = _actions;

function LogSave(msg, type, data) {
    ctrl('Log').save({
        message: msg,
        type: type || 'error',
        data: data
    });
}

function trigger(name, data, cb) {
    return resolver.promise((resolve, reject) => {
        if (!name) return resolver.responseFacade().error('name required', cb, reject);
        if (!NOTIFICATION[name]) {
            dbLogger.warnSave('Not found', name);
            return resolver.responseFacade().error("Notification " + name + ' not found', cb, reject);
        }
        if (data._user && !data._user._id) {
            triggerLogger.setSaveData(data._user);
            return triggerLogger.errorSave('Associated User do not have field (_id)');
        }
        data.__notificationType = name;
        return EmailHandler[name](data, (err, res) => {
            if (err) return resolver.responseFacade().error(err, cb, reject);
            resolver.responseFacade().json(res, cb, resolve);
        });
    });
}



function save(data, cb) {
    var _user = data._user;

    if (!_user._id || !_user.email) {
        return ctrl('User').get({
            _id: _user,
            __select: '_id email'
        }, (err, _user) => {
            if (err) return cb(err);
            data._user = _user;
            return save(data, cb);
        });
    }
    else {
        //dbLogger.debug('User is ', _user,typeof _user);
    }

    var _userID = _user && _user._id || _user;

    if (typeof _user === 'object' && !_user._id) {
        dbLogger.setSaveData({
            detail: 'data._user needs to have an _id property.',
            data: data._user
        });
        return dbLogger.errorSave('Save error from user', _user.email);
    }

    if (!_userID) {
        dbLogger.setSaveData(data);
        dbLogger.errorSave('Not enought data to assign user');
        if (cb) cb("Not enought data to assign user");
        return;
    }

    var payload = {
        _user: _userID,
        type: data.type || 'no-type',
        to: data.to || 'not-specified',
        subject: data.subject || 'not specified',
        contents: data.html || data.contents || ''
    };
    if (data._id) payload._id = data._id;
    ctrl('Notification').save(payload, (err, _notification) => {
        if (err) {
            dbLogger.setSaveData({
                err: err,
                payload: payload
            });
            return dbLogger.errorSave('Save error from user', _user.email);
        }
        if (cb) cb(null, _notification);
    });
}

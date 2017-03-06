var Notification = require('../model/db.actions').create('Notification');
var UserNotifications = require('../model/db.actions').create('UserNotifications');
var User = require('../model/db.actions').create('User');
var Order = require('../model/db.actions').create('Order');
var Log = require('../model/db.actions').create('Log');

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

var ctrl = require('../model/db.controller').create;
var triggerLogger = ctrl('Log').createLogger({
    name: "NOTIFICATION",
    category: "TRIGGER"
});
var dbLogger = ctrl('Log').createLogger({
    name: "NOTIFICATION",
    category: "DB"
});

const MODULE = "NOTIFICATION";
var logger = require('../model/logger')(MODULE);

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

    CLIENT_CLIENT_NEW_ACCOUNT: 'CLIENT_CLIENT_NEW_ACCOUNT',
    CLIENT_ORDER_CREATED: 'CLIENT_ORDER_CREATED',
    CLIENT_ORDER_PAYMENT_SUCCESS: 'CLIENT_ORDER_PAYMENT_SUCCESS',
    CLIENT_ORDER_DELEGATED: 'CLIENT_ORDER_DELEGATED',

    DIAG_DIAG_ACCOUNT_ACTIVATED: 'DIAG_DIAG_ACCOUNT_ACTIVATED',
    DIAG_DIAG_ACCOUNT_CREATED: 'DIAG_DIAG_ACCOUNT_CREATED',
    DIAG_NEW_RDV: 'DIAG_NEW_RDV',
    DIAG_RDV_CONFIRMED: 'DIAG_RDV_CONFIRMED',

    LANDLORD_ORDER_PAYMENT_DELEGATED: 'LANDLORD_ORDER_PAYMENT_DELEGATED',
    LANDLORD_ORDER_PAYMENT_SUCCESS: 'LANDLORD_ORDER_PAYMENT_SUCCESS',

    USER_PASSWORD_RESET: 'USER_PASSWORD_RESET'
};

var _actions = {
    trigger: trigger,
    save: save,
    NOTIFICATION: NOTIFICATION,
    init: (_EmailHandler) => EmailHandler = _EmailHandler
};
Object.keys(NOTIFICATION).forEach(KEY => {
    _actions[KEY] = (data, cb) => trigger(KEY, data, cb);
});

module.exports = _actions;

function LogSave(msg, type, data) {
    Log.save({
        message: msg,
        type: type || 'error',
        data: data
    });
}

function trigger(name, data, cb) {
    dbLogger.debug('Trigger',name,data);
    if (!name) return cb && cb("name required");
    if (!NOTIFICATION[name]) {
        dbLogger.warnSave('Not found',name);
        return cb && cb("Notification " + name+' not found');
    }
    
    if(data._user && !data._user._id){
        triggerLogger.setSaveData(data._user);
        triggerLogger.warnSave('_user should have an _id');
    }
    
    data.__notificationType = name;
    return EmailHandler[name](data, cb);
}



function save(data, cb) {
    var _user = data._user;
    var _userID = _user && _user._id || _user;

    if (typeof _user === 'object' && !_user._id) {
        dbLogger.setSaveData({
            detail:'data._user needs to have an _id property.',
            data:data._user
        });
        return dbLogger.errorSave('Save error from user' , _user.email);
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
    if(data._id) payload._id = data._id;
    Notification.save(payload, (err, _notification) => {
        if (err) {
            dbLogger.setSaveData({
                err:err,
                payload:payload
            });
            return dbLogger.errorSave('Save error from user' , _user.email);
        }
        if (cb) cb(null,_notification);
    });
}

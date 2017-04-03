var path = require('path');
var ctrl = require('../model/db.controller').create;
var Order = require('../model/db.actions').create('Order');
var User = require('../model/db.actions').create('User');
var Log = require('../model/db.actions').create('Log');
var statsActions = require('./ctrl.stats');
var template = require('../utils/template');
var ERROR = require(path.join(process.cwd(), 'model/config')).ERROR;
var MailFacade = require(path.join(process.cwd(), 'model/facades/mail-facade'));
var _utils = require('../model/utils');
var moment = require('moment-timezone');
var btoa = require('btoa');
var adminUrl = require(path.join(process.cwd(), 'model/utils')).adminUrl;
var _ = require('lodash');
var Promise = require('promise');
var replaceDiagnosticalData = require(path.join(process.cwd(), 'model/facades/email-template-facade')).replaceDiagnosticalData;
var emailTriggerLogger = ctrl('Log').createLogger({
    name: "EMAIL",
    category: "TRIGGER"
});
var dbLogger = ctrl('Log').createLogger({
    name: "EMAIL",
    category: "DB"
});

const EMAIL_FROM = process.env.emailFrom || 'commande@diagnostical.fr';
const EMAIL_FROM_ALTERNATIVE = 'romain@diagnostical.fr (Romain de Diagnostical)';

function everyAdmin(cb, selectFields) {
    var payload = {
        userType: 'admin'
    };
    if (selectFields) {
        payload.__select = selectFields;
    }
    ctrl('User').getAll(payload, (_err, _admins) => {
        _admins.forEach((_admin) => {
            cb(_admin);
        });
    });
}

var EXPORT_ACTIONS = {
    EMAIL_FROM_ALTERNATIVE: EMAIL_FROM_ALTERNATIVE,

    ADMIN_BOOKING_MISSING_DEPARTMENT: ADMIN_BOOKING_MISSING_DEPARTMENT,
    ADMIN_BOOKING_MISSING_DEPARTMENT_REQUEST: ADMIN_BOOKING_MISSING_DEPARTMENT_REQUEST,

    ADMIN_ADMIN_ACCOUNT_CREATED: ADMIN_ADMIN_ACCOUNT_CREATED,
    ADMIN_CLIENT_ACCOUNT_CREATED: ADMIN_CLIENT_ACCOUNT_CREATED,
    ADMIN_DIAG_ACCOUNT_CREATED: ADMIN_DIAG_ACCOUNT_CREATED,
    ADMIN_DIPLOME_EXPIRATION: ADMIN_DIPLOME_EXPIRATION,
    ADMIN_NEW_CONTACT_FORM_MESSAGE: ADMIN_NEW_CONTACT_FORM_MESSAGE,
    ADMIN_ORDER_PAYMENT_DELEGATED: ADMIN_ORDER_PAYMENT_DELEGATED,
    ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS: ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS,
    ADMIN_ORDER_PAYMENT_SUCCESS: ADMIN_ORDER_PAYMENT_SUCCESS,
    ADMIN_ORDER_CREATED_SUCCESS: ADMIN_ORDER_CREATED_SUCCESS,

    CLIENT_CLIENT_NEW_ACCOUNT: CLIENT_CLIENT_NEW_ACCOUNT,
    CLIENT_ORDER_DELEGATED: CLIENT_ORDER_DELEGATED,
    CLIENT_ORDER_PAYMENT_SUCCESS: CLIENT_ORDER_PAYMENT_SUCCESS,

    DIAG_DIAG_ACCOUNT_ACTIVATED: DIAG_DIAG_ACCOUNT_ACTIVATED,
    DIAG_DIAG_ACCOUNT_CREATED: DIAG_DIAG_ACCOUNT_CREATED,
    DIAG_NEW_RDV: DIAG_NEW_RDV,
    DIAG_RDV_CONFIRMED: DIAG_RDV_CONFIRMED,

    LANDLORD_ORDER_PAYMENT_DELEGATED: LANDLORD_ORDER_PAYMENT_DELEGATED,
    LANDLORD_ORDER_PAYMENT_SUCCESS: LANDLORD_ORDER_PAYMENT_SUCCESS,

    USER_PASSWORD_RESET: USER_PASSWORD_RESET,

    sendDiagnosticalCustomEmail: (params, callback) => {
        if (callback) return callback('Not available');
        return new Promise((resolve, reject) => {
            DIAGS_CUSTOM_NOTIFICATION(
                params.type, params.data, (err, res) => {
                    if (err) return reject(err);
                    resolve(res);
                }, params.subject, params.to, params.collectionItem, params.collection, {
                    from: params.from || EMAIL_FROM
                });
        });
    }
};
module.exports = EXPORT_ACTIONS;



require('../controllers/ctrl.notification').init(EXPORT_ACTIONS);
var Notification = require('../model/db.actions').create('Notification');
var NotificationHandler = require('../controllers/ctrl.notification');
var NOTIFICATION = NotificationHandler.NOTIFICATION;


function saveNotificationAndSendEmail(opt, resCb) {
    var html = opt.html || template(opt.templateName, opt.templateReplace);
    if (opt.subject) {
        if (process.env.companyName) {
            opt.subject = process.env.companyName + ' | ' + opt.subject;
        }
    }
    if (!opt.to) {
        var resolutionMessage = "Email was send to " + process.env.emailTo;
        if (!process.env.emailTo) {
            resolutionMessage = "Email was not send. Configure enviromental variable 'emailTo' to send to a default email address";
        }
        emailTriggerLogger.setSaveData({
            subject: opt.subject,
            from: opt.from,
            to: opt.to,
            resolution: resolutionMessage
        });
        emailTriggerLogger.warnSave('no destinatary for ', opt.subject);
        if (!process.env.emailTo) {
            return _handleError('no destinatary found');
        }
    }
    var data = {
        attachment: opt.attachment || null,
        type: opt.__notificationType,
        html: html,
        from: opt.from || EMAIL_FROM,
        to: opt.to || process.env.emailTo,
        subject: opt.subject
    };
    var logData = _.clone(data);
    delete logData.html;
    emailTriggerLogger.setSaveData(logData);
    emailTriggerLogger.debugSave('Notification', data.type || 'undefined');
    data.metadata = {}
    if (data.attachment) {
        data.metadata.attachment = data.attachment;
    }
    if (opt._notification) {
        emailTriggerLogger.debug(opt.__notificationType, 'Fetching notification');
        Notification.getById({
            _id: opt._notification
        }, (err, _notification) => {
            if (err) return _handleError(err);
            if (!_notification) return _handleError(ERROR.DATABASE_ISSUE);
            _send(_notification);
        });
    }
    else {
        //emailTriggerLogger.debug(opt.__notificationType, 'Saving notification');
        data._user = opt._user;
        NotificationHandler.save(data, (err, _notification) => {
            if (err) return _handleError(err);
            if (!_notification) return _handleError(ERROR.DATABASE_ISSUE);
            _send(_notification);
        });
    }
    function _handleError(err) {
        emailTriggerLogger.setSaveData({
            code:ERROR.DATABASE_ISSUE_CODE,
            message:ERROR.DATABASE_ISSUE,
            detail:err
        });
        emailTriggerLogger.errorSave(ERROR.DATABASE_ISSUE);
        resCb && resCb(err);
        opt.cb && opt.cb(err);
    }
    function _send(_notification) {
        data.type = _notification.type;
        MailFacade.send(data).then(res=>{
            _updateSendStatus(_notification);
            opt.cb && opt.cb(null, res);
            resCb && resCb(null, res); 
        }).catch((err)=>{
            opt.cb && opt.cb(err, null);
            resCb && resCb(null, null); 
        });
    }
    function _updateSendStatus(_notification) {
        _notification.sended = true;
        _notification.sendedDate = Date.now();
        Notification.update(_notification, (err, n) => {
            if (err) {
                dbLogger.setSaveData(_notification)
                return dbLogger.errorSave('Save error');
            }
        });
    }
}

var TIME_ZONE = 'Europe/Paris';

function time(d) {
    return moment(d).tz(TIME_ZONE).format('HH[h]mm');
}

function dateTime(d) {
    //return moment(d).tz(TIME_ZONE).format('DD-MM-YY HH[h]mm');
    return moment(d).tz(TIME_ZONE).format('DD/MM/YY [à] HH[h]mm');
}

function dateTime2(d) {
    return moment(d).tz(TIME_ZONE).format('[Le] dddd DD MMMM YY [à] HH[h]mm')
}




function generateInvoiceAttachmentIfNecessary(data, t, cb) {
    if (data.attachmentPDFHTML) {
        emailTriggerLogger.debug(t + ':attachment-build');
        ctrl('Pdf').generate({
            fileName: 'invoice_' + Date.now(),
            html: data.attachmentPDFHTML
        }, (err, res) => {
            if (err) {
                LogSave('Unable to generate a PDF', {
                    type: t,
                    error: err
                })
                return cb(data);
            }
            if (res.ok) {
                emailTriggerLogger.debug(t + ':attachment-ok');
                data.attachment = {
                    //path: process.cwd() + '/www/temp/' + res.fileName,
                    path: _utils.getFileTempPath(res.fileName),
                    fileName: res.fileName
                };
                return cb(data);
            }
            else {
                return cb(data);
            }
        })
    }
    else {
        return cb(data);
    }
}





function DIAGS_CUSTOM_NOTIFICATION(type, data, cb, subject, to, notifItem, notifItemType, moreOptions) {
    notifItem.notifications = notifItem.notifications || {};
    if (notifItem.notifications[type] !== true || (data.forceSend != undefined && data.forceSend == true)) {



        var next = function() {
            emailTriggerLogger.debug(type, 'Calling custom fn (templating)');
            return DIAGS_CUSTOM_EMAIL(data, (err, r) => {
                notifItem.notifications[type] = true;
                ctrl(notifItemType).update(notifItem);
                if (cb) cb(err, r);
            }, subject, type, to, NOTIFICATION[type], moreOptions);
        };

        //check: if there is no forceSend and there is a notification item in notifications collection, we skip the email.
        if (!data.forceSend && data._user && data._user._id) {

            if (notifItemType !== 'User') {
                return next();
            }

            emailTriggerLogger.debug(type, 'Fetching an existing notification... (This validation apply only to notifications that belong to users)');

            return ctrl('Notification').get({
                _user: data._user._id,
                type: type,
                sended: true
            }, (err, _notification) => {
                if (err) return;
                if (_notification) {

                    emailTriggerLogger.warn(type, 'Existing notification found, email skipped.');
                    /*
                    emailTriggerLogger.setSaveData({
                        item_found:_notification
                    });
                    emailTriggerLogger.warnSave('Duplicate prevented for',type);
                    */
                }
                else {
                    next();
                }
            });
        }
        else {
            next();
        }


    }
    else {
        emailTriggerLogger.warn(type, 'Already sended');
        cb && cb('Already sended');
    }
}



//ADMIN//#1 OK ctrl.user
function ADMIN_ADMIN_ACCOUNT_CREATED(data, cb) {
    //requires: _user 
    DIAGS_CUSTOM_NOTIFICATION(
        NOTIFICATION.ADMIN_ADMIN_ACCOUNT_CREATED, data, cb, "Your Admin Account is ready", data._user.email, data._user, 'User');
}



//ADMIN//#2 OK ctrl.user
function ADMIN_CLIENT_ACCOUNT_CREATED(data, cb) {
    //requires: _user _admin
    DIAGS_CUSTOM_NOTIFICATION(
        NOTIFICATION.ADMIN_CLIENT_ACCOUNT_CREATED, data, cb, "Nouveau client", data._admin.email, data._user, 'User');
}


//ADMIN//#3 OK ctrl.user
function ADMIN_DIAG_ACCOUNT_CREATED(data, cb) {
    //requires: _user _admin
    DIAGS_CUSTOM_NOTIFICATION(
        NOTIFICATION.ADMIN_DIAG_ACCOUNT_CREATED, data, cb, "Nouveau Diagnostiqueur", data._admin.email, data._user, 'User');
}






function ADMIN_BOOKING_MISSING_DEPARTMENT_REQUEST(data, cb) {
    cb && cb(); //100% async
    ALL_ADMINS_ASYNC_CUSTOM('ADMIN_BOOKING_MISSING_DEPARTMENT_REQUEST', {
        data: data,
        select: "email password firstName",
        sendPayload: (data) => {
            return {
                to: data.to,
                subject: "ATTENTION Booking Missing Department notification availability Request",
                templateReplace: {
                    '$METADATA': data.metadata,
                    '$PROSPECT_EMAIL': data.email,
                    '$DEPARTMENT': data.department,
                    '$BACKOFFICE_URL': adminUrl('login?email=' + data._user.email + '&k=' + btoa(data._user.password || 'dummy'))
                }
            }
        }
    });
}

function ADMIN_BOOKING_MISSING_DEPARTMENT(data, cb) {
    cb && cb(); //100% async
    ALL_ADMINS_ASYNC_CUSTOM('ADMIN_BOOKING_MISSING_DEPARTMENT', {
        data: data,
        select: "email password firstName",
        sendPayload: (data) => {
            return {

                subject: "ATTENTION Booking Missing Department",
                templateReplace: {
                    '$DEPARTMENT': data.department,
                    '$BACKOFFICE_URL': adminUrl('login?email=' + data._user.email + '&k=' + btoa(data._user.password || 'dummy'))
                }
            }
        }
    });
}

function ALL_ADMINS_ASYNC_CUSTOM(type, opt) {
    var data = opt.data;
    if (!data._user) {
        return ((_type, _opt) => {
            //
            everyAdmin((_admin) => {
                if (_admin) {
                    _opt.data._user = _admin;
                    _opt.data.to = _admin.email;
                    return ALL_ADMINS_ASYNC_CUSTOM(_type, _opt);
                }
            }, _opt.select);
            //
        })(type, opt);
    }
    else {
        emailTriggerLogger.debug(type + '=' + JSON.stringify(data));
        var sendPayload = {
            to: data.to,
            __notificationType: type,
            _user: data._user,
            templateName: type,
            cb: () => {}
        };
        Object.assign(sendPayload, opt.sendPayload(data));
        saveNotificationAndSendEmail(sendPayload, () => {});
    }
}




//ADMIN//#4 OK task.diplomeExpiration
function ADMIN_DIPLOME_EXPIRATION(data, cb) {
    emailTriggerLogger.debug('ADMIN_DIPLOME_EXPIRATION=' + JSON.stringify(data));
    //data = {_admin,_diag,}
    //vars: ADMIN_NAME DIAG_NAME DIAG_DIPLOME_FILENAME DIAG_EDIT_URL
    saveNotificationAndSendEmail({
        __notificationType: data.__notificationType,
        _user: data._diag,
        to: data._admin.email,
        subject: "ATTENTION Diplôme Expiré",
        templateName: 'ADMIN_DIPLOME_EXPIRATION',
        templateReplace: {
            '$DIAG_NAME': data._diag.firstName,
            '$DIAG_MOBILE': data._diag.cellPhone,
            '$DIAG_DIPLOME_EXPIRATION_DATE': dateTime2(data._info.expirationDate),
            '$DIAG_DIPLOME_FILENAME': data.filename,
            '$DIAG_EDIT_URL': adminUrl('/diags/edit/' + data._diag._id),
        },
        cb: () => {}
    }, cb);
}

//ADMIN//#5 OK app.booking
function ADMIN_NEW_CONTACT_FORM_MESSAGE(data, cb) {
    emailTriggerLogger.debug('ADMIN_NEW_CONTACT_FORM_MESSAGE=' + JSON.stringify(data));
    cb(null, "Send in progress"); //async op
    User.getAll({
        userType: 'admin'
    }, function(err, admins) {
        if (err) {
            return LogSave('ADMIN_NEW_CONTACT_FORM_MESSAGE fail when retrieve admins. Details: ' + JSON.stringify(err));
        }
        admins.forEach(admin => {
            var _data = _.cloneDeep(data);
            _data._user = admin;
            ADMIN_NEW_CONTACT_FORM_MESSAGE_SINGLE(_data, function() {
                //no-log 
            });
        });
    });
}


//ADMIN//#5 OK app.booking
function ADMIN_NEW_CONTACT_FORM_MESSAGE_SINGLE(data, cb) {
    emailTriggerLogger.debug('ADMIN_NEW_CONTACT_FORM_MESSAGE_SINGLE=' + JSON.stringify(data));
    saveNotificationAndSendEmail({
        __notificationType: NOTIFICATION.ADMIN_NEW_CONTACT_FORM_MESSAGE,
        _user: data._user,
        to: data._user.email,
        subject: "Site contact form: new message",
        templateName: 'ADMIN_NEW_CONTACT_FORM_MESSAGE',
        templateReplace: {
            '$USER_NAME': data._user.firstName || data._user.email,
            '$CLIENT_NAME': data.fullname,
            '$CLIENT_EMAIL': data.email,
            '$CLIENT_PHONE': data.phone,
            '$CLIENT_MESSAGE': data.message
        },
        cb: () => {}
    }, cb);
}


//ADMIN//#6 OK ctrl.email
function ADMIN_ORDER_PAYMENT_DELEGATED(data, cb) {
    //requires: _user _order
    var subject = dateTime(data._order.start) + '/' + data._order.address + " Paiement Délégué";
    DIAGS_CUSTOM_NOTIFICATION(
        NOTIFICATION.ADMIN_ORDER_PAYMENT_DELEGATED, data, cb, subject, data._user.email, data._order, 'Order');
}


//ADMIN//#7 OK ctrl.order
function ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS(data, cb) {
    //requires: _user _order
    if (data._order.notifications.ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS !== true) {
        statsActions.currentMonthTotalRevenueHT({}, (_err, _currentMonthTotalRevenueHT) => {
            data._order.currentMonthTotalRevenueHT = _currentMonthTotalRevenueHT;
            DIAGS_CUSTOM_NOTIFICATION(
                NOTIFICATION.ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS, data, cb, 'Nouvelle commande prépayée', data._user.email, data._order, 'Order');
        });
    }
}

//ADMIN//#8 OK ctrl.order
function ADMIN_ORDER_CREATED_SUCCESS(data, cb) {
    //requires: _user _order
    var subject = 'Paiement créée: ' + data._order.address + '/' + dateTime(data._order.start);

    if (!data._order.notifications) {
        emailTriggerLogger.warn('ADMIN_ORDER_CREATED_SUCCESS', 'order do not have notification object.');
    }


    if (data._order.notifications.ADMIN_ORDER_CREATED_SUCCESS !== true) {
        emailTriggerLogger.debug('ADMIN_ORDER_CREATED_SUCCESS', 'Collecting month revenue');
        statsActions.currentMonthTotalRevenueHT({}, (_err, _currentMonthTotalRevenueHT) => {
            data._order.currentMonthTotalRevenueHT = _currentMonthTotalRevenueHT;
            emailTriggerLogger.debug('ADMIN_ORDER_CREATED_SUCCESS', 'Calling custom sending fn');
            DIAGS_CUSTOM_NOTIFICATION(
                NOTIFICATION.ADMIN_ORDER_CREATED_SUCCESS, data, cb, subject, data._user.email, data._order, 'Order');
        });
    }
    else {
        emailTriggerLogger.warn('ADMIN_ORDER_CREATED_SUCCESS', 'Already checked as sended, we skip this one.');
    }
}


//ADMIN//#8 OK ctrl.order
function ADMIN_ORDER_PAYMENT_SUCCESS(data, cb) {
    //requires: _user _order
    var subject = 'Paiement confirmé: ' + data._order.address + '/' + dateTime(data._order.start);
    if (data._order.notifications.ADMIN_ORDER_PAYMENT_SUCCESS !== true) {
        statsActions.currentMonthTotalRevenueHT({}, (_err, _currentMonthTotalRevenueHT) => {
            data._order.currentMonthTotalRevenueHT = _currentMonthTotalRevenueHT;
            DIAGS_CUSTOM_NOTIFICATION(
                NOTIFICATION.ADMIN_ORDER_PAYMENT_SUCCESS, data, cb, subject, data._user.email, data._order, 'Order');
        });
    }
}


//CLIENT//#1 OK ctrl.user
function CLIENT_CLIENT_NEW_ACCOUNT(data, cb) {
    //requires: _user
    DIAGS_CUSTOM_NOTIFICATION(
        NOTIFICATION.CLIENT_CLIENT_NEW_ACCOUNT, data, cb, 'Bienvenue sur Diagnostical', data._user.email, data._user, 'User');
}

//CLIENT//#2 OK ctrl.email
function CLIENT_ORDER_DELEGATED(data, cb) {

    //generateInvoiceAttachmentIfNecessary(data, NOTIFICATION.CLIENT_ORDER_DELEGATED, (data) => {
    //requires: _user _order
    var subject = 'RDV en attente de paiement: ' + data._order.address + '/' + dateTime(data._order.start);
    DIAGS_CUSTOM_NOTIFICATION(
        NOTIFICATION.CLIENT_ORDER_DELEGATED, data, cb, subject, data._user.email, data._order, 'Order');
    //});
}


//CLIENT//#3 OK ctrl.order
function CLIENT_ORDER_PAYMENT_SUCCESS(data, cb) {
    console.log('DEBUG CLIENT_ORDER_PAYMENT_SUCCESS data 1', data !== undefined);
    //generateInvoiceAttachmentIfNecessary(data, NOTIFICATION.CLIENT_ORDER_PAYMENT_SUCCESS, (data) => {
    //requires: _user _order
    console.log('DEBUG CLIENT_ORDER_PAYMENT_SUCCESS data 2', data !== undefined);
    DIAGS_CUSTOM_NOTIFICATION(
        NOTIFICATION.CLIENT_ORDER_PAYMENT_SUCCESS, data, cb, 'Rendez-vous confirmé', data._user.email, data._order, 'Order');
    //});
}


function DIAG_DIAG_ACCOUNT_ACTIVATED(data, cb) {
    DIAGS_CUSTOM_NOTIFICATION(
        NOTIFICATION.DIAG_DIAG_ACCOUNT_ACTIVATED, data, cb, "Votre compte diagnostiqueur sur Diagnostical est activé !", data._user.email, data._user, 'User', {
            from: 'romain@diagnostical.fr (Romain de Diagnostical)'
        });
}

//DIAG//#1 OK ctrl.user app.diag.complete
function DIAG_DIAG_ACCOUNT_CREATED(data, cb) {
    //requires: _user 

    //229-remove-attached-file
    //var fileName = 'mail-subscription-before-activated.docx';
    //data.attachment = {
    //path: _utils.getFilePath(fileName),
    //fileName: fileName
    //};

    DIAGS_CUSTOM_NOTIFICATION(
        NOTIFICATION.DIAG_DIAG_ACCOUNT_CREATED, data, cb, "Plus qu’une étape pour démarrer sur Diagnostical", data._user.email, data._user, 'User', {
            from: 'pierre@diagnostical.fr (Pierre de Diagnostical)'
        });
}

//DIAG//#2 OK ctrl.order
function DIAG_NEW_RDV(data, cb) {
    //requires: _user _order
    data._order.address = removeCountryFromString(data._order.address);
    var subject = 'Nouveau RDV : ' + data._order.address + ' - ' + dateTime(data._order.start);
    DIAGS_CUSTOM_NOTIFICATION(
        NOTIFICATION.DIAG_NEW_RDV, data, cb, subject, data._user.email, data._order, 'Order');
}


//DIAG//#3 OK ctrl.order
function DIAG_RDV_CONFIRMED(data, cb) {
    //requires: _user _order
    data._order.address = removeCountryFromString(data._order.address);
    var subject = 'RDV confirmé: ' + data._order.address + ' - ' + dateTime(data._order.start);
    DIAGS_CUSTOM_NOTIFICATION(
        NOTIFICATION.DIAG_RDV_CONFIRMED, data, cb, subject, data._user.email, data._order, 'Order');
}



////LANDLORD//#1 OK app.booking app.order
function LANDLORD_ORDER_PAYMENT_DELEGATED(data, cb) {
    //generateInvoiceAttachmentIfNecessary(data, NOTIFICATION.LANDLORD_ORDER_PAYMENT_DELEGATED, (data) => {
    delete data.attachmentPDFHTML;
    CLIENT_ORDER_DELEGATED(data, null);
    everyAdmin((_admin) => {
        ADMIN_ORDER_PAYMENT_DELEGATED({
            _user: _admin,
            _order: data._order
        }, null);
    });
    //requires: _user _order
    var subject = 'Diagnostic Réservé en attente de paiement';
    DIAGS_CUSTOM_NOTIFICATION(
        NOTIFICATION.LANDLORD_ORDER_PAYMENT_DELEGATED, data, cb, subject, data._order.landLordEmail, data._order, 'Order');
    //});
}


//LANDLORD//#2 OK ctrl.order
function LANDLORD_ORDER_PAYMENT_SUCCESS(data, cb) {
    //requires: _user _order
    DIAGS_CUSTOM_NOTIFICATION(
        NOTIFICATION.LANDLORD_ORDER_PAYMENT_SUCCESS, data, cb, 'Rendez-vous confirmé', data._order.landLordEmail, data._order, 'Order');
}


//USER//#1 OK front->app.login
function USER_PASSWORD_RESET(data, cb) {
    //requires: _user
    DIAGS_CUSTOM_NOTIFICATION(
        NOTIFICATION.USER_PASSWORD_RESET, data, cb, "Password reset", data._user.email, data._user, 'User');
}



function removeCountryFromString(string) {
    string = string.replace(', France', '');
    string = string.replace(', Francia', '');
    return string;
}

function DIAGS_CUSTOM_EMAIL(data, cb, _subject, templateName, _to, _type, moreOptions) {
    saveNotificationAndSendEmail({
        attachment: data.attachment || null,
        __notificationType: _type,
        _user: data._user,
        from: moreOptions && moreOptions.from || undefined,
        to: _to,
        subject: _subject,
        templateName: templateName,
        templateReplace: replaceDiagnosticalData(data),
        cb: cb
    });
}






function LogSave(msg, type, data) {
    Log.save({
        category: 'mailing',
        message: msg,
        type: type,
        data: data
    });
}

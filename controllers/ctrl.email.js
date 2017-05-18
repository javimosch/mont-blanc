var path = require('path');
var ctrl = require('../model/db.controller').create;
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

    ADMIN_BOOKING_MISSING_DEPARTMENT: ADMIN_BOOKING_MISSING_DEPARTMENT, //booking
    ADMIN_BOOKING_MISSING_DEPARTMENT_REQUEST: ADMIN_BOOKING_MISSING_DEPARTMENT_REQUEST, //booking

    ADMIN_ADMIN_ACCOUNT_CREATED: ADMIN_ADMIN_ACCOUNT_CREATED, //ctrl.user
    ADMIN_CLIENT_ACCOUNT_CREATED: ADMIN_CLIENT_ACCOUNT_CREATED, //ctrl.user
    ADMIN_DIAG_ACCOUNT_CREATED: ADMIN_DIAG_ACCOUNT_CREATED, //ctrl.user
    ADMIN_DIPLOME_EXPIRATION: ADMIN_DIPLOME_EXPIRATION, //task
    ADMIN_NEW_CONTACT_FORM_MESSAGE: ADMIN_NEW_CONTACT_FORM_MESSAGE, ///app->contact

    //internal (LANDLORD_ORDER_PAYMENT_DELEGATED)
    ADMIN_ORDER_PAYMENT_DELEGATED: ADMIN_ORDER_PAYMENT_DELEGATED,

    ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS: ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS, //??? (disabled?)
    ADMIN_ORDER_PAYMENT_SUCCESS: ADMIN_ORDER_PAYMENT_SUCCESS, //ctrl.order
    ADMIN_ORDER_CREATED_SUCCESS: ADMIN_ORDER_CREATED_SUCCESS, //ctrl.order

    CLIENT_CLIENT_NEW_ACCOUNT: CLIENT_CLIENT_NEW_ACCOUNT, //ctrl.user

    //internal (LANDLORD_ORDER_PAYMENT_DELEGATED)
    CLIENT_ORDER_DELEGATED: CLIENT_ORDER_DELEGATED,

    CLIENT_ORDER_PAYMENT_SUCCESS: CLIENT_ORDER_PAYMENT_SUCCESS, //ctrl.order
    CLIENT_ORDER_PAYMENT_SUCCESS_CHEQUE: CLIENT_ORDER_PAYMENT_SUCCESS_CHEQUE, //ctrl.order
    CLIENT_ORDER_QUOTATION: CLIENT_ORDER_QUOTATION, //ctrl.order

    DIAG_DIAG_ACCOUNT_ACTIVATED: DIAG_DIAG_ACCOUNT_ACTIVATED, //ctrl.user
    DIAG_DIAG_ACCOUNT_CREATED: DIAG_DIAG_ACCOUNT_CREATED, //ctrl.user
    DIAG_NEW_RDV: DIAG_NEW_RDV, //ctrl.order
    DIAG_NEW_RDV_CHEQUE: DIAG_NEW_RDV_CHEQUE, //ctrl.order
    DIAG_RDV_CONFIRMED: DIAG_RDV_CONFIRMED, //ctrl.order

    LANDLORD_ORDER_PAYMENT_DELEGATED: LANDLORD_ORDER_PAYMENT_DELEGATED, //booking->payment
    LANDLORD_ORDER_PAYMENT_SUCCESS: LANDLORD_ORDER_PAYMENT_SUCCESS, //ctrl.order

    USER_PASSWORD_RESET: USER_PASSWORD_RESET, //ctrl.user

    sendDiagnosticalCustomEmail: (params, callback) => {
        if (callback) return callback('Not available');
        return new Promise((resolve, reject) => {
            addNotification(
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
var NOTIFICATION = ctrl('Notification').NOTIFICATION;


function addNotificationInternal(opt, resCb) {
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
        subject: opt.subject,
        sended: false,
    };
    data.contents = data.html || data.contents || '';
    var logData = _.clone(data);
    delete logData.html;
    emailTriggerLogger.withData(logData).debugSave('Notification', data.type || 'undefined', 'queued!');
    data.metadata = {}
    if (data.attachment) {
        data.metadata.attachment = data.attachment;
    }
    if (opt._notification) {
        emailTriggerLogger.debug(opt.__notificationType, 'Fetching notification');

        ctrl('Notification').model.update({
            _id: opt._notification
        }, {
            $set: {
                sended: false
            }
        }).exec();
        _handleQueue(opt._notification, _notification);
    }
    else {
        data._user = opt._user && opt._user._id || opt._user;
        //emailTriggerLogger.debugTerminal('Creating notification..');
        ctrl('Notification').model.create(data, (err, _notification) => {
            if (err) return _handleError(err);
            _handleQueue(_notification._id, _notification);
        });
    }

    function _handleQueue(notification_id, _notification) {
        var res = {
            ok: true,
            message: "queued",
            _notification: notification_id,
            doc: _notification
        };
        opt.cb && opt.cb(null, res);
        resCb && resCb(null, res);
    }

    function _handleError(err) {
        emailTriggerLogger.setSaveData({
            code: ERROR.DATABASE_ISSUE_CODE,
            message: ERROR.DATABASE_ISSUE,
            detail: err
        });
        emailTriggerLogger.errorSave(ERROR.DATABASE_ISSUE);
        resCb && resCb(err);
        opt.cb && opt.cb(err);
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





function addNotification(type, data, cb, subject, to, notifItem, notifItemType, moreOptions) {
    addNotificationInternal({
        attachment: data.attachment || null,
        __notificationType: type,
        _user: data._user,
        from: moreOptions && moreOptions.from || undefined,
        to: to,
        subject: subject,
        templateName: type,
        templateReplace: replaceDiagnosticalData(data),
        cb: cb
    });
}



//ADMIN//#1 OK ctrl.user
function ADMIN_ADMIN_ACCOUNT_CREATED(data, cb) {
    //requires: _user 
    addNotification(
        NOTIFICATION.ADMIN_ADMIN_ACCOUNT_CREATED, data, cb, "Your Admin Account is ready", data._user.email, data._user, 'User');
}



//ADMIN//#2 OK ctrl.user
function ADMIN_CLIENT_ACCOUNT_CREATED(data, cb) {
    //requires: _user _admin
    addNotification(
        NOTIFICATION.ADMIN_CLIENT_ACCOUNT_CREATED, data, cb, "Nouveau client", data._admin.email, data._user, 'User');
}


//ADMIN//#3 OK ctrl.user
function ADMIN_DIAG_ACCOUNT_CREATED(data, cb) {
    //requires: _user _admin
    addNotification(
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
            everyAdmin((_admin) => {
                if (_admin) {
                    _opt.data._user = _admin;
                    _opt.data.to = _admin.email;
                    return ALL_ADMINS_ASYNC_CUSTOM(_type, _opt);
                }
            }, _opt.select);
        })(type, opt);
    }
    else {
        var sendPayload = {
            to: data.to,
            __notificationType: type,
            _user: data._user,
            templateName: type,
            cb: () => {}
        };
        Object.assign(sendPayload, opt.sendPayload(data));
        addNotificationInternal(sendPayload, () => {});
    }
}




//ADMIN//#4 OK task.diplomeExpiration
function ADMIN_DIPLOME_EXPIRATION(data, cb) {
    emailTriggerLogger.debug('ADMIN_DIPLOME_EXPIRATION=' + JSON.stringify(data));
    //data = {_admin,_diag,}
    //vars: ADMIN_NAME DIAG_NAME DIAG_DIPLOME_FILENAME DIAG_EDIT_URL
    addNotificationInternal({
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
    ctrl('User').getAll({
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
    addNotificationInternal({
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
    addNotification(
        NOTIFICATION.ADMIN_ORDER_PAYMENT_DELEGATED, data, cb, subject, data._user.email, data._order, 'Order');
}


//ADMIN//#7 OK ctrl.order
function ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS(data, cb) {
    //requires: _user _order
    if (data._order.notifications.ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS !== true) {
        statsActions.currentMonthTotalRevenueHT({}, (_err, _currentMonthTotalRevenueHT) => {
            data._order.currentMonthTotalRevenueHT = _currentMonthTotalRevenueHT;
            addNotification(
                NOTIFICATION.ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS, data, cb, 'Nouvelle commande prépayée', data._user.email, data._order, 'Order');
        });
    }
}

//ADMIN//#8 OK ctrl.order
function ADMIN_ORDER_CREATED_SUCCESS(data, cb) {
    var subject = 'Paiement créée: ' + data._order.address + '/' + dateTime(data._order.start);
    statsActions.currentMonthTotalRevenueHT({}, (_err, _currentMonthTotalRevenueHT) => {
        data._order.currentMonthTotalRevenueHT = _currentMonthTotalRevenueHT;
        addNotification(
            NOTIFICATION.ADMIN_ORDER_CREATED_SUCCESS, data, cb, subject, data._user.email, data._order, 'Order');
    });
}


//ADMIN//#8 OK ctrl.order
function ADMIN_ORDER_PAYMENT_SUCCESS(data, cb) {
    //requires: _user _order

    var prefix = "Paiement confirmé: ";
    if (data._order.paymentType === 'cheque') {
        prefix = "RDB Chèque: ";
    }

    var subject = prefix + data._order.address + '/' + dateTime(data._order.start);
    if (data._order.notifications.ADMIN_ORDER_PAYMENT_SUCCESS !== true) {
        statsActions.currentMonthTotalRevenueHT({}, (_err, _currentMonthTotalRevenueHT) => {
            data._order.currentMonthTotalRevenueHT = _currentMonthTotalRevenueHT;
            addNotification(
                NOTIFICATION.ADMIN_ORDER_PAYMENT_SUCCESS, data, cb, subject, data._user.email, data._order, 'Order');
        });
    }
}


//CLIENT//#1 OK ctrl.user
function CLIENT_CLIENT_NEW_ACCOUNT(data, cb) {
    //requires: _user
    addNotification(
        NOTIFICATION.CLIENT_CLIENT_NEW_ACCOUNT, data, cb, 'Bienvenue sur Diagnostical', data._user.email, data._user, 'User');
}

//CLIENT//#2 OK ctrl.email
function CLIENT_ORDER_DELEGATED(data, cb) {

    //generateInvoiceAttachmentIfNecessary(data, NOTIFICATION.CLIENT_ORDER_DELEGATED, (data) => {
    //requires: _user _order
    var subject = 'RDV en attente de paiement: ' + data._order.address + '/' + dateTime(data._order.start);
    addNotification(
        NOTIFICATION.CLIENT_ORDER_DELEGATED, data, cb, subject, data._user.email, data._order, 'Order');
    //});
}



function CLIENT_ORDER_QUOTATION(data, cb) {
    //requires: _user _order
    addNotification(
        NOTIFICATION.CLIENT_ORDER_QUOTATION, data, cb, 'devis Diagnostical', data._user.email, data._order, 'Order');
}

//CLIENT//#3 OK ctrl.order
function CLIENT_ORDER_PAYMENT_SUCCESS(data, cb) {
    console.log('DEBUG CLIENT_ORDER_PAYMENT_SUCCESS data 1', data !== undefined);
    //generateInvoiceAttachmentIfNecessary(data, NOTIFICATION.CLIENT_ORDER_PAYMENT_SUCCESS, (data) => {
    //requires: _user _order
    console.log('DEBUG CLIENT_ORDER_PAYMENT_SUCCESS data 2', data !== undefined);
    addNotification(
        NOTIFICATION.CLIENT_ORDER_PAYMENT_SUCCESS, data, cb, 'Rendez-vous confirmé', data._user.email, data._order, 'Order');
    //});
}

function CLIENT_ORDER_PAYMENT_SUCCESS_CHEQUE(data, cb) {
    addNotification(
        NOTIFICATION.CLIENT_ORDER_PAYMENT_SUCCESS_CHEQUE, data, cb, 'Rendez-vous confirmé', data._user.email, data._order, 'Order');
}




function DIAG_DIAG_ACCOUNT_ACTIVATED(data, cb) {
    addNotification(
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

    addNotification(
        NOTIFICATION.DIAG_DIAG_ACCOUNT_CREATED, data, cb, "Plus qu’une étape pour démarrer sur Diagnostical", data._user.email, data._user, 'User', {
            from: 'pierre@diagnostical.fr (Pierre de Diagnostical)'
        });
}

//DIAG//#2 OK ctrl.order
function DIAG_NEW_RDV(data, cb) {
    //requires: _user _order
    data._order.address = removeCountryFromString(data._order.address);
    var subject = 'Nouveau RDV : ' + data._order.address + ' - ' + dateTime(data._order.start);
    addNotification(
        NOTIFICATION.DIAG_NEW_RDV, data, cb, subject, data._user.email, data._order, 'Order');
}

function DIAG_NEW_RDV_CHEQUE(data, cb) {
    data._order.address = removeCountryFromString(data._order.address);
    var subject = 'Nouveau RDV : ' + data._order.address + ' - ' + dateTime(data._order.start);
    addNotification(
        NOTIFICATION.DIAG_NEW_RDV_CHEQUE, data, cb, subject, data._user.email, data._order, 'Order');
}



//DIAG//#3 OK ctrl.order
function DIAG_RDV_CONFIRMED(data, cb) {
    //requires: _user _order
    data._order.address = removeCountryFromString(data._order.address);
    var subject = 'RDV confirmé: ' + data._order.address + ' - ' + dateTime(data._order.start);
    addNotification(
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
    addNotification(
        NOTIFICATION.LANDLORD_ORDER_PAYMENT_DELEGATED, data, cb, subject, data._order.landLordEmail, data._order, 'Order');
    //});
}


//LANDLORD//#2 OK ctrl.order
function LANDLORD_ORDER_PAYMENT_SUCCESS(data, cb) {
    //requires: _user _order
    addNotification(
        NOTIFICATION.LANDLORD_ORDER_PAYMENT_SUCCESS, data, cb, 'Rendez-vous confirmé', data._order.landLordEmail, data._order, 'Order');
}


//USER//#1 OK front->app.login
function USER_PASSWORD_RESET(data, cb) {
    //requires: _user
    addNotification(
        NOTIFICATION.USER_PASSWORD_RESET, data, cb, "Password reset", data._user.email, data._user, 'User');
}



function removeCountryFromString(string) {
    string = string.replace(', France', '');
    string = string.replace(', Francia', '');
    return string;
}








function LogSave(msg, type, data) {
    ctrl('Log').save({
        category: 'mailing',
        message: msg,
        type: type,
        data: data
    });
}

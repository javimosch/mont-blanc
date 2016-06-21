var ctrl = require('../model/db.controller').create;
var Order = require('../model/db.actions').create('Order');
var User = require('../model/db.actions').create('User');
var Log = require('../model/db.actions').create('Log');
var statsActions = require('./ctrl.stats');
var template = require('../utils/template');
var sendEmail = require('../model/utils.mailing').sendEmail;
var _utils = require('../model/utils');


var moment = require('moment-timezone');


var btoa = require('btoa')
var _ = require('lodash');
var adminUrl = require('../model/utils').adminUrl;
var modelName = 'email';
var actions = {
    log: (m) => {
        console.log(modelName.toUpperCase() + ': ' + m);
    }
};



function everyAdmin(cb) {
    ctrl('User').getAll({
        userType: 'admin'
    }, (_err, _admins) => {
        _admins.forEach((_admin) => {
            cb(_admin);
        });
    });
}

var EXPORT_ACTIONS = {

    ADMIN_ADMIN_ACCOUNT_CREATED: ADMIN_ADMIN_ACCOUNT_CREATED,
    ADMIN_CLIENT_ACCOUNT_CREATED: ADMIN_CLIENT_ACCOUNT_CREATED,
    ADMIN_DIAG_ACCOUNT_CREATED: ADMIN_DIAG_ACCOUNT_CREATED,
    ADMIN_DIPLOME_EXPIRATION: ADMIN_DIPLOME_EXPIRATION,
    ADMIN_NEW_CONTACT_FORM_MESSAGE: ADMIN_NEW_CONTACT_FORM_MESSAGE,
    ADMIN_ORDER_PAYMENT_DELEGATED: ADMIN_ORDER_PAYMENT_DELEGATED,
    ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS: ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS,
    ADMIN_ORDER_PAYMENT_SUCCESS: ADMIN_ORDER_PAYMENT_SUCCESS,

    CLIENT_CLIENT_NEW_ACCOUNT: CLIENT_CLIENT_NEW_ACCOUNT,
    CLIENT_ORDER_DELEGATED: CLIENT_ORDER_DELEGATED,
    CLIENT_ORDER_PAYMENT_SUCCESS: CLIENT_ORDER_PAYMENT_SUCCESS,

    DIAG_DIAG_ACCOUNT_CREATED: DIAG_DIAG_ACCOUNT_CREATED,
    DIAG_NEW_RDV: DIAG_NEW_RDV,
    DIAG_RDV_CONFIRMED: DIAG_RDV_CONFIRMED,

    LANDLORD_ORDER_PAYMENT_DELEGATED: LANDLORD_ORDER_PAYMENT_DELEGATED,
    LANDLORD_ORDER_PAYMENT_SUCCESS: LANDLORD_ORDER_PAYMENT_SUCCESS,

    USER_PASSWORD_RESET: USER_PASSWORD_RESET,

    send: send, //calling this function directly is deprecated.
    test: () => {
        NotificationHandler.save({
            message: "test-notification-delete-now"
        }, (_notification) => {
            console.log('test-success');
        });
    }
};
module.exports = EXPORT_ACTIONS;



require('../controllers/ctrl.notification').init(EXPORT_ACTIONS);
var Notification = require('../model/db.actions').create('Notification');
var NotificationHandler = require('../controllers/ctrl.notification');
var NOTIFICATION = NotificationHandler.NOTIFICATION;


//console.log('EMAIL - NOTIFICATION',require('../actions/notification.actions'));
//console.log('EMAIL - NOTIFICATION',require('../actions/notification.actions').actions);

function dummySuccessResponse(cb) {
    actions.log('dummySuccessResponse:cb=' + JSON.stringify(cb));
    var rta = {
        ok: true,
        message: 'Success (Mailing disabled)'
    };
    if (cb) {
        cb(null, rta);
    }
    else {
        actions.log('dummySuccessResponse:rta:(no-cb)=' + JSON.stringify(rta));
    }
}

function send(opt, resCb) {
    actions.log('send:start=' + JSON.stringify(opt));
    var html = opt.html || template(opt.templateName, opt.templateReplace);
    if (opt.subject) {
        if (process.env.companyName) {
            opt.subject = process.env.companyName + ' | ' + opt.subject;
        }
    }
    var data = {
        attachment: opt.attachment || null,
        type: opt.__notificationType,
        html: html,
        from: process.env.emailFrom || 'commande@diagnostical.fr',
        to: opt.to || process.env.emailTo || 'arancibiajav@gmail.com',
        subject: opt.subject
    };
    if (opt._user) {
        if (opt._notification) {
            actions.log('send:using-_notification=' + JSON.stringify(opt._notification));
            Notification.getById({
                _id: opt._notification
            }, (err, _notification) => {
                if (err) {
                    return dblog('notification getById fail in function send');
                }
                validateSending(_notification);
            });
        }
        else {
            actions.log('send:saving-notification');
            data._user = opt._user;
            NotificationHandler.save(data, (_notification) => {
                if (_notification) {
                    _notification.__populate = {
                        _config: 'disabledTypes'
                    }
                    actions.log('send:using-_notification=' + JSON.stringify(_notification));
                    validateSending(_notification);
                }
            });
        }

        function validateSending(_notification) {
            actions.log('send:validateSending=' + JSON.stringify(_notification));
            Notification.getById(_notification, (err, _notification) => {
                if (err) {
                    return dblog('notification getById fail in function send');
                }
                if (!_.includes(_notification._config.disabledTypes, _notification.type)) {

                    if (process.env.disableMailing === '1') {
                        actions.log('send:mailing-disabled');
                        _notification.sended = true;
                        _notification.sendedDate = Date.now();
                        Notification.update(_notification, (err, _notification) => {
                            if (err) dblog('notification sended update fail in function send.');

                            if (resCb) resCb(null, {
                                message: 'Success (Mailing disabled)',
                                ok: true
                            });

                        });
                        return dummySuccessResponse(opt.cb);
                    }
                    else {
                        _send(_notification);
                    }


                }
                else {

                    if (opt.cb) {
                        return opt.cb(null, {
                            ok: true,
                            message: 'Notification type disabled'
                        })
                    }

                    if (resCb) {
                        resCb('SENDING_DISABLED_TYPE', "");
                    }
                }
            });
        }

    }
    else {
        if (process.env.disableMailing === '1') return dummySuccessResponse(opt.cb);
        _send();
    }

    function _send(_notification) {
        actions.log('send:real-sending');
        sendEmail(data, (err, r) => {
            actions.log('send:real-sending:rta: ' + JSON.stringify(r));

            if (!err && _notification) {
                _notification.sended = true;
                _notification.sendedDate = Date.now();
                Notification.update(_notification, (err, _notification) => {
                    if (err) dblog('notification sended update fail in function send.');

                    if (resCb) resCb(null, r);

                });
            }
            if (opt.cb) {
                opt.cb(err, r);
            }
            if (err) {
                dblog('sendEmail fail, the data was ' + JSON.stringify(data));
            }
        });
    }
}

var TIME_ZONE = 'Europe/Paris';

function time(d) {
    return moment(d).tz(TIME_ZONE).format('HH[h]mm');
}

function dateTime(d) {
    return moment(d).tz(TIME_ZONE).format('DD-MM-YY HH[h]mm');
}

function dateTime2(d) {
    return moment(d).tz(TIME_ZONE).format('[Le] dddd DD [de] MMMM YY [à] HH[h]mm')
}




function generateInvoiceAttachmentIfNecessary(data, t, cb) {
    if (data.attachmentPDFHTML) {
        actions.log(t + ':attachment-build');
        ctrl('Pdf').generate({
            fileName: 'invoice_' + Date.now(),
            html: data.attachmentPDFHTML
        }, (err, res) => {
            if (err) return cb();
            if (res.ok) {
                actions.log(t + ':attachment-ok');
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





function DIAGS_CUSTOM_NOTIFICATION(type, data, cb, subject, to, notifItem, notifItemType) {
    notifItem.notifications = notifItem.notifications || {};
    if (notifItem.notifications[type] !== true) {
        return DIAGS_CUSTOM_EMAIL(data, (err, r) => {
            notifItem.notifications[type] = true;
            ctrl(notifItemType).update(notifItem);
            if (cb) cb(err, r);
        }, subject, type, to, NOTIFICATION[type]);
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







//ADMIN//#4 OK task.diplomeExpiration
function ADMIN_DIPLOME_EXPIRATION(data, cb) {
    actions.log('ADMIN_DIPLOME_EXPIRATION=' + JSON.stringify(data));
    //data = {_admin,_diag,}
    //vars: ADMIN_NAME DIAG_NAME DIAG_DIPLOME_FILENAME DIAG_EDIT_URL
    send({
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
    actions.log('ADMIN_NEW_CONTACT_FORM_MESSAGE=' + JSON.stringify(data));
    cb(null, "Send in progress"); //async op
    User.getAll({
        userType: 'admin'
    }, function(err, admins) {
        if (err) {
            return dblog('ADMIN_NEW_CONTACT_FORM_MESSAGE fail when retrieve admins. Details: ' + JSON.stringify(err));
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
    actions.log('ADMIN_NEW_CONTACT_FORM_MESSAGE_SINGLE=' + JSON.stringify(data));
    send({
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

    generateInvoiceAttachmentIfNecessary(data, NOTIFICATION.CLIENT_ORDER_DELEGATED, (data) => {
        //requires: _user _order
        var subject = 'RDV en attente de paiement: ' + data._order.address + '/' + dateTime(data._order.start);
        DIAGS_CUSTOM_NOTIFICATION(
            NOTIFICATION.CLIENT_ORDER_DELEGATED, data, cb, subject, data._user.email, data._order, 'Order');
    });
}


//CLIENT//#3 OK ctrl.order
function CLIENT_ORDER_PAYMENT_SUCCESS(data, cb) {
    generateInvoiceAttachmentIfNecessary(data, NOTIFICATION.CLIENT_ORDER_PAYMENT_SUCCESS, (data) => {
        //requires: _user _order
        DIAGS_CUSTOM_NOTIFICATION(
            NOTIFICATION.CLIENT_ORDER_PAYMENT_SUCCESS, data, cb, 'Rendez-vous confirmé', data._user.email, data._order, 'Order');
    });
}



//DIAG//#1 OK ctrl.user app.diag.complete
function DIAG_DIAG_ACCOUNT_CREATED(data, cb) {
    //requires: _user 
    DIAGS_CUSTOM_NOTIFICATION(
        NOTIFICATION.DIAG_DIAG_ACCOUNT_CREATED, data, cb, "Vous êtes Diagnostiqueur sur Diagnostical !", data._user.email, data._user, 'User');
}

//DIAG//#2 OK ctrl.order
function DIAG_NEW_RDV(data, cb) {
    //requires: _user _order
    var subject = 'Nouveau RDV : ' + data._order.address + '/' + dateTime(data._order.start);
    DIAGS_CUSTOM_NOTIFICATION(
        NOTIFICATION.DIAG_NEW_RDV, data, cb, subject, data._user.email, data._order, 'Order');
}


//DIAG//#3 OK ctrl.order
function DIAG_RDV_CONFIRMED(data, cb) {
    //requires: _user _order
    var subject = 'RDV confirmé: ' + data._order.address + '/' + dateTime(data._order.start);
    DIAGS_CUSTOM_NOTIFICATION(
        NOTIFICATION.DIAG_RDV_CONFIRMED, data, cb, subject, data._user.email, data._order, 'Order');
}



////LANDLORD//#1 OK app.booking app.order
function LANDLORD_ORDER_PAYMENT_DELEGATED(data, cb) {
    generateInvoiceAttachmentIfNecessary(data, NOTIFICATION.LANDLORD_ORDER_PAYMENT_DELEGATED, (data) => {
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
    });
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
        NOTIFICATION.LANDLORD_ORDER_PAYMENT_DELEGATED, data, cb, "Password reset", data._user.email, data._user, 'User');
}

function DIAGS_CUSTOM_EMAIL(data, cb, _subject, templateName, _to, _type) {
    actions.log(_type + '=START');
    moment.locale('fr')
    var _user = data._user;
    var _order = data._order;
    var _admin = data._admin;
    var _client = data._client;
    var replaceData = {
        '$BACKOFFICE_URL': adminUrl('login?email=' + _user.email + '&k=' + btoa(_user.password || 'dummy'))
    };
    if (_user) {
        Object.assign(replaceData, {
            '$USER_EMAIL': _user.email,
            '$USER_FULL_NAME': _user.firstName || _user.email + ' ' + (_user.lastName || ''),
            '$USER_FIRSTNAME': _user.firstName || _user.email,
            '$USER_LASTNAME': _user.lastName,
            '$USER_PASSWORD': _user.password || '[Press reset password in the login screen]',
            '$USER_EMAIL': _user.email,
            '$USER_COMPANY_NAME': _user.companyName,
            '$USER_PHONE': _user.cellPhone,
            '$USER_ADDRESS': _user.address,
            '$USER_CLIENT_TYPE': _user.clientType,
            '$USER_EDIT_URL': adminUrl('/clients/edit/' + _user._id)
        });
    }
    if (_client) {
        Object.assign(replaceData, {
            '$CLIENT_EMAIL': _client.email,
            '$CLIENT_COMPANY_NAME': _client.companyName,
            '$CLIENT_FIRSTNAME': _client.lastName,
            '$CLIENT_LASTNAME': _client.lastName,
            '$CLIENT_PHONE': _client.cellPhone,
            '$CLIENT_ADDRESS': _client.address,
            '$CLIENT_TYPE': _client.clientType,
            '$CLIENT_EDIT_URL': adminUrl('/clients/edit/' + _client._id)
        });
    }
    if (_admin) {
        Object.assign(replaceData, {
            '$ADMIN_EMAIL': _admin.email,
            '$ADMIN_FIRSTNAME': _admin.firstName,
            '$ADMIN_LASTNAME': _admin.lastName
        });
    }
    if (_order) {
        Object.assign(replaceData, {
            '$CLIENT_LANDLORD_DISPLAY': (_order._client.clientType == 'landlord') ? 'block' : 'none',
            '$CLIENT_COMPANY_DISPLAY': (_order._client.clientType !== 'landlord') ? 'block' : 'none',
            '$CLIENT_HAS_COMPANY_NAME': (_order._client.companyName) ? 'block' : 'none',
            '$CLIENT_COMPANY_NAME': _order._client.companyName,
            '$CLIENT_HAS_NAME': (_order._client.firstName) ? 'block' : 'none',
            '$CLIENT_FULL_NAME': _order._client.firstName + ' ' + (_order._client.lastName || ''),
            '$CLIENT_FIRSTNAME': _order._client.firstName,
            '$CLIENT_HAS_PHONE': (_order._client.cellPhone || _order._client.fixedTel) ? 'block' : 'none',
            '$CLIENT_PHONE_NUMBER': _order._client.cellPhone || _order._client.fixedTel,
            '$CLIENT_EMAIL': _order._client.email,
            '$DIAG_EMAIL': _order._diag.email,
            '$DIAG_FULL_NAME': _order._diag.firstName + ' ' + _order._diag.lastName,
            '$DIAG_FIRSTNAME': _order._diag.firstName,
            '$DIAG_LASTNAME': _order._diag.lastName,
            '$LANDLORD_FULLNAME': _order.landLordFullName,
            '$LANDLORD_EMAIL': _order.landLordEmail,
            '$LANDLORD_PHONE': _order.landLordPhone,
            '$ORDER_DIAG_LIST': htmlOrderSelectedDiagsList(_order),
            '$ORDER_ADDRESS': _order.address,
            '$ORDER_KEYS_INFO': _order.keysAddress + ' / ' + dateTime2(_order.keysTimeFrom) + ' - ' + time(_order.keysTimeTo),

            '$ORDER_OBSERVATION': _order.obs,
            '$OBS_DISPLAY': (_order.obs) ? 'block' : 'none',

            '$ORDER_PRICE_TTC': _order.price,
            '$ORDER_PRICE_HT': _order.priceHT,
            '$ORDER_DIAG_REMUNERATION_HT': _order.diagRemunerationHT,
            '$ORDER_REVENUE_HT': _order.revenueHT,
            '$ORDER_MONTH_REVENUE_HT': _order.currentMonthTotalRevenueHT,

            '$ORDER_DATE_HOUR': dateTime2(_order.start),
            '$ORDER_DESCRIPTION': _order.info.description,
            '$ORDER_URL': adminUrl('/orders/edit/' + _order._id),
            '$ORDER_PUBLIC_URL': adminUrl('/orders/view/' + _order._id)
                //'$ORDER_DESCR': _order.address + ' (' + time(_order.diagStart) + ' - ' + time(_order.diagEnd) + ')',
        });
    }
    send({
        attachment: data.attachment || null,
        __notificationType: _type,
        _user: _user,
        to: _to,
        subject: _subject,
        templateName: templateName,
        templateReplace: replaceData,
        cb: cb
    });
}

function diagNameConvertion(key) {
    if (key == 'electricity') return 'Electricité';
    if (key == 'parasitaire') return 'Parasitaire';
    if (key == 'gaz') return 'Gaz';
    if (key == 'termites') return 'Termites';
    if (key == 'ernt') return 'État des risques naturels, miniers et technologiques';
    if (key == 'loiCarrez') return 'Carrez';
    if (key == 'crep') return 'Plomb';
    if (key == 'dta') return 'Amiante';
    if (key == 'dpe') return 'DPE';
    return key;
}

function htmlOrderSelectedDiagsList(_order) {
    var rta = "<ul>";
    Object.keys(_order.diags).forEach(key => {
        if (_order.diags[key]) {
            rta += "<li>" + diagNameConvertion(key) + "</li>";
        }
    })
    return rta + '</ul>';
}


function dblog(msg, type) {
    Log.save({
        message: msg,
        type: type
    });
}

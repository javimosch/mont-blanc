var path = require('path');
var mongoose = require('../model/db').mongoose;
var atob = require('atob'); //decode
var btoa = require('btoa'); //encode
var moment = require('moment');
var Promise = require('promise');
var _ = require('lodash');
var generatePassword = require("password-maker");
var validate = require('../model/validator').validate;
var handleMissingKeys = require('../model/validator').handleMissingKeys;
//var ClientActions = require('./handlers.client').actions;
var ctrl = require('../model/db.controller').create;
var Order = mongoose.model('Order');
var Log = require('../model/db.actions').create('Log');
var User = require('../model/db.actions').create('User');
var actions = require('../model/db.actions').create('Order');
var UserAction = require('./ctrl.user');
var utils = require('../model/utils');
//var PaymentAction = require('./handlers/payment').actions;

var email = require('./ctrl.email');
var Notif = require('./ctrl.notification');
var NOTIFICATION = Notif.NOTIFICATION;
var apiError = require(path.join(process.cwd(), 'model/errors'));
var ResponseFacade = require(path.join(process.cwd(), 'model/facades/response-facade'));
var Resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var htmlFromOrder = require(path.join(process.cwd(), 'model/facades/invoice-facade')).htmlFromOrder;
var saveKeys = ['_client', '_diag', 'start', 'end', 'diags'

    , 'address', 'price' //, 'time'
];
var paymentLogger = ctrl('Log').createLogger({
    name: "ORDER",
    category: "PAYMENT"
});
var dbLogger = ctrl('Log').createLogger({
    name: "ORDER",
    category: "DB"
});
var notificationLogger = ctrl('Log').createLogger({
    name: "ORDER",
    category: "NOTIFICATION"
});



/*ACTIONS*/
module.exports = {
    sendQuote: sendQuote,
    payUsingCheque: payUsingCheque,
    payUsingCard: payUsingCard,
    save: save,
    populate: orderPopulate, //DEPRECATED?
    _configure: (hook) => { //DEPRECATED?
        hook('preSave', preSave);
        hook('afterSave', afterSave);
    }
};


/*ACTIONS ARE HERE*/
function sendQuote(data, cb) {
    var userCtrl = ctrl('User');
    var orderCtrl = ctrl('Order');
    var notificationCtrl = ctrl('Notification');
    if (!data.order) return cb(apiError.VALIDATE_FIELD_ORDER);
    if (!data.email) return cb(apiError.VALIDATE_FIELD_EMAIL);
    if (!data.order || !data.order._id) return cb(apiError.VALIDATE_FIELD_VALID_ORDER);

    //We check if the order is ok in database
    orderCtrl.existsById(data.order._id)
        .then(exists => {
            if (exists) {
                withOrder();
            }
            else {
                cb(apiError.DATABASE_OBJECT_MISMATCH('order', 'sendQuote'));
            }
        }).catch(cb);

    function withOrder() {
        // notificationLogger.debug('SendQuote:valid');
        var userId = data.order._client && data.order._client._id || data.order._client;
        userCtrl.get({
            _id: userId
        }, (err, _user) => {
            if (err) return cb(err);
            if (_user.isSystemUser) {
                // notificationLogger.debug('SendQuote:user:get');
                userCtrl.get({
                    email: data.email
                }, (err, user) => {
                    if (err) return cb(err);
                    if (user) {
                        //  notificationLogger.debug('SendQuote:associateClient');
                        return associateClient(user._id, data.order._id)
                            .then(order => withUser(user, order))
                            .catch(cb);
                    }
                    else {
                        // notificationLogger.debug('SendQuote:user:saving-new');
                        var userPayload = {
                            firstName: data.fullName,
                            email: data.email,
                            cellPhone: data.phone,
                            isGuestAccount: true,
                        };
                        userCtrl.fetchLandlordAccount(userPayload)
                            .then((user) => {
                                //  notificationLogger.debug('SendQuote:associateClient');
                                associateClient(user._id, data.order._id)
                                    .then(order => withUser(user, order))
                                    .catch(cb);
                            })
                            .catch(cb);
                    }
                })
            }
            else {
                withUser(_user, data.order);
            }
        });
    }

    function withUser(user, order) {

        setTimeout(() => {
            // notificationLogger.debug('SendQuote:withUser');

            if (!Resolver.validatorFacade().validMongooseObject(order)) {
                return ResponseFacade.errorWithInvalidVariable('order', 'SendQuote.withUser', cb);
            }
            if (!Resolver.validatorFacade().validMongooseObject(user)) {
                return ResponseFacade.errorWithInvalidVariable('user', 'SendQuote.withUser', cb);
            }

            //notificationLogger.debug('SendQuote:notification');

            Notif.trigger(NOTIFICATION.CLIENT_ORDER_QUOTATION, {
                _order: order,
                _user: user,
                _client: user
            }, (err, res) => {
                if (err) return cb(err);
                // notificationLogger.debug('SendQuote:notification:success', res);
                return cb(null, res);
            });
        }, 2000);
    }
}

function payUsingCheque(data, routeCallback) {
    //VALIDATIONS
    if (!data.orderId) return routeCallback('orderId field required');
    if (!data.clientEmail) return routeCallback('clientId or clientEmail required');
    if (!PaymentProcessor.isAllowed(data)) {
        return PaymentProcessor.allowPayment(data, () => payUsingCheque(data, routeCallback), () => routeCallback('La commande est déjà confirmée.'), err => routeCallback(err));
    }
    paymentLogger.debug('Cheque validations ok');
    //QUEUE
    if (PaymentProcessor.inQueue(data)) {
        return routeCallback('La commande est déjà en cours de traitement.');
    }
    PaymentProcessor.addToQueue(data);
    var cb = PaymentProcessor.createCallback(data, routeCallback);
    paymentLogger.debug('Cheque to queue');
    //OK
    PaymentHelper.updateDetailsAsync(data.orderId, null, data.billingAddress);
    PaymentHelper.associateClient(data.orderId, data).then(() => {
        paymentLogger.debug('Cheque client associated');
        getNextInvoiceNumber({
            _id: data.orderId
        }, function(err, invoiceNumber) {
            if (err) return cb(err);
            paymentLogger.debug('Cheque invoice number', invoiceNumber);
            moveToPrepaid({
                _id: data.orderId,
                number: invoiceNumber,
                paymentType: 'cheque'
            }, function(_err, res) {
                paymentLogger.debug('Cheque to prepaid');
                return cb(err, true);
            });

        });
    });
}

function payUsingCard(data, routeCallback) {
    //VALIDATIONS
    if (!data.orderId) return routeCallback('orderId field required');
    if (!data.p2pDiag) return routeCallback('p2pDiag field required');
    if (!data.secret) return routeCallback('secret field required');
    var secretData = decodePayload(data.secret);
    if (!secretData.creditCardOwner) return routeCallback('credit card owner required');
    if (!secretData.clientEmail) return routeCallback('clientId or clientEmail required');
    if (!data.masterWallet) {
        return validateTechnicalWallet(data, secretData, () => payUsingCard(data, routeCallback), err => routeCallback(err));
    }
    else {
        secretData.wallet = data.masterWallet; //we use this wallet for the client payment move.
        data.p2pDiag.debitWallet = data.masterWallet; //we use this wallet for the diag p2p movement.
    }
    if (!secretData.wallet) {
        return routeCallback('Tecnical wallet for charge');
    }
    if (!data.p2pDiag.debitWallet) {
        return routeCallback('Tecnical wallet for debit required');
    }
    if (!PaymentProcessor.isAllowed(data)) {
        return PaymentProcessor.allowPayment(data, () => payUsingCard(data, routeCallback), () => routeCallback('Order already paid.'), err => routeCallback(err));
    }
    //QUEUE
    if (PaymentProcessor.inQueue(data)) {
        return routeCallback('Order payment is already being processed.');
    }
    PaymentProcessor.addToQueue(data);
    var cb = PaymentProcessor.createCallback(data, routeCallback);

    //OK
    PaymentHelper.updateDetailsAsync(data.orderId, secretData.creditCardOwner, secretData.billingAddress);
    PaymentHelper.associateClient(data.orderId, secretData).then(() => {
        getNextInvoiceNumber({
            _id: data.orderId
        }, function(err, invoiceNumber) {
            if (err) return cb(err);
            secretData.comment = secretData.comment.replace('_INVOICE_NUMBER_', invoiceNumber);
            //step 1 payment with card
            ctrl('Lemonway').moneyInWithCardId(secretData, function(err, LWRES) {
                if (err) {
                    return cb(err);
                }
                if (LWRES && LWRES.TRANS && LWRES.TRANS.HPAY && LWRES.TRANS.HPAY.STATUS == '3') {}
                else {
                    return cb({
                        message: "Invalid response from Lemonway. Check the logs."
                    });
                }
                //step 2, moving the order to prepaid
                moveToPrepaid({
                    _id: data.orderId,
                    walletTransId: LWRES.TRANS.HPAY.ID,
                    number: invoiceNumber
                }, function(_err, res) {
                    paymentLogger.debug('P2P Lookup');
                    //step 3  p2p to diag wallet 
                    var p2pPayload = data.p2pDiag;
                    p2pPayload.message = "Order #" + invoiceNumber;
                    ctrl('Lemonway').sendPayment(p2pPayload, function(err, res) {
                        return cb(err, true);
                    });
                });
            });
        });
    }).catch(cb);
}

/*HELPER METHODS*/

function getNextInvoiceNumber(data, cb) {
    function zeroFill(number, width) {
        width -= number.toString().length;
        if (width > 0) {
            return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
        }
        return number + ""; // always return a string
    }
    //data._id //order id
    if (!data._id) return cb('_id required');
    ctrl('Order').get({
        _id: data._id,
        __select: 'start _diag'
    }, function(err, _order) {
        if (err) return cb(err);
        if (!_order) {
            return cb('Order not found.');
        }
        ctrl('Order').model.count({
            status: {
                $eq: 'prepaid'
            },
            _diag: {
                $eq: _order._diag
            },
            start: {
                $gte: moment(_order.start).startOf('month')._d,
                $lte: moment(_order.start).endOf('month')._d
            }
        }, function(err, count) {
            if (err) return cb(err);
            var numberAsString = moment(_order.start).format('YYMM').toString() + zeroFill(count + 1, 3).toString();
            cb(null, numberAsString);
        });

    });
}




function LogSave(msg, type, data) {
    dbLogger.setSaveData(data);
    if (type == 'error') {
        dbLogger.errorSave(msg)
    }
    if (type == 'warning') {
        dbLogger.warnSave(msg)
    }
    else {
        dbLogger.debug(msg)
    }
}

function decodePayload(secret) {
    //encoding / decoding of data.secret:
    //var a = btoa(JSON.stringify({a:1})) + btoa('secret')   <--- encoding
    //var b = JSON.parse(atob(a.substring(0,a.indexOf(btoa('secret'))))) <--- decoding
    return JSON.parse(atob(secret.substring(0, secret.indexOf(btoa('secret')))));
}



function moveToPrepaid(data, cb) {
    var requiredKeys = ['_id', 'status', 'walletTransId', 'paidAt', 'number'];
    var payload = {
        _id: data._id,
        status: 'prepaid',
        walletTransId: data.walletTransId,
        paidAt: Date.now(),
        number: data.number
    };
    if (data.paymentType === 'cheque') {
        requiredKeys.splice(requiredKeys.indexOf('walletTransId'), 1);
        requiredKeys.push('paymentType');
        payload.paymentType = 'cheque';
    }
    save(payload, function(err, order) {
        if (err) {
            LogSave('Order moving to prepaid error', 'error', err);
            return cb(err);
        }
        else {
            LogSave('Order moved to prepaid', 'info', payload);
            return cb(null, payload);
        }
    }, requiredKeys);
}


function associateClient(clientId, orderId) {
    return new Promise((resolve, reject) => {

        if (!clientId) return reject("clientId required");
        if (!orderId) return reject("orderId required");

        //dbLogger.debug('associateClient:valid');

        ctrl('Order').update({
            _id: orderId,
            _client: clientId
        }, (err, res) => {
            if (err) return reject(err);
            if (!res) return reject("associateClient failed" + ' clientId ' + clientId + ' orderId ' + orderId);

            // dbLogger.debug('associateClient:update:ok');

            ctrl('Order').getById({
                _id: orderId,
                __populate: {
                    _client: "email"
                }
            }, (_err, order) => {
                if (_err) return reject(_err);
                if (!order) return reject("associateClient: order do not exist");
                if (!order._client) return reject("associateClient: order _client do not exist");
                if (!order._client.email) return reject("associateClient: order _client.email do not exist");

                dbLogger.debug('Client ', order._client.email, 'associated to order', order._id, '(', order.address, ')');

                //dbLogger.debug('associateClient:update:resolved');

                resolve(order);
            });


        });
    });
}

function validateTechnicalWallet(data, secretData, success, error) {
    return ctrl('Lemonway').getWalletDetails({
        wallet: "IMMOCAL"
    }, function(err, res) {
        if (err) return error(err);
        if (res.WALLET) {
            data.masterWallet = res.WALLET.ID;
            success();
        }
        else {
            paymentLogger.warn('MASTER WALLET not found: IMMOCAL');
            data.masterWallet = secretData.wallet; //We use the client wallet (deprecated)
            success();
        }
    })
}

var PaymentProcessor = (() => {
    var queue = {};
    return {
        inQueue: (data) => {
            queue[data.orderId];
        },
        addToQueue: (data) => {
            queue[data.orderId] = true;
        },
        createCallback: (data, originalCallback) => {
            return function(err, res) {
                queue[data.orderId] = false;
                return originalCallback(err, res);
            };
        },
        isAllowed: (data) => data.__allowPayment === true,
        allowPayment: (data, allowHandler, disallowHandler, errorHandler) => {
            return ctrl('Order').get({
                _id: data.orderId,
                __select: "status"
            }, function(err, _order) {
                if (err) return errorHandler(err);
                if (!_order) return errorHandler(apiError.ORDER_NOT_FOUND);
                if (_.includes(['created', 'ordered'], _order.status)) {
                    data.__allowPayment = true;
                    return allowHandler();
                }
                else {
                    paymentLogger.warn('The order is already paid');
                    return disallowHandler();
                }
            });
        }
    }
})();



var PaymentHelper = (() => {
    return {
        updateDetailsAsync: (orderId, creditCardOwner, billingAddress) => {
            ctrl('Order').update({
                _id: orderId,
                creditCardOwner: creditCardOwner,
                billingAddress: billingAddress,
            }); //async
        },
        associateClient: (orderId, clientData) => {
            /*
            data.orderId:               REQUIRED
            clientData.clientId:        CARD OR CHEQUE : OPTIONAL
            clientData.clientEmail:     CARD OR CHEQUE : REQUIRED
            clientData.clientName:      CHEQUE
            clientData.clientPhone:     CHEQUE
            clientData.clientPassword:  OPTIONAL
            */
            return new Promise((resolve, reject) => {
                if (!orderId) reject('orderId required for client association');
                if (!clientData.clientEmail) reject('clientEmail required for client association');
                if (clientData.clientId) {

                    if (clientData.clientPhone) {
                        ctrl('User').update({
                            _id: clientData.clientId,
                            cellPhone: clientData.clientPhone,
                        });
                    }

                    associateClient(clientData.clientId, clientData.orderId).then(resolve).catch(err => {
                        return reject(err);
                    });
                }
                else {
                    ctrl('User').fetchLandlordAccount({
                        firstName: clientData.clientName || '',
                        cellPhone: clientData.clientPhone,
                        email: clientData.clientEmail,
                        password: clientData.clientPassword,
                        isGuestAccount: !clientData.clientPassword
                    }, (err, user) => {
                        if (err) return reject(err);
                        associateClient(user._id, orderId).then(resolve);
                    });
                }
            });
        }
    }
})();









function create(data, cb) {
    actions.create(data, cb, saveKeys);
}

function attachHelpers(order) {
    var obj = _.clone(order);
    obj.isPaid = () => obj.status === 'prepaid';
    return obj;
}

function attachHelpers(order) {
    var obj = _.clone(order);
    obj.isPaid = () => obj.status === 'prepaid';
    return obj;
}

function save(data, cb, customRequiredKeys) {

    //fix: set _diag _id
    if (data._diag && data._diag._id) {
        data._diag = data._diag._id;
    }

    var prevStatus = '';
    if (data._id) {
        actions.getById(data, (err, _order) => {
            if (!err && _order) prevStatus = _order.status;
            _saveNext();
        });
    }
    else {
        _saveNext();
    }



    function _saveNext() {

        actions.createUpdate(data, (err, r) => {
            if (err) return cb(err, r);
            cb(err, r);

            if (!r) return dbLogger.warn('Save createUpdate returns null for order data', data);

            ////
            ///Notifications (async)
            actions.log('save:orderPopulate=' + r._id);
            orderPopulate(r, _order => {
                actions.log('save:orderPopulate:rta=' + _order._id);

                actions.log('save:prevStatus=' + prevStatus);
                actions.log('save:currentStatus=' + _order.status);

                _order.notification = _order.notifications || {};

                //on status change
                if (prevStatus == 'created' && _order.status == 'prepaid') { //PREPAID DURING BOOKING
                    sendNotificationToEachAdmin(_order);
                    sendDiagRDVNotification(_order);
                }
                if (prevStatus == 'ordered' && _order.status == 'prepaid') { //PAID AFTER DELEGATION
                    sendNotificationToEachAdmin(_order);
                    sendDiagConfirmedNotification(_order);
                }
                if (prevStatus !== 'prepaid' && _order.status === 'prepaid') {
                    sendClientNotifications(_order);
                }



            });



        }, {}, customRequiredKeys && customRequiredKeys.length && customRequiredKeys || saveKeys);
    }

    function sendNotificationToEachAdmin(_order) {
        //ADMIN_ORDER_PAYMENT_SUCCESS //ADMIN//#8
        everyAdmin(_admin => {
            Notif.trigger(NOTIFICATION.ADMIN_ORDER_PAYMENT_SUCCESS, {
                _user: _admin,
                _order: _order
            });
        });
    }

    function sendDiagRDVNotification(_order) {
        //DIAG_NEW_RDV //DIAG//#2 OK ctrl.order
        Notif.trigger(NOTIFICATION.DIAG_NEW_RDV, {
            _user: _order._diag,
            _order: _order
        });
    }

    function sendDiagConfirmedNotification(_order) {
        //DIAG_RDV_CONFIRMED //DIAG//#3
        UserAction.get({
            _id: _order._diag._id || _order._diag
        }, (_err, _diag) => {
            Notif.trigger(NOTIFICATION.DIAG_RDV_CONFIRMED, {
                _user: _diag,
                _order: _order
            });
        });
    }

    function sendClientNotifications(_order) {
        UserAction.get({
            _id: _order._client._id || _order._client
        }, (_err, _client) => {

            if (_err) return cb(_err);
            if (!_client) {
                LogSave('Unable to retrieve client data', 'error', {
                    _id: _order._client._id || _order._client
                });
                return;
            }

            htmlFromOrder(_order, (_err, html) => {
                if (_err) {
                    LogSave('Unable to retrieve order invoice html', 'warning', _err);
                }

                if (_order.notifications && _order.notifications.LANDLORD_ORDER_PAYMENT_DELEGATED) {
                    //LANDLORD_ORDER_PAYMENT_SUCCESS //LANDLORD//#2
                    if (_order.landLordEmail) {
                        Notif.trigger(NOTIFICATION.LANDLORD_ORDER_PAYMENT_SUCCESS, {
                            _user: _client,
                            _order: _order,
                            attachmentPDFHTML: html
                        });
                    }
                }
                else {
                    //CLIENT_ORDER_PAYMENT_SUCCESS //CLIENT//#3
                    Notif.trigger(NOTIFICATION.CLIENT_ORDER_PAYMENT_SUCCESS, {
                        _user: _client,
                        _order: _order,
                        attachmentPDFHTML: html
                    });
                }

            });

        });
    }

}







function everyAdmin(cb, delay) {
    UserAction.getAll({
        userType: 'admin'
    }, (_err, _admins) => {
        if (_err) {
            dbLogger.setSaveData({
                err: _err
            });
            dbLogger.errorSave('User fetch (Admins)');
            return;
        }
        _admins.forEach((_admin) => {
            setTimeout(() => {
                cb(_admin);
            }, delay || 0)
        });
    });
}

function orderPopulate(data, cb) {
    actions.get({
        _id: data._id,
        __populate: {
            _client: 'email firstName lastName companyName cellPhone',
            _diag: "email firstName lastName password"
        }
    }, (_err, _order) => cb(_order));
};

function orderDiag(_order, cb) {
    UserAction.get({
        _id: _order._diag._id || _order._diag
    }, (_err, _diag) => cb(_diag));
}

function orderClient(_order, cb) {
    UserAction.get({
        _id: _order._client._id || _order._client
    }, (_err, _client) => cb(_client));
}

function orderExists(data, cb) {
    //Si existe un order match user:email, address, start, end, price.
    actions.getAll({
        __populate: {
            '_client': 'email'
        },
        //'_client.email': data.email,
        address: data.address,
        //diagStart: data.diagStart,
        //diagEnd: data.diagEnd,
    }, (err, list) => {
        if (err) return cb(err, list);
        var rta = null;
        var rtaErr = null;
        list.forEach((r) => {
            //check dates sameday same hour, same address
            var sameOrder = true && moment(r.diagStart).isSame(data.diagStart, 'day') && moment(r.diagEnd).isSame(data.diagEnd, 'day') && r.price == data.price && r.address == data.address;
            if (!rta) {
                if (r && r._client.email == data.email) {
                    if (sameOrder) {
                        rta = r;
                        rtaErr = 'ORDER_EXISTS';
                        dbLogger.warn('ORDER_EXISTS event', {
                            sameOrder: sameOrder,
                            clientEmail: r._client.email,
                            clientEmailBooking: data.email
                        });
                    }
                }
                else {
                    if (sameOrder) {
                        rta = r;
                        rtaErr = 'ORDER_TAKEN';
                        dbLogger.warn('ORDER_TAKEN event', {
                            sameOrder: sameOrder,
                            clientEmail: r._client.email,
                            clientEmailBooking: data.email
                        });
                    }
                }
            }
        });
        return cb(rtaErr, rta); //returns the order as result
    });
}

//Save and order
//If data has _client, use that client. If not, data requires email and clientType to search or crate a new user on the fly.
function saveWithEmail(data, cb) {
    actions.log('saveWithEmail=' + JSON.stringify(data));
    actions.check(data, ['_diag', 'start', 'end'

        , 'diags', 'address', 'price'
    ], (err, r) => {
        if (err) return cb(err, r);
        //

        //This function checks if the client book a similar order recently and tries to retrieve it.
        orderExists(data, (err, r) => {
            if (err) return cb(err, r);
            if (data._client) {
                if (data._client._id) data._client = data._client._id;
                return save(data, cb);
            }
            else {
                //Legacy fallback
                actions.check(data, ['email', 'clientType'], (err, r) => {
                    if (err) return cb(err, r);
                    _setUserUsingEmailAndClientType();
                });
            }

            function _setUserUsingEmailAndClientType() {
                UserAction.get({
                    email: data.email,
                    userType: 'client',
                    clientType: data.clientType,
                }, (err, r) => {
                    if (err) return cb(err, r);
                    actions.log('saveWithEmail=user:get:return' + JSON.stringify(r));
                    if (r) {
                        data._client = r._id;
                        return save(data, cb);
                    }
                    else {
                        UserAction.createClientIfNew({
                            email: data.email
                        }, (err, r) => {
                            if (err) return cb(err, r);
                            data._client = r._id;
                            return save(data, cb);
                        });
                    }
                });
            }
        });
        //    
    });
}

function afterSave(data) {


    if (!data || !data._id) {
        dbLogger.setSaveData(data || {});
        dbLogger.error('afterSave expects order data field (_id)');
        return data;
    }

    ctrl('Order').get({
        _id: data._id,
        __populate: {
            _diag: "firstName lastName",
            _client: "firstName lastName cellPhone fixedTel companyName isSystemUser"
        }
    }, (err, _order) => {
        if (err) {
            dbLogger.setSaveData(err);
            dbLogger.errorSave('Error when fetching order afterSave');
            return;
        }

        _order.notifications = _order.notifications || {};
        if (!_order.notifications.ADMIN_ORDER_CREATED_SUCCESS && !_order._client.isSystemUser) {
            dbLogger.debug('Notifying admins', 'ADMIN_ORDER_CREATED_SUCCESS');
            everyAdmin((_admin) => {
                Notif.trigger(NOTIFICATION.ADMIN_ORDER_CREATED_SUCCESS, {
                    _order: _order,
                    _user: _admin
                });
            }, 2000);
        }
    });

    return data;
}

function preSave(data) {


    var now = new Date();
    if (data.status == 'delivered' || data.status == 'completed' && data.deliveredAt === null) {
        data.deliveredAt = now;
    }


    return data;
}



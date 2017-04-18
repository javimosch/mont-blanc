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
var payment = require('./ctrl.payment');
var stripe = payment.stripe;
var email = require('./ctrl.email');
var Notif = require('./ctrl.notification');
var NOTIFICATION = Notif.NOTIFICATION;

var path = require('path');
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

function moveToPrepaid(data, cb) {
    //Update order status.
    var payload = {
        _id: data._id,
        status: 'prepaid',
        walletTransId: data.walletTransId,
        paidAt: Date.now(),
        number: data.number
    };
    save(payload, function(err, order) {

        if (err) {
            LogSave('Order moving to prepaid error', 'error', err);
            return cb(err);
        }
        else {
            LogSave('Order moved to prepaid', 'info', payload);
            return cb(null, payload);
        }


    }, ['_id', 'status', 'walletTransId', 'paidAt', 'number']);


}


function associateClient(clientId, orderId) {
    return new Promise((resolve, reject) => {
        ctrl('Order').update({
            _id: orderId,
            _client: clientId
        }, (err, res) => {
            if (err) return reject(err);

            ctrl('Order').getById({
                _id: orderId,
                populate: {
                    _client: "email"
                }
            }, (_err, order) => {
                dbLogger.debug('Client ', order._client.email, 'associated to order', order._id, '(', order.address, ')');
            })

            resolve(res);
        });
    });
}

var processing_order_payment = {};

function payUsingLW(data, callback) {
    if (!data.orderId) return callback('orderId field required');

    if (!data.__allowPayment && processing_order_payment[data.orderId]) return callback('Order payment is already being processed.');
    processing_order_payment[data.orderId] = true;
    var cb = function(err, res) {
        processing_order_payment[data.orderId] = false;
        return callback(err, res);
    };

    if (!data.__allowPayment) {
        ctrl('Order').get({
            _id: data.orderId,
            __select: "status"
        }, function(err, _order) {
            if (err) return cb(err);
            if (_.includes(['created', 'ordered'], _order.status)) {
                data.__allowPayment = true;
                return payUsingLW(data, cb);
            }
            else {
                return cb('Order already paid.');
            }
        });
        return;
    }




    if (!data.secret) return cb('secret field required');
    if (!data.p2pDiag) return cb('p2pDiag field required');


    var decodedPayload = decodePayload(data.secret);


    //263 master-wallet-for-payments (IMMOCAL, technical wallet)
    if (!data.masterWallet) {
        return ctrl('Lemonway').getWalletDetails({
            wallet: "IMMOCAL"
        }, function(err, res) {
            if (err) return cb(err);
            if (res.WALLET) {
                data.masterWallet = res.WALLET.ID;
                return payUsingLW(data, cb);
            }
            else {
                //If there is not an IMMOCAL wallet (rare), we pay with client wallet as normal.
                data.masterWallet = decodedPayload.wallet;
                return payUsingLW(data, cb);
            }
        })
    }
    else {
        decodedPayload.wallet = data.masterWallet; //we use this wallet for the client payment move.
        data.p2pDiag.debitWallet = data.masterWallet; //we use this wallet for the diag p2p movement.
    }


    /*
    #373 new fields
    clientId
        associate client to order
    clientEmail,password (if not clientId)
        create a new client and associate client to order
    creditCardOwner
        associate to order (creditCardOwner)
    billingAddress
        associate to order (billingAddress)
    */

    if (decodedPayload.creditCardOwner) {
        ctrl('Order').update({
            _id: data.orderId,
            creditCardOwner: decodedPayload.creditCardOwner,
            billingAddress: decodedPayload.billingAddress,
        }); //async
    }
    else {
        return callback('credit card owner required');
    }

    if (decodedPayload.clientId) {
        associateClient(decodedPayload.clientId, data.orderId).then(withPreparedOrder).catch(err => {
            return callback(err);
        });
    }
    else {
        if (decodedPayload.clientEmail) {
            
           
            
            ctrl('User').fetchLandlordAccount({
                email: decodedPayload.clientEmail,
                password: decodedPayload.clientPassword,
                isGuestAccount: !decodedPayload.clientPassword
            }, (err, user) => {
                if (err) return callback(err);
                associateClient(user._id, data.orderId).then(withPreparedOrder);
            });
        }
        else {
            return callback('clientId or clientEmail required');
        }
    }

    function withPreparedOrder() {
        getNextInvoiceNumber({
            _id: data.orderId
        }, function(err, invoiceNumber) {
            if (err) return cb(err);
            decodedPayload.comment = decodedPayload.comment.replace('_INVOICE_NUMBER_', invoiceNumber);
            //step 1 payment with card
            ctrl('Lemonway').moneyInWithCardId(decodedPayload, function(err, LWRES) {
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
    }


}


//Deprecated ?
function confirm(data, cb) {
    actions.log('confirm=' + JSON.stringify(data));
    actions.getById(data, (err, _order) => {
        if (err) return cb(err, _order);
        if (_order.status == 'created') {
            _order.status = 'ordered';
            _order.save();
            User.getAll({
                userType: 'admin'
            }, (err, _admins) => {
                if (err) return cb(err, _admins);
                _admins.forEach(_admin => {

                    Notif.ORDER_CONFIRMED_FOR_INVOICE_END_OF_THE_MONTH({
                        _user: _admin,
                        _order: _order
                    }, (_err, r) => {
                        if (r.ok) {
                            cb({
                                ok: true,
                                message: 'Order confirmed and admins notified by email.'
                            });
                        }
                    })
                });
            });
        }
        else {
            cb(null, {
                ok: true,
                message: 'Order already confirmed. (ordered)'
            });
        }
    });
}

function create(data, cb) {
    actions.create(data, cb, saveKeys);
}

function attachHelpers(order) {
    var obj = _.clone(order);
    obj.isPaid = () => obj.status === 'prepaid';
    return obj;
}

function attachHelpers(order) {
    obj = _.clone(order);
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







function everyAdmin(cb) {
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
            cb(_admin);
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

    if (!data._id) {
        dbLogger.setSaveData(data);
        dbLogger.errorSave('afterSave expects order data field (_id)');
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
            });
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

module.exports = {
    //custom
    payUsingLW: payUsingLW,
    getNextInvoiceNumber: getNextInvoiceNumber,
    save: save,
    saveWithEmail: saveWithEmail,
    // pay: pay,
    // syncStripe: syncStripe,
    confirm: confirm,
    populate: orderPopulate,
    //heredado
    existsById: actions.existsById,
    existsByField: actions.existsByField,
    createUpdate: actions.createUpdate,
    getAll: actions.getAll,
    remove: actions.remove,
    result: actions.result,
    get: actions.get,
    check: actions.check,
    removeAll: actions.removeAll,
    toRules: actions.toRules,
    find: actions.find,
    create: create,
    log: actions.log,
    _configure: (hook) => {
        hook('preSave', preSave);
        hook('afterSave', afterSave);
    }
};

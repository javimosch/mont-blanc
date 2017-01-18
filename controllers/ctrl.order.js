var mongoose = require('../model/db').mongoose;
var atob = require('atob'); //decode
var btoa = require('btoa'); //encode
var moment = require('moment');
var promise = require('../model/utils').promise;
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

const MODULE = 'ORDER';
var logger = require('../model/logger')(MODULE);

var saveKeys = ['_client', '_diag', 'start', 'end', 'diags'

    , 'address', 'price' //, 'time'
];


function LogSave(msg, type, data) {
    try {
        Log.save({
            message: msg,
            type: type || 'error',
            data: data || {}
        });
    }
    catch (err) {
        logger.error(MODULE, " LOG-SAVE ", err);
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
            logger.error(MODULE, ' MOVE-TO-PREPAID ERROR ', err);
            LogSave('Order moving to prepaid error', 'error', err);
            return cb(err);
        }
        else {
            LogSave('Order moved to prepaid', 'info', payload);
            logger.info(MODULE, ' MOVE-TO-PREPAID SUCESS ', payload);
            return cb(null, payload);
        }


    }, ['_id', 'status', 'walletTransId', 'paidAt', 'number']);


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
            if (_order.status === 'created') {
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


    getNextInvoiceNumber({
        _id: data.orderId
    }, function(err, invoiceNumber) {
        if (err) return cb(err);
        decodedPayload.comment = decodedPayload.comment.replace('_INVOICE_NUMBER_', invoiceNumber);

        logger.info(MODULE, ' PAY-WITH-LW INVOICE-NMBER ', invoiceNumber);

        //step 1 payment with card
        ctrl('Lemonway').moneyInWithCardId(decodedPayload, function(err, LWRES) {
            if (err) {
                return cb(err);
            }

            logger.info(MODULE, ' PAY-WITH-LW MONEY-IN-RESULT ', LWRES);

            if (LWRES && LWRES.TRANS && LWRES.TRANS.HPAY && LWRES.TRANS.HPAY.STATUS == '3') {}
            else {
                logger.error(MODULE, ' PAY-WITH-LW INVALID-RESPONSE ', LWRES);
                LogSave('Invalid response from Lemonway (moneyInWithCardId)', 'error', LWRES);
                return cb({
                    message: "Invalid response from Lemonway. Check the logs."
                });
            }

            logger.info(MODULE, ' MOVE-TO-PREPAID #', invoiceNumber);


            //step 2, moving the order to prepaid

            moveToPrepaid({
                _id: data.orderId,
                walletTransId: LWRES.TRANS.HPAY.ID,
                number: invoiceNumber
            }, function(err, res) {
                console.log('MOVE-TO-PREPAID RESULT', err, res);

                logger.info(MODULE, ' P2P LOOK-UP');
                //step 3  p2p to diag wallet 
                var p2pPayload = data.p2pDiag;
                p2pPayload.message = "Order #" + invoiceNumber;
                ctrl('Lemonway').sendPayment(p2pPayload, function(err, res) {
                    logger.info(MODULE, ' P2P-RESULT', err, res);
                    if (err) {
                        logger.error(MODULE, ' P2P after card transaction ', err);
                        LogSave('P2P after card transaction error', 'error', err);
                    }
                    else {
                        logger.info(MODULE, ' P2P after card transaction ', res);
                        LogSave('P2P after card transaction success', 'info', res);
                    }

                    logger.info(MODULE, ' PAY-USING-LW SUCCESS ');
                    return cb(err, true);
                });

            });





        });
    });
}


/*
function pay(data, cb) {
    actions.log('pay=' + JSON.stringify(data));
    actions.check(data, ['stripeToken'], (err, r) => {
        if (err) return cb(err, r);
        //
        var _userID = data._client && data._client._id || data._client;
        UserAction.get({
            _id: _userID
        }, (err, _user) => {
            if (err) return cb(err, _user);
            data._client = _user;
            _user.stripeToken = data.stripeToken; //
            if (_user.stripeCustomer) {
                data.stripeCustomer = _user.stripeCustomer;
                stripe.customers.retrieve(
                    data.stripeCustomer,
                    function(err, customer) {
                        if (customer) {
                            _payIfNotPaidYet(data);
                        }
                        else {
                            _createCustomer(_user);
                        }
                    }
                );
            }
            else {
                _user.stripeToken = data.stripeToken;
                _createCustomer(_user);
            }
        });

        function _createCustomer(_user) {
            payment.createCustomer(_user, (err, stripeCustomer) => {
                if (err) return cb(err, r);
                _user.stripeCustomer = stripeCustomer.id;
                data.stripeCustomer = stripeCustomer.id;
                _user.save();
                //
                return _payIfNotPaidYet(data);
            });
        }

        function _payIfNotPaidYet(data) {
            actions.log('_payIfNotPaidYet=' + JSON.stringify(data));
            orderHasPayment(data, (err, has) => {
                if (err) return cb(err, has);
                if (!has) {
                    return _pay(data);
                }
                else {
                    syncStripe();
                    actions.log('_payIfNotPaidYet:rta=' + JSON.stringify({
                        message: "Alredy paid"
                    }));
                    return cb(null, {
                        message: "Alredy paid"
                    });
                }
            })
        }

        function _pay(data) {
            actions.log('_pay:rta=' + JSON.stringify(data));
            //stripeCustomer
            payment.payOrder(data, (err, _charge) => {
                if (err) return cb(err, r);
                //Change status to prepaid  (sync)
                actions.get({
                    _id: data._id
                }, (_err, _order) => {
                    if (_order.status == 'delivered') {
                        _order.status = 'completed';
                    }
                    else {
                        _order.status = 'prepaid';
                    }
                    _order.paidAt = Date.now();
                    save(_order, _success);
                });
                //
                function _success() {
                    actions.log('_pay:rta=Success');
                    cb(null, {
                        ok: true,
                        message: "Pay successs",
                        result: _charge
                    });
                }
            });
        }
        //
    });
}
*/

/*
function orderHasPayment(data, cb) {
    actions.log('orderHasPayment=' + JSON.stringify(data));
    if (!data.stripeCustomer) return cb("orderHasPayment: stripeCustomer required.", null);
    //
    var rta = false;
    payment.listCustomerCharges({
        stripeCustomer: data.stripeCustomer
    }, (err, _chargeR) => {
        if (err) return cb(err, _chargeR);
        var _charges = _chargeR.data;
        _charges.forEach((_charge) => {
            if (_charge.metadata._order == data._id) {
                if (_charge.paid && !_charge.refunded) {
                    rta = true;
                }
            }
        })
        return cb(null, rta);
    });
}
*/

/*
function syncStripe(data, cb) {
    actions.log('syncStripe:start=' + JSON.stringify(data || {}));
    UserAction.getAll({
        __rules: {
            stripeCustomer: {
                $ne: null
            }
        }
    }, (err, _users) => {
        if (err) return cb(err, r);
        _users.forEach((_user) => {
            payment.listCustomerCharges({
                stripeCustomer: _user.stripeCustomer
            }, (err, _chargeR) => {
                if (err) return cb(err, r);
                var _charges = _chargeR.data;

                _charges.forEach((_charge) => {
                    if (_charge.paid && !_charge.refunded) {
                        _syncOrderStatus(_charge, true);
                    }
                    else {
                        _syncOrderStatus(_charge, false);
                    }
                });



            });
        });
        if (cb) {
            cb(null, {
                ok: true,
                message: "appc in progress, see server console for more details.",
                result: null
            });
        }
    })
}

function _syncOrderStatus(_charge, isPaid) {
    actions.log('_syncOrderStatus:charge=' + JSON.stringify(_charge.metadata));
    actions.log('_syncOrderStatus:isPaid=' + JSON.stringify(isPaid));
    if (isPaid) {
        Order.update({
            _id: {
                $eq: _charge.metadata._order
            },
            status: {
                $in: ['created', 'ordered']
            }
        }, {
            status: 'prepaid'
        }).exec();
        Order.update({
            _id: {
                $eq: _charge.metadata._order
            },
            status: {
                $in: ['delivered']
            }
        }, {
            status: 'completed'
        }).exec();
    }
    else {
        Order.update({
            _id: {
                $eq: _charge.metadata._order
            },
            status: {
                $in: ['prepaid']
            }
        }, {
            status: 'ordered'
        }).exec();
        Order.update({
            _id: {
                $eq: _charge.metadata._order
            },
            status: {
                $in: ['completed']
            }
        }, {
            status: 'delivered'
        }).exec();
    }
    actions.log('_syncOrderStatus=' + JSON.stringify(_charge.metadata._order));
}
*/

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


function notifyClientOrderCreation(_order) {
    actions.log('async:notifyClientOrderCreation:start');
    if (_order && _order.info) {
        if (_order.info.clientNotified != true) {
            UserAction.get({
                _id: _order._client._id || _order._client
            }, (_err, _client) => {
                _client._orders.push(_order.id);

                /*
                Notif.trigger(NOTIFICATION.DIAGS_CLIENT_ORDER_CREATED, {
                    _user: _client,
                    _order: _order
                }, function(err, r) {
                    if (err) {
                        LogSave("Order creation notification email send fail. The user is " + _client.email);
                        actions.log('async:notifyClientOrderCreation:failed');
                    }
                    else {
                        actions.log('async:notifyClientOrderCreation:success', _client.email);
                        _order.info.clientNotified = true;
                        _order.save();
                    }
                });*/

            });
        }
        else {
            actions.log('async:notifyClientOrderCreation:already-notified');
        }
    }
    else {
        actions.log('async:notifyClientOrderCreation:order-info-undefined');
    }
}

function save(data, cb, customRequiredKeys) {
    //actions.log('save=' + JSON.stringify(data))
    actions.log('save:start');

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
        /*
        data.info = data.info || {};
        data.info = Object.assign(data.info || {}, {
            sell: data.info.sell!=undefined || data.sell || undefined,
            house: data.info.house || data.house || undefined,
            squareMeters: data.info.squareMeters || data.squareMeters || undefined,
            apartamentType: data.info.apartamentType || data.apartamentType || undefined,
            constructionPermissionDate: data.info.constructionPermissionDate || data.constructionPermissionDate || undefined,
            gasInstallation: data.info.gasInstallation || data.gasInstallation || undefined,
        });
        */
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

                //on notification flag change
                if (_order.notifications && _order.notifications.DIAG_NEW_RDV == false) {
                    sendDiagRDVNotification(_order);
                }
                if (_order.notifications && _order.notifications.ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS == false) {
                    sendNotificationToEachAdmin(_order);
                }
                if (_order.notifications && _order.notifications.CLIENT_ORDER_PAYMENT_SUCCESS == false) {
                    sendClientNotifications(_order)
                }

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

            getInvoiceHTML(_order, (_err, html) => {
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

function getInvoiceHTML(_order, cb) {
    var Category = ctrl('Category');
    var Text = ctrl('Text');
    Category.createUpdate({
        code: "DIAGS_SETTINGS",
        __match: ['code']
    }, (err, _category) => {
        if (err) return cb(err);

        Text.get({
            code: 'INVOICE',
        }, (err, _text) => {
            if (err) return cb(err);
            if (!_text) {
                return cb(null, 'CONFIGURE ORDER INVOICE TEMPLATE');
            }
            var html =
                utils.encodeURIComponent(
                    invoiceHTMLInyectOrderDetails(utils.decodeURIComponent(_text.content), _.cloneDeep(_order)));
            return cb(null, html);
        });
    });
}

function invoiceHTMLInyectOrderDetails(html, _order) {
    _order['ORDER_DESCRIPTION'] = _order.info.description;
    _order['CLIENT_FULLNAME'] = _order._client.firstName + ' ' + (_order._client.lastName || '');
    _order['CLIENT_FIRSTNAME'] = _order._client.firstName;
    _order['CLIENT_LASTNAME'] = _order._client.lastName || '';
    _order['CLIENT_EMAIL'] = _order._client.email;
    _order['CLIENT_ADDRESS'] = _order._client.address;
    _order.createdAt = moment(_order.createdAt).format('DD-MM-YY HH[h]mm');
    //
    var backofficeURL = process.env.adminURL || ''; //blooming-refuge-27843.herokuapp.com/admin#
    if (backofficeURL) {
        backofficeURL = backofficeURL.substring(0, backofficeURL.lastIndexOf('/'));
        // LogSave('Invoice Logo Injected Log','info',{
        //    src: backofficeURL + '/img/logo.jpg'
        // });
        _order["LOGO"] = "<img src='" + backofficeURL + '/img/logo.jpg' + "'>";
    }
    else {
        LogSave('Unable to inject LOGO in invoice. Enviromental variable adminURL required.', 'warning', _order);
        _order["LOGO"] = "";
    }
    //
    return invoiceHTMLReplaceVariable(html, _order);
}

function invoiceHTMLReplaceVariable(html, obj) {
    for (var x in obj) {
        html = utils.replaceAll(html, "{{" + x.toUpperCase() + "}}", obj[x]);
    }
    return html;
}


function everyAdmin(cb) {
    UserAction.getAll({
        userType: 'admin'
    }, (_err, _admins) => {
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
    actions.log('orderExists=' + JSON.stringify(data));
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
        actions.log('orderExists:getAll:err:?=' + JSON.stringify(err));
        if (err) return cb(err, list);
        var rta = null;
        var rtaErr = null;
        list.forEach((r) => {
            actions.log('orderExists:getAll:reading=' + JSON.stringify(r._client.email));
            //check dates sameday same hour, same address
            var sameOrder = true && moment(r.diagStart).isSame(data.diagStart, 'day') && moment(r.diagEnd).isSame(data.diagEnd, 'day') && r.price == data.price && r.address == data.address;
            if (!rta) {
                if (r && r._client.email == data.email) {
                    if (sameOrder) {
                        rta = r;
                        rtaErr = 'ORDER_EXISTS';
                        actions.log('orderExists:exists=' + JSON.stringify({
                            sameOrder: sameOrder,
                            clientEmail: r._client.email,
                            clientEmailBooking: data.email
                        }));
                    }
                }
                else {
                    if (sameOrder) {
                        rta = r;
                        rtaErr = 'ORDER_TAKEN';
                        actions.log('orderExists:taken=' + JSON.stringify({
                            sameOrder: sameOrder,
                            clientEmail: r._client.email,
                            clientEmailBooking: data.email
                        }));
                    }
                }
            }
        });
        actions.log('orderExists:rta=' + JSON.stringify(rta));
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
        orderExists(data, (err, r) => {
            if (err) return cb(err, r);

            if (data._client) {
                return save(data, cb);
            }

            if (data._client) {
                if (data._client._id) data._client = data._client._id;
                return save(data, cb);
            }
            else {


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
    }
};

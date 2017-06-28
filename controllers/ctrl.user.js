var ctrl = require('../model/db.controller').create;
var mongoose = require('../model/db').mongoose;
var generatePassword = require("password-maker");
var Promise = require('promise');
var validate = require('../model/validator').validate;
var handleMissingKeys = require('../model/validator').handleMissingKeys;
var Balance = require('../model/db.actions').create('Balance');
var BalanceItem = require('../model/db.actions').create('BalanceItem');
var _ = require('lodash');
var moment = require('moment');
var NOTIFICATION = ctrl('Notification').NOTIFICATION;
var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var apiError = require(path.join(process.cwd(), 'model/errors'));
var Response = require(path.join(process.cwd(), 'model/facades/response-facade'));

var BOOKING_BOT_EMAIL = "bookingbot@noreply.fr";

var dbLogger = ctrl('Log').createLogger({
    name: "USER",
    category: "DB"
});
var middlewareLogger = ctrl('Log').createLogger({
    name: "USER",
    category: "middleware"
});
var pdwRecoverLogger = ctrl('Log').createLogger({
    name: "USER",
    category: "pwd-recover"
});
var couponsLogger = ctrl('Log').createLogger({
    name: "USER",
    category: "coupons"
});


function everyAdmin(cb) {
    ctrl('User').getAll({
        userType: 'admin'
    }, (err, _admins) => {
        if (err) return cb(err);
        _admins.forEach((_admin) => {
            cb(null, _admin);
        });
    });
}

function departmentCoveredBy(data, cb) {
    ctrl('User').log('departmentCoveredBy=' + JSON.stringify(data));
    if (!data.department) return cb("department required");
    var User = ctrl('User');
    User.getAll({
        __select: "departments",
        __rules: {
            disabled: {
                $ne: true
            } //exclude disabled diags
        }

    }, (err, _users) => {
        if (err) return cb(err);
        //ctrl('User').log('departmentCoveredBy=_users:len=' + JSON.stringify(_users.length));
        for (var x in _users) {
            //ctrl('User').log('departmentCoveredBy=looping='+x+'='+JSON.stringify(_users[x].departments||[]));
            if (_users[x].departments) {
                if (_.includes(_users[x].departments, data.department)) {
                    //  ctrl('User').log('departmentCoveredBy=check=' + JSON.stringify(_users[x].departments) + ' contra ' + data.department);
                    return cb(null, true);
                }
            }
        }
        return cb(null, false);
    });
}


function balance(data, cb) {
    data.period = data.period || 'year';
    ctrl('User').log('balance=' + JSON.stringify(data));
    data._calculate = data._calculate && data._calculate.toString() == 'true' || false;
    if (!data._id) return cb("_id required");
    if (data._calculate) {
        _calculate(null, null, true);
    }
    else {
        _retrieve();
    }

    //
    function _calculate(_err, _user, firstTime) {
        if (!_user && firstTime == true) return ctrl('User').model.findById(data._id, _calculate);
        if (!_user) return cb("balance:calculate=User not found:" + data._id);
        //
        if (_user.userType == 'admin') {
            return cb('Admin balance unsupported');
        }
        //
        ctrl('User').log('balance:_calculate');
        var balanceKeys = ['_user', 'amount'];
        var balanceMatch = ['_user'];
        var balanceItemKeys = ['_user', '_order', 'pending', 'amount', 'description'];
        var balanceItemMatch = ['_user', '_order'];
        //
        Balance.createUpdate({
            _user: _user._id,
            amount: 0
        }, (err, bal) => {
            if (err) return cb(err);
            ctrl('User').log('balance:_calculate:creteUpdate:rta', JSON.stringify(bal));
            BalanceItem.removeAll({
                _user: _user._id
            }, (err, rr) => {
                if (err) return cb(err);
                bal.items = [];
                _calculateBalance(null, bal);
            });
        }, balanceMatch, balanceKeys);
        //
        function _calculateBalance(err, _balance) {
            ctrl('User').log('balance:_calculateBalance', JSON.stringify(_balance));
            if (err) return cb(err, _balance);
            if (!_balance) return cb('balance:create:error');
            //
            //remove prev balance items

            //
            ctrl('Order').getAll(_orderRules(), (err, _orders) => {
                ctrl('User').log('balance:_calculateBalance:orders=', _orders.length);
                if (err) return cb(err, _orders);

                if (!_orders || _orders.length == 0) {
                    _balance.amount = 0;
                    _balance.save((_err, r) => {
                        _retrieve();
                    });
                }
                else {
                    var balanceAmount = 0;
                    var _stackSaving = [];
                    var exit = false;
                    _orders.forEach(_order => {

                        //validate period
                        var now = moment();
                        if (!now.isSame(moment(_order.diagStart), data.period)) {
                            ctrl('User').log('balance:_calculateBalance:excluding order=' + _order._id);
                            return; // exclude  
                        }

                        _stackSaving.push(_order._id);
                        var d = {};
                        d.pending = !_.includes(['prepaid', 'completed'], _order.status);
                        d.description = _order.address + ' (' + moment(_order.diagStart).format('DD-MM-YY') + ', ' + moment(_order.diagStart).format('HH:mm') + ' - ' + moment(_order.diagEnd).format('HH:mm') + ')';
                        d.amount = _order.price;
                        //diag
                        //-_user.diagWebsiteComission (admin decide it) (-)
                        //-_order.fastDiagComm (+)
                        if (_user.userType == 'diag') {
                            var diagWebsiteComission = ((_order.price * _user.comission) / 100) * -1;

                            d.amount = _order.price + diagWebsiteComission;

                            var fastDiagComm = (d.amount * _order.fastDiagComm) / 100;
                            d.amount += fastDiagComm;
                        }
                        //admin
                        //-diag price (-)
                        //-client disccount (-)
                        //-stripe % (-)
                        if (_user.userType == 'admin') {
                            cb('Admin balance unsupported');
                            exit = true;
                            return false;
                        }
                        //client
                        //just the order price
                        d._order = _order._id;
                        d._user = _user._id;
                        //
                        balanceAmount += d.amount;
                        BalanceItem.createUpdate(d, (_err, _balanceItem) => {
                            _stackSaving = _stackSaving.slice(1);
                            //_balance.save(); //async
                            ctrl('User').log('balance:items:remain-for-saving', _stackSaving.length);
                        }, balanceItemMatch, balanceItemKeys).on('created', (_err, _balanceItem) => {
                            //_balance.items = _balance.items || [];
                            _balance.items.push(_balanceItem);
                            ctrl('User').log('balance:item:created **');
                        }).on('updated', (_err, _balanceItem) => {
                            ctrl('User').log('balance:item:updated **');
                        });

                    });
                    if (exit) return; //headers alredy sent;
                    _balance.amount = balanceAmount;
                    var waitChilds = setInterval(() => {
                        if (_stackSaving.length === 0) {
                            clearInterval(waitChilds);
                            _balance.save((_err, r) => {
                                _retrieve();
                            });
                        }
                    }, 50);
                }
            });
        }

        function _orderRules() {
            if (_user.userType == 'diag') return {
                _diag: _user._id
            };
            if (_user.userType == 'client') return {
                _client: _user._id
            };
            if (_user.userType == 'admin') return {};
        }
    }

    function _retrieve() {
        ctrl('User').log('balance:retrieve');
        Balance.get({
            _user: data._id,
            __populate: {
                'items': '_user _order pending amount description'
            }
        }, (err, _balance) => {
            return cb(err, _balance);
        });
    }
}


function isCompany(d) {
    return (d.siret != undefined && d.siret.length > 0) && (d.isAutoentrepreneur == undefined || d.isAutoentrepreneur == false);
}

function hasWallet(d) {
    return d.wallet;
}

function isClient(d) {
    return d.userType == 'client';
}

function _preUpdateWallet(data, cb, next) {
    if (!hasWallet(data)) return next(data, cb);

    function shouldUpdateWallet(incoming, user) {
        if (!user) return false;
        if (incoming.email != user.email) return true;
        if (incoming.firstName != user.firstName) return true;
        if (incoming.lastName != user.lastName) return true;
        if (incoming.siret != user.siret) return true;
        if (incoming.companyName != user.companyName) return true;
    }
    //step 1 : get registry and verify that email, firstName, lastName, siret or company name are different.
    ctrl('User').get({
        _id: data._id,
        __select: "email firstName lastName siret companyName"
    }, function(err, _user) {
        if (err) return next(err);

        if (!shouldUpdateWallet(data, _user)) {
            return next(data, cb);
        }
        else {
            //step 2 : make a lemonway wallet detail update
            var payload = {
                wallet: data.wallet,
                newEmail: data.email,
                newFirstName: data.firstName,
                newLastName: data.lastName
            };
            if (isCompany(data)) {
                payload.newCompanyIdentificationNumber = data.siret;
                payload.companyName = data.companyName || (data.firstName + ' ' + data.lastName);
                payload.newIsCompany = '1';
            }
            else {
                payload.newIsCompany = '0';
            }

            if (isClient(data)) {
                payload.isTechWallet = '1';
            }

            ctrl('Lemonway').updateWalletDetails(payload, (err, res) => {
                if (err) {


                }
                return next(data, cb);
            });
        }
    });
}

function _preCreateWallet(data, cb, next) {
    if (!data.wallet && (data.userType == 'client' || data.userType == 'diag')) {

        var payload = {
            clientMail: data.email,
            clientFirstName: data.firstName,
            clientLastName: data.lastName,
            postCode: data.postCode,
            mobileNumber: data.cellPhone
        };

        if (isCompany(data)) {
            payload.isCompany = '1';
            payload.companyName = data.companyName || (data.firstName + ' ' + data.lastName);
            payload.companyIdentificationNumber = data.siret;
        }

        return ctrl('Lemonway').registerWallet(payload, (err, res) => {
            if (!err && res && res.WALLET) {
                data.wallet = res.WALLET.ID;

            }
            if (err) {

            }
            return next(data, cb);
        });
    }
    return next(data, cb);
}


const SYSTEM_USER_TRANSFORM_KEYS = ['_id', 'email', 'discount'];

function transformResponseLimitKeys(originalCallback, keys) {
    return function(err, result) {
        if (err) return originalCallback(err);
        if (typeof result == 'object') {
            var transformedResult = {};
            keys.forEach(key => {
                transformedResult[key] = result[key];
            });
            result = transformedResult;
        }
        return originalCallback(err, result);
    }
}

function fetchBookingSystemUser(data, cb) {
    var email = BOOKING_BOT_EMAIL;
    ctrl('User').core.save({
        email: email,
        userType: 'client',
        clientType: 'landlord',
        isSystemUser: true,
        __match: {
            email: email
        }
    }, transformResponseLimitKeys(cb, SYSTEM_USER_TRANSFORM_KEYS));
}

function createLandlordClient(data, cb) {
    if (!data.email) return cb(apiError.VALIDATE_FIELD_EMAIL);
    Object.assign(data, {
        userType: 'client',
        clientType: 'landlord',
        __match: {
            email: data.email
        }
    });
    ctrl('User').core.save(data, cb);
}



function fetchLandlordAccount(data, cb) {
    return new Promise((resolve, reject) => {
        if (!data.email) return Response.error(apiError.VALIDATE_FIELD_EMAIL, cb, reject);
        if (data.isGuestAccount == undefined) return Response.error(apiError.VALIDATE_FIELD_IS_GUEST_ACCOUNT, cb, reject);
        //Fetch account (if exists)

        //dbLogger.debug('fetchLandlordAccount:valid');

        getByField('email', data.email).then(account => {
            if (account) {
                //dbLogger.debug('fetchLandlordAccount:resolve');

                account.update({
                    $set: {
                        cellPhone: data.cellPhone || account.cellPhone, //update if any
                        firstName: account.firstName || data.firstName //update if any (priority given to existing value)
                    }
                }).exec();

                Response.json(account, cb, resolve);
            }
            else {
                dbLogger.debug('fetchLandlordAccount:create');
                createLandlordClient(data, (err, user) => {
                    if (err) return Response.error(err, cb, reject);
                    dbLogger.debug('fetchLandlordAccount:resolve');
                    Response.json(user, cb, resolve);
                });
            }
        }).catch(err => Response.error(err, cb, reject));
    });
}

function getByField(fieldName, fieldValue) {
    return new Promise((resolve, reject) => {
        var data = {};
        data[fieldName] = fieldValue;
        ctrl('User').get(data, (err, res) => {
            if (err) return reject(err);
            resolve(res);
        });
    });
}

function createSystemUser(data, cb) {
    ctrl('User').core.save({
        email: data.email,
        isSystemUser: true,
        __match: {
            email: data.email
        }
    }, cb);
}

function updateGuestAccountFlag(_id, isGuestAccount, cb) {
    ctrl('User').get({
        _id: _id,
        userType: "client",
        clientType: "landlord"
    }, function(err, _client) {
        if (err) return cb(err);
        if (!_client) return cb('User is not a Client / Landlord');
        ctrl('User').update({
            _id: _client._id,
            isGuestAccount: isGuestAccount
        }, cb);
    });
}

function setAsGuestAccount(data, cb) {
    if (!data._id) return cb('_id required');
    updateGuestAccountFlag(data._id, true, cb);
}

function setAsNormalAccount(data, cb) {
    if (!data._id) return cb('_id required');
    updateGuestAccountFlag(data._id, false, cb);
}


function save(data, cb) {
    if (!_.includes(['diag', 'client', 'admin'], data.userType)) {
        if (!data.isSystemUser) {
            return cb("valid userType required");
        }
    }

    _preCreateWallet(data, cb, (data, cb) => {
        _preUpdateWallet(data, cb, __save);
    });


    function __save(data, cb) {
        ctrl('User').createUpdate(data, (err, _user) => {
            if (err) return cb(err);
            return cb(err, _user);
        }, {
            email: data.email,
            userType: data.userType
        }, ['userType', 'email']);
    }
}

function LogSave(msg, type, data, category) {
    ctrl('Log').save({
        message: msg,
        type: type,
        level: type,
        category: category,
        data: data
    });
}



function create(data, cb) {
    _preCreateWallet(data, cb, __create);

    function __create(data, cb) {
        ctrl('User').create(data, cb, ['email', 'userType', 'password']);
    }
}

function createUser(data, cb) {
    ctrl('User').log('createUser=' + JSON.stringify(data));
    data.password = data.password || generatePassword(8);
    data.userType = data.userType || 'admin';
    create(data, cb);
}

function createDiag(data, cb) {
    ctrl('User').log('createDiag=' + JSON.stringify(data));
    data.userType = 'diag';
    createUser(data, (err, _user) => {
        if (err) return cb(err, null);
        return cb(err, _user);
    });
}

function createClient(data, cb) {
    ctrl('User').log('createClient=' + JSON.stringify(data));
    data.userType = 'client';
    data.clientType = data.clientType || 'landlord';
    createUser(data, (err, _user) => {
        if (err) return cb(err, null);
        sendAccountsDetails(_user);
        return cb(err, _user);
    });
}

function sendAccountsDetails(_user) {
    ctrl('Notification').CLIENT_CLIENT_NEW_ACCOUNT({
        _user: _user
    }, (err, r) => {
        //async (write log on error)
        if (r.ok) {
            ctrl('User').log(_user.email + ' new account email sended' + JSON.stringify(r));
            _user.passwordSended = true;
            _user.save((err, r) => {
                if (!err) ctrl('User').log(_user.email + ' passwordSended=true');
            });
        }
        else {
            ctrl('User').log(_user.email + ' new account email sended failed');
            ctrl('User').log(JSON.stringify(err));
        }
    });
}

function createClientIfNew(data, cb) {
    ctrl('User').log('createClientIfNew=' + JSON.stringify(data));
    ctrl('User').check(data, ['email'], (err, r) => {
        if (err) return cb(err, null);
        ctrl('User').get({
            email: data.email
        }, (err, r) => {
            if (err) return cb(err, null);
            if (!r) {
                createClient(data, cb);
            }
            else {

                //in 10 seconds, try send account details if passwordSended==false
                setTimeout(function() {
                    if (!r.passwordSended) {
                        sendAccountsDetails(r);
                    }
                }, 10000);

                cb(null, r);
            }
        });
    });
}

function getProfileData(data, cb) {
    resolver.co(function*() {
        if (!data._id) return cb("_id required");
        var doc = yield resolver.db().model.user.findById(data._id);
        yield doc.populate('_logo').execPopulate();
        var rta = doc.toJSON();
        Object.assign(rta, {
            brandUrl: rta._logo !== undefined ? ("/res/image/" + rta._logo.fileName) : undefined
        });
        cb(null, rta);
    }).catch(err => cb(err.stack || err));
}

function login(data, cb) {
    ctrl('User').model.findOne(ctrl('User').toRules({
        email: data.email,
    })).exec((err, _user) => {
        if (!err && _user && _user.isGuestAccount) {
            return cb(apiError.GUESS_ACCOUNT_RESTRICTION);
        }
        if (_user.password != data.password) {
            _user = null;
            return cb(null, _user);
        }
        else {
            getProfileData(_user, cb);
        }
    });
}


function passwordReset(data, cb) {
    LogSave("Password reset request", 'info', data, 'password-reset');
    ctrl('User').check(data, ['email'], (err, r) => {
        if (err) return cb(err, r);
        ctrl('User').get({
            email: data.email
        }, (err, _user) => {
            if (err) return cb(err, _user);
            if (_user) {
                if (_user.isGuestAccount) {
                    return cb(apiError.GUESS_ACCOUNT_RESTRICTION);
                }
                _user.password = generatePassword(8);
                _user.save();
                resolver.getFacade('diagnostical/notification').addNotification('USER_PASSWORD_RESET', {
                    _user: _user,
                    forceSend: true,
                    to: _user.email,
                    attachDocument: _user
                }).then(r => cb(null, r)).catch(cb);
            }
            else {
                cb(apiError.EMAIL_NOT_FOUND);
            }
        })
    });
}

function validateCoupon(data) {
    //Check the coupon _id is valid, belongs to user and is not used.
    return resolver.coWrap(function*() {
        if (!data._id) return resolver.Promise.reject(resolver.apiError().ID_REQUIRED);
        if (!data.email) return resolver.Promise.reject(resolver.apiError().VALIDATE_FIELD_EMAIL);

        var user = yield resolver.controllers().user.model.findOne({
            email: data.email
        }).exec();
        if (!user) return resolver.Promise.reject(resolver.apiError().fn.COUPON_CANNOT_BE_USED('User do not exits '+data.email));
        var doc = yield resolver.controllers().coupons.model.findById(data._id).exec();
        if (doc) {
            if (doc._user.equals(user._id)) {
                if (doc.used) {
                    return resolver.Promise.reject(resolver.apiError().COUPON_ALREADY_USED);
                }
                else {
                    return resolver.Promise.resolve(true);
                }
            }
            else {
                couponsLogger.warn('User do not match',doc._user,user._id);
                return resolver.Promise.reject(resolver.apiError().fn.COUPON_CANNOT_BE_USED('User do not match'));
            }
        }
        else {
            return resolver.Promise.reject(resolver.apiError().fn.COUPON_CANNOT_BE_USED('Coupon do not exists'));
        }
    })();
}

module.exports = {
    getProfileData: getProfileData,
    validateCoupon: validateCoupon,
    createLandlordClient: createLandlordClient,
    fetchLandlordAccount: fetchLandlordAccount,
    fetchBookingSystemUser: fetchBookingSystemUser,
    setAsNormalAccount: setAsNormalAccount,
    setAsGuestAccount: setAsGuestAccount,
    departmentCoveredBy: departmentCoveredBy,
    balance: balance,
    save: save,
    createClientIfNew: createClientIfNew,
    createClient: createClient,
    login: login,
    createDiag: createDiag,
    passwordReset: passwordReset,
    create: create,
    configureSchema: (schema) => {

        schema.pre('remove', function(next) {
            //Remove notifications associated to this user
            middlewareLogger.debugTerminal('PRE/remove');

            middlewareLogger.debugTerminal('Removing notifications associated to user');
            this.model('Notification').remove({
                _user: this._id
            }).exec().catch(middlewareLogger.errorTerminal);

            this.model('Notification').remove({
                _id: {
                    $in: this._notifications
                }
            }).exec().catch(middlewareLogger.errorTerminal);


            next();
        });

        schema.post('update', function() {
            middlewareLogger.debugTerminal('POST/UPDATE');
            //postSave.apply(this);
        });

        schema.post('create', function(result) {
            middlewareLogger.debugTerminal('POST/CREATE', this._id, result._id);
            postSave.apply(this);
        });
        schema.post('save', function(result) {
            middlewareLogger.debugTerminal('POST/SAVE', this._id, result._id);
            postSave.apply(this);
        });
        schema.post('findOneAndUpdate', function(doc) {
            middlewareLogger.debug('POST/findOneAndUpdate');
            postSave.apply(doc);
        });

        return schema;
    }
};


function markNotification(doc, type) {
    var notifications = doc.notifications || {};
    notifications[type] = true;
    ctrl('User').model.update({
        _id: doc._id
    }, {
        $set: {
            notifications: doc.notifications
        }
    }).exec();
}


function getAdminAccountCreatedNotificationType(userType) {
    switch (userType) {
        case "admin":
            return NOTIFICATION.ADMIN_ADMIN_ACCOUNT_CREATED;
        case "diag":
            return NOTIFICATION.ADMIN_DIAG_ACCOUNT_CREATED;
        case "client":
            return NOTIFICATION.ADMIN_CLIENT_ACCOUNT_CREATED;
    }
}

function getClientAccountCreatedNotificationType(userType) {
    switch (userType) {
        case "diag":
            return NOTIFICATION.DIAG_DIAG_ACCOUNT_CREATED;
        case "client":
            return NOTIFICATION.CLIENT_CLIENT_NEW_ACCOUNT;
    }
}

function postSave() {
    var doc = this;

    if (!doc) return middlewareLogger.errorSave('Document expected');
    if (doc.isSystemUser) return;

    if (Date.now() - (new Date(doc.createdAt).getTime()) > 1000) {
        //Document was already in db, created notifications skip
        //return middlewareLogger.debugTerminal('Notifications skip. Creation difference is', Date.now() - (new Date(doc.createdAt).getTime()));
        return;
    }

    resolver.co(function*() {
        //admin, diag, client, account created (admins)
        everyAdmin((errr, _admin) => {
            resolver.getFacade('diagnostical/notification').addNotification(getAdminAccountCreatedNotificationType(doc.userType), {
                _user: doc,
                _admin: _admin,
                to: _admin.email,
                attachDocument: doc
            }).then(middlewareLogger.debugTerminal).catch(middlewareLogger.error);
        });
        //diag, client, account created (himself)
        if (_.includes(['diag', 'client'], doc.userType) && !doc.isGuestAccount) {
            resolver.getFacade('diagnostical/notification').addNotification(getClientAccountCreatedNotificationType(doc.userType), {
                _user: doc,
                to: doc.email,
                attachDocument: doc
            }).then(middlewareLogger.debugTerminal).catch(middlewareLogger.error);
        }
        //diag account activated (himself)
        if (doc.userType == 'diag' && doc.disabled == false) {
            resolver.getFacade('diagnostical/notification').addNotification(NOTIFICATION.DIAG_DIAG_ACCOUNT_ACTIVATED, {
                _user: doc,
                to: doc.email,
                attachDocument: doc
            }).then(middlewareLogger.debugTerminal).catch(middlewareLogger.error);
        }
    }).then(middlewareLogger.debugTerminal).catch(middlewareLogger.error);
}

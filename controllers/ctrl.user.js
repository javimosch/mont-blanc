var ctrl = require('../model/db.controller').create;
var mongoose = require('../model/db').mongoose;
var generatePassword = require("password-maker");
//var User = mongoose.model('User');
var promise = require('../model/utils').promise;
var validate = require('../model/validator').validate;
var handleMissingKeys = require('../model/validator').handleMissingKeys;
var actions = require('../model/db.actions').create('User');
var Log = require('../model/db.actions').create('Log');
var Order = require('../model/db.actions').create('Order');
var Balance = require('../model/db.actions').create('Balance');
var BalanceItem = require('../model/db.actions').create('BalanceItem');
//var email = require('./handlers.email').actions;
var _ = require('lodash');
var moment = require('moment');
var Notif = require('./ctrl.notification');
var NOTIFICATION = Notif.NOTIFICATION;
//User.methods.name = ()=>{return };

const MODULE = 'USER';
var logger = require('../model/logger')(MODULE);


var dbLogger = ctrl('Log').createLogger({
    name: "USER",
    category: "DB"
});
var afterSaveLogger = ctrl('Log').createLogger({
    name: "USER",
    category: "afterSave"
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
    actions.log('departmentCoveredBy=' + JSON.stringify(data));
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
        //actions.log('departmentCoveredBy=_users:len=' + JSON.stringify(_users.length));
        for (var x in _users) {
            //actions.log('departmentCoveredBy=looping='+x+'='+JSON.stringify(_users[x].departments||[]));
            if (_users[x].departments) {
                if (_.includes(_users[x].departments, data.department)) {
                    //  actions.log('departmentCoveredBy=check=' + JSON.stringify(_users[x].departments) + ' contra ' + data.department);
                    return cb(null, true);
                }
            }
        }
        return cb(null, false);
    });
}


function balance(data, cb) {
    data.period = data.period || 'year';
    actions.log('balance=' + JSON.stringify(data));
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
        if (!_user && firstTime == true) return actions.model.findById(data._id, _calculate);
        if (!_user) return cb("balance:calculate=User not found:" + data._id);
        //
        if (_user.userType == 'admin') {
            return cb('Admin balance unsupported');
        }
        //
        actions.log('balance:_calculate');
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
            actions.log('balance:_calculate:creteUpdate:rta', JSON.stringify(bal));
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
            actions.log('balance:_calculateBalance', JSON.stringify(_balance));
            if (err) return cb(err, _balance);
            if (!_balance) return cb('balance:create:error');
            //
            //remove prev balance items

            //
            Order.getAll(_orderRules(), (err, _orders) => {
                actions.log('balance:_calculateBalance:orders=', _orders.length);
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
                            actions.log('balance:_calculateBalance:excluding order=' + _order._id);
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
                            actions.log('balance:items:remain-for-saving', _stackSaving.length);
                        }, balanceItemMatch, balanceItemKeys).on('created', (_err, _balanceItem) => {
                            //_balance.items = _balance.items || [];
                            _balance.items.push(_balanceItem);
                            actions.log('balance:item:created **');
                        }).on('updated', (_err, _balanceItem) => {
                            actions.log('balance:item:updated **');
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
        actions.log('balance:retrieve');
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

                    /*logger.error('LEMONWAY WALLET (automatic update before saving user)', err);
                    LogSave('LEMONWAY WALLET (automatic update before saving user)', 'error', {
                        err: err,
                        payload: payload
                    });
                    */
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
                //logger.info('LEMONWAY WALLET (automatic registration before saving user)', data.wallet);
            }
            if (err) {
                //already logged by lemonway controller ..
                //logger.error('LEMONWAY WALLET (automatic registration before saving user)', err);
                //LogSave('LEMONWAY WALLET (automatic registration before saving user)', 'error', err);
            }
            return next(data, cb);
        });
    }
    return next(data, cb);
}



function save(data, cb) {
    if (!_.includes(['diag', 'client', 'admin'], data.userType)) {
        return cb("invalid userType " + data.userType);
    }

    _preCreateWallet(data, cb, (data, cb) => {
        _preUpdateWallet(data, cb, __save);
    });

    /*
        var originalItem = null;
        function __fetch(data, cb) {
            if (data._id) {
                actions.get({
                    _id: data._id
                }, (err, _user) => {
                    if (err) return cb(err);
                    originalItem = _user;
                    return __save(data, cb);
                });
            }
            else {
                return __save(data, cb);
            }
        }*/

    function __save(data, cb) {
        actions.createUpdate(data, (err, _user) => {
            if (err) return cb(err);

            /*
            if (_user.userType == 'diag' && !_user.disabled) {
                if (_user.notifications && !_user.notifications.DIAG_DIAG_ACCOUNT_ACTIVATED) {
                    //dbLogger.debugSave('Should notify activation ', _user.email);    
                    Notif.trigger(NOTIFICATION.DIAG_DIAG_ACCOUNT_ACTIVATED, {
                        _user: _user
                    }, (_err, r) => handleNewAccount(_user, err, r));
                }
            }*/

            return cb(err, _user);
        }, {
            email: data.email,
            userType: data.userType
        }, ['userType', 'email']).on('created', postCreate_notifications);
    }



    function postCreate_notifications(err, _user) {

        /*
                dbLogger.setSaveData({
                    _user: _user,
                    err: err
                });
                dbLogger.debugSave('OnCreate: ', _user.email);
        */

        switch (_user.userType) {
            case 'admin':
                {
                    Notif.trigger(NOTIFICATION.ADMIN_ADMIN_ACCOUNT_CREATED, {
                        _user: _user
                    }, (_err, r) => handleNewAccount(_user, err, r));
                    return;
                }
                break;
            case 'client':
                {
                    Notif.trigger(NOTIFICATION.CLIENT_CLIENT_NEW_ACCOUNT, {
                        _user: _user
                    }, (_err, r) => handleNewAccount(_user, err, r));

                    everyAdmin((err, _admin) => {
                        if (err) return cb && cb(err) || LogSave(JSON.stringify(err), 'error', err);
                        Notif.trigger(NOTIFICATION.ADMIN_CLIENT_ACCOUNT_CREATED, {
                            _user: _user,
                            _admin: _admin
                        }, (_err, r) => handleNewAccount(_user, err, r));
                    });
                    return;
                }
                break;
            case 'diag':
                {
                    Notif.trigger(NOTIFICATION.DIAG_DIAG_ACCOUNT_CREATED, {
                        _user: _user
                    }, (_err, r) => handleNewAccount(_user, err, r));
                    /*
                                        everyAdmin((err, _admin) => {
                                            if (err) return cb && cb(err) || LogSave(JSON.stringify(err), 'error', err);
                                            Notif.trigger(NOTIFICATION.ADMIN_DIAG_ACCOUNT_CREATED, {
                                                _user: _user,
                                                _admin: _admin
                                            }, (_err, r) => handleNewAccount(_user, err, r));
                                        });
                                        return;*/
                }
                break;
        }
    }
}

function LogSave(msg, type, data, category) {
    Log.save({
        message: msg,
        type: type,
        level: type,
        category: category,
        data: data
    });
}

function handleNewAccount(_user, err, r) {
    return;
    //deprecated
    /*
    if (err) return LogSave(err.message, 'error', err);
    if (r && r.ok) {
        actions.log(_user.email + ':passwordSended');
        _user.passwordSended = true;
        _user.save();
    }
    else {
        actions.log(_user.email + ' passwordSended email fail ' + JSON.stringify(r));
        LogSave(r.message, 'warning', r);
    }*/
}

function create(data, cb) {
    _preCreateWallet(data, cb, __create);

    function __create(data, cb) {
        actions.create(data, cb, ['email', 'userType', 'password']);
    }
}

function createUser(data, cb) {
    actions.log('createUser=' + JSON.stringify(data));
    data.password = data.password || generatePassword(8);
    data.userType = data.userType || 'admin';
    create(data, cb);
}

function createDiag(data, cb) {
    actions.log('createDiag=' + JSON.stringify(data));
    data.userType = 'diag';
    createUser(data, (err, _user) => {
        if (err) return cb(err, null);
        return cb(err, _user);
    });
}

function createClient(data, cb) {
    actions.log('createClient=' + JSON.stringify(data));
    data.userType = 'client';
    data.clientType = data.clientType || 'landlord';
    createUser(data, (err, _user) => {
        if (err) return cb(err, null);
        sendAccountsDetails(_user);
        return cb(err, _user);
    });
}

function sendAccountsDetails(_user) {
    Notif.CLIENT_CLIENT_NEW_ACCOUNT({
        _user: _user
    }, (err, r) => {
        //async (write log on error)
        if (r.ok) {
            actions.log(_user.email + ' new account email sended' + JSON.stringify(r));
            _user.passwordSended = true;
            _user.save((err, r) => {
                if (!err) actions.log(_user.email + ' passwordSended=true');
            });
        }
        else {
            actions.log(_user.email + ' new account email sended failed');
            actions.log(JSON.stringify(err));
        }
    });
}

function createClientIfNew(data, cb) {
    actions.log('createClientIfNew=' + JSON.stringify(data));
    actions.check(data, ['email'], (err, r) => {
        if (err) return cb(err, null);
        actions.get({
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

function login(data, cb) {
    console.log('USER:login=' + JSON.stringify(data));
    actions.model.findOne(actions.toRules({
        email: data.email,
        password: data.password
    })).exec(cb);
}


function passwordReset(data, cb) {
    LogSave("Password reset request", 'info', data, 'password-reset');
    actions.check(data, ['email'], (err, r) => {
        if (err) return cb(err, r);
        actions.get({
            email: data.email
        }, (err, _user) => {
            if (err) return cb(err, _user);
            if (_user) {

                _user.password = generatePassword(8);
                _user.save();
                LogSave("Password reset generated", 'info', {
                    email: _user.email,
                    password: "[Sended via email]"
                }, 'password-reset');

                Notif.trigger('USER_PASSWORD_RESET', {
                    _user: _user,
                    forceSend: true
                }, (err, r) => {
                    LogSave("Password reset notification", err ? "warning" : 'info', {
                        email: _user.email,
                        err: err,
                        response: r
                    }, "password-reset");
                    return cb(err, r);
                })


            }
        })
    });
}

module.exports = {
    //custom
    departmentCoveredBy: departmentCoveredBy,
    balance: balance,
    save: save,
    createClientIfNew: createClientIfNew,
    createClient: createClient,
    login: login,
    createDiag: createDiag,
    passwordReset: passwordReset,
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
        //hook('preSave', preSave);
        hook('afterSave', afterSave);
    }
};


function afterSave(data) {
    if (!data) {
        afterSaveLogger.errorSave('data required (_user)');
        return data;
    }
    if (data && !data._id) {
        afterSaveLogger.setSaveData(data);
        afterSaveLogger.warnSave('_user should have an _id');
        return data;
    }
    else {
        //afterSaveLogger.setSaveData(data);
         //afterSaveLogger.debugSave('Success');
         
         /*if(!data.__fetch){
             return ctrl('User').get({
                 _id:data._id
             },(err,_user)=>{
                data.__fetch = true;
                if(!err) Object.assign(data,_user);
                return afterSave(data);
             })
         }*/

        data.notifications = data.notifications || {};

    }

    //ADMIN#1 OK ctrl.user
    if (data.notifications && data.userType == 'admin' && !data.notifications.ADMIN_ADMIN_ACCOUNT_CREATED) {
        Notif.trigger(NOTIFICATION.ADMIN_ADMIN_ACCOUNT_CREATED, {
            _user: data
        },err=>{
            if(!err){
                data.notifications.ADMIN_ADMIN_ACCOUNT_CREATED = true;
            }
        });
    }

    //ADMIN//#2 OK ctrl.user
    if (data.notifications && data.userType == 'client' && !data.notifications.ADMIN_CLIENT_ACCOUNT_CREATED) {
        everyAdmin((err, _admin) => {
            if (err) return LogSave(JSON.stringify(err), 'error', err);
            Notif.trigger(NOTIFICATION.ADMIN_CLIENT_ACCOUNT_CREATED, {
                _user: _.cloneDeep(data),
                _admin: _admin
            });
        });
        data.notifications.ADMIN_CLIENT_ACCOUNT_CREATED = true;
    }


    //DIAG// AFTER ACCOUNT ACTIVATION
    if (data.notifications && data.userType == 'diag' && data.disabled == false && !data.notifications.DIAG_DIAG_ACCOUNT_ACTIVATED) {
        Notif.trigger(NOTIFICATION.DIAG_DIAG_ACCOUNT_ACTIVATED, {
            _user: data
        },err=>{
            if(!err){
                data.notifications.DIAG_DIAG_ACCOUNT_ACTIVATED = true;
            }
        });
    }

    //ADMIN DIAG AFTER ACCOUNT CREATION
    if (data.notifications && data.userType == 'diag' && !data.notifications.ADMIN_DIAG_ACCOUNT_CREATED) {
        everyAdmin((err, _admin) => {
            if (err) return afterSaveLogger.errorSave('admins iteration error');
            Notif.trigger(NOTIFICATION.ADMIN_DIAG_ACCOUNT_CREATED, {
                _user: _.cloneDeep(data),
                _admin: _admin
            });
        });
        data.notifications.ADMIN_DIAG_ACCOUNT_CREATED = true;
    }

    return data;
}

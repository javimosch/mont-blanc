const urlDirectkit = "https://sandbox-api.lemonway.fr/mb/demo/dev/directkitjson2/Service.asmx/"
const request = require('request');
const Promise = require('promise');
var ctrl = require('../model/db.controller');
var moment = require('moment');
const publicIp = require('public-ip');
const uid = require('rand-token').uid;
let login = process.env.LEMON_LOGIN,
    pass = process.env.LEMON_PASS;
let MODULE = 'LEMONWAY';
var logger = require('../model/logger')(MODULE);
var commonParams = {
    "wlLogin": login,
    "wlPass": pass,
    "language": "en",
    "walletIp": "1.1.1.1",
    "walletUa": "DiagnosticalNPM",
};

publicIp.v4().then(ip => {
    commonParams.walletIp = ip;
});

module.exports = {
    registerWallet: registerWallet,
    registerReceiverWalletTest: registerReceiverWalletTest
};


//API EXPOSED METHODS

function registerWallet(data, callback) {
    callback = callback || (()=>{});
    data.wallet = uid(5).toString().toUpperCase();
    lemonway.registerWallet(data).then((r) => {
        logger.info('LEMONWAY WALLET manual registration',data.clientMail);
        callback(null, r);
    }, (err) => {

        if (err.Code && err.Code.toString() == '204') {
            return lemonway.getWalletDetails({
                email: data.clientMail
            }).then(function(res) {
                logger.info('LEMONWAY WALLET manual registration (existing) ',data.clientMail);
                callback(null, res);
            }, function(err) {
                callback(err);
            });
        }
        callback(err);

    });
}

function registerReceiverWalletTest(data, callback) {
    var id = uid(5).toString().toUpperCase();
    console.log(MODULE, 'registerReceiverWalletTest', id);
    lemonway.registerWallet({
        wallet: id,
        clientMail: 'diag_' + id + '@diags.com',
        clientFirstName: 'Receiver ' + id,
        clientLastName: 'Fake',
        street: "26 rue de Paris",
        postCode: "93100",
        city: "Montreuil",
        phoneNumber: "339582859",
        mobileNumber: "339582234",
        isCompany: 0,
        //companyName:'()'
    }).then(function(res) {
        callback(null, res);
    }, function(err) {
        callback(err);
    })
}

//PRIVATE METHODS



//LEMONWAY API WRAPPER

var lemonway = {
    registerWallet: function(params) {
        params["version"] = "1.1";
        return send('RegisterWallet', params);
    },
    getWalletDetails: function(params) {
        params["version"] = "2.0";
        return send('GetWalletDetails', params);
    },
    updateWalletDetails: function(params) {
        params["version"] = "1.0";
        return config.sendRequest('UpdateWalletDetails', params);
    },
    registerCard: function(params) {
        params["version"] = "1.2";
        return config.sendRequest('RegisterCard', params);
    },
    moneyInWithCardId: function(params) {
        params["version"] = "1.1";
        return config.sendRequest(MoneyInWithCardId, params);
    },
    sendPayment: function(params) {
        params["version"] = "1.0";
        return config.sendRequest('SendPayment', params);
    },
    registerIBAN: function(params) {
        params["version"] = "1.1";
        return config.sendRequest('RegisterIBAN', params);
    },
    moneyOut: function(params) {
        params["version"] = "1.3";
        return config.sendRequest('MoneyOut', params);
    }
}


function send(methodName, postData) {
    // Configure
    for (var param in commonParams) {
        postData[param] = commonParams[param];
    }

    var options = {
        url: urlDirectkit + methodName,
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        },
        json: {
            "p": postData
        }
    };

    console.log(MODULE, 'sending');
    console.log(MODULE, postData);

    // Use promise to avoid callback hell
    var promise = new Promise(function(resolve, reject) {
        // Request
        request(options, function(error, response, body) {
            if (error) {
                // Handle request error
                console.log(MODULE, methodName, 'request error', error);
                reject(error);
            } else if (response.statusCode != 200) {
                // Handle HTTP error
                console.log(MODULE, methodName, 'http error', response.statusCode, body.Message);
                reject({
                    code: response.statusCode,
                    message: body.Message
                });
            } else {
                if (body.d.E) {
                    console.log(MODULE, methodName, 'api error', body.d.E);
                    reject(body.d.E);
                } else {
                    console.log(MODULE, methodName, 'resolved', body.d);
                    resolve(body.d);
                }
            }
        });
    });

    return promise;
}
const urlDirectkit = "https://sandbox-api.lemonway.fr/mb/demo/dev/directkitjson2/Service.asmx/"
const request = require('request');
const Promise = require('promise');
var ctrl = require('../model/db.controller');
var moment = require('moment');
const publicIp = require('public-ip');
let login = process.env.LEMON_LOGIN,
    pass = process.env.LEMON_PASS;

var actions = {
    log: (m) => {
        console.log('LEMONWAY'.toUpperCase() + ': ' + JSON.stringify(m));
    }
};

var commonParams = {
    "wlLogin": login,
    "wlPass": pass,
    "language": "en",
    "walletIp": "1.1.1.1",
    "walletUa": "DiagnosticalNPM",
};

publicIp.v4().then(ip => {
    commonParams.walletIp=ip;
});


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

    actions.log('sending');
    actions.log(postData);

    // Use promise to avoid callback hell
    var promise = new Promise(function(resolve, reject) {
        // Request
        request(options, function(error, response, body) {
            if (error) {
                // Handle request error
                console.log(error);
                reject(error);
            } else if (response.statusCode != 200) {
                // Handle HTTP error
                console.log("Error " + response.statusCode + ": " + body.Message);
                reject({
                    code: response.statusCode,
                    message: body.Message
                });
            } else {
                if (body.d.E) {
                    // Handle API error
                    console.log(body.d.E);
                } else {
                    resolve(body.d);
                }
            }
        });
    });

    return promise;
}

module.exports = {
    test: test
};


function test(data, callback) {
    send('RegisterWallet', {
        id: '123456',
        email: 'test_1@fake.com',
        firstName: 'test_1',
        lastName: 'Prueba',
        //birthdate: birthdate
    }, function(err, result) {
        console.log(err || result);
        callback(null, true);
    });
}

/*
"domain","_events","_eventsCount","_maxListeners","wsdl","streamAllowed","RegisterWallet","FastPay","UpdateWalletDetails","UpdateWalletStatus","GetWalletDetails","MoneyIn","MoneyIn3DInit","MoneyIn3DConfirm","MoneyInWebInit","RegisterCard","UnregisterCard","MoneyInWithCardId","MoneyInValidate","RegisterIBAN","RegisterIBANExtended","MoneyOut","GetPaymentDetails","GetMoneyInTransDetails","GetMoneyOutTransDetails","UploadFile","GetKycStatus","GetMoneyInIBANDetails","RefundMoneyIn","GetBalances","MoneyIn3DAuthenticate","MoneyInIDealInit","MoneyInIDealConfirm","RegisterSddMandate","UnregisterSddMandate","MoneyInSddInit","GetMoneyInSdd","GetMoneyInChequeDetails","GetWalletTransHistory","GetChargebacks","MoneyInChequeInit","SignDocumentInit","CreateVCC","MoneyInNeosurf","GetWizypayAds","SendPayment","MoneyInSofortInit","MoneyInMultibancoInit","MoneyInPayshopInit","MoneyInMbwayInit","MoneyInPayTrailInit","MoneyInMobilePayInit","CreatePaymentForm","DisablePaymentForm","GetCompletedPaymentForm","Service_mb_json","httpClient"
*/
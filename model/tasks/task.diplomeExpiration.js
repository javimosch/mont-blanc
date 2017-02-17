var name = 'task:diplomeExpirationCheck';
var _ = require('lodash');
var moment = require('moment');
var User = require('../db.actions').create('User');
var Order = require('../db.actions').create('Order');
var Log = require('../db.controller').create('Log');
var Email = require('../../controllers/ctrl.email');
var Notif = require('../../controllers/ctrl.notification');
var NOTIFICATION = Notif.NOTIFICATION;
var log = (m) => {
    console.log(name + ': ' + m);
    return name + ': ' + m;
}
var dblog = (msg, type) => Log.save({
    message: msg,
    type: type
});


var Logger = Log.createLogger({
    name: "AUTOMATED-TASK",
    category: "DIPLOME-EXPIRATION"
});

module.exports = {
    name: name,
    interval: 1000 * 60 * 60, //each hour
    handler: handler,
    startupInterval: true,
    startupIntervalDelay: 1000 //20000
};

function handler(data, cb) {
    // log('retrieve diags in progress');
    User.getAll({
        userType: 'diag'
    }, (err, r) => {
        if (err) return dblog(log('Fail to retreive diags.'));
        // log('retrieve diags ok');
        var filename, info;
        r.forEach(diag => {
            if (_.isUndefined(diag.diplomesInfo)) {
                //  log(diag.email + ' diplomesInfo undefined.');
            }
            else {
                //expirationDateNotificationEnabled
                //expirationDateNotificationSended
                //filename
                //expirationDate
                //obtentionDate
                Object.keys(diag.diplomesInfo).forEach((id) => {
                    info = diag.diplomesInfo[id];
                    filename = info.filename || 'unkown-file-name (' + id + ' = ' + JSON.stringify(info) + ')';

                    //console.log('DIAG ', diag.email, ' DIPLOMA', filename, 'INFO', info);

                    //
                    if (_.isUndefined(info.expirationDateNotificationEnabled)) {
                        //log(diag.email + ' ' + filename + ' expirationDateNotificationEnabled field required.');
                    }
                    else {
                        if (_.isUndefined(info.expirationDate)) {
                            // log(diag.email + ' ' + filename + ' expirationDate field required.');
                            Logger.setSaveData(info);
                            Logger.warnSave(diag.email+' has a file without date.');
                        }
                        else {

                            //console.log('DIAG ', diag.email, ' DIPLOMA', filename, 'CHECKING..');

                            if (moment().diff(moment(info.expirationDate), 'days') < 31) {
                                if (!_.isUndefined(info.expirationDateNotificationSended) && info.expirationDateNotificationSended === true) {
                                    // log(diag.email + ' ' + filename + ' has expire and alert was already sended.');
                                    //console.log('DIAG ', diag.email, ' DIPLOMA', filename, 'SENDED ALREADY');

                                    Logger.setSaveData(info);
                                    Logger.debugSave(diag.email+' has an expired file.');

                                }
                                else {
                                    
                                    Logger.setSaveData(info);
                                    Logger.debugSave(diag.email+' file expiration notified to admins.');
                                    
                                    //console.log('DIAG ', diag.email, ' DIPLOMA', filename, 'SENDING NOW');
                                    User.getAll({
                                        userType: 'admin'
                                    }, (err, admins) => {
                                        if (err) {
                                            return dblog(log('Fai lto retrieve admins.'));
                                        }
                                        else {
                                            admins.forEach(_admin => {
                                                sendEmail(_admin, diag, info, id);
                                            });
                                        }
                                    });
                                }
                            }
                        }
                    }
                });
            }
        });
    });
}

function sendEmail(_admin, _diag, _info, _diplomeId) {

    Notif.trigger(NOTIFICATION.ADMIN_DIPLOME_EXPIRATION, {
        _admin: _admin,
        _diag: _diag,
        _info: _info,
        filename: _info.filename,

    }, (_err, r) => {
        if (_err) {
            Logger.errorSave('Try to send the notification to an admin ', _err);
            //returndblog(log('Fail when sending alert email to ' + _admin.email));
        }
        //dblog(log('Email sended to ' + _admin.email), 'success');
        //
        _info.expirationDateNotificationSended = true;
        _diag.diplomesInfo[_diplomeId] = _info;
        //
        User.update(_diag, (_err, r) => {
            if (_err) {
                Logger.setSaveData(_err);
                Logger.errorSave('Try to update the diploma flag after sending notification ', _err);
                //return dblog(log('Fail when updating expirationDateNotificationSended on ' + _diag.email));
            }

        });
    })

}

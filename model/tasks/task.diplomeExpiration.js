var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var ctrl = require('../db.controller').create;
var name = 'task:diplomeExpirationCheck';
var _ = require('lodash');
var moment = require('moment');
var NOTIFICATION = ctrl('Notification').NOTIFICATION;
var log = (m) => {
    console.log(name + ': ' + m);
    return name + ': ' + m;
}
var dblog = (msg, type) => ctrl('Log').save({
    message: msg,
    type: type
});


var Logger = ctrl('Log').createLogger({
    name: "AUTOMATED-TASK",
    category: "DIPLOME-EXPIRATION"
});

module.exports = {
    name: name,
    interval: 1000 * 60 * 60 * 10, //each 10 hours
    handler: handler,
    runAtStartup: false,
    runAtStartupDelay: 20000 //20000
};

function handler(data, cb) {
    // log('retrieve diags in progress');
    ctrl('User').getAll({
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
                            Logger.warnSave(diag.email + ' has a file without date.');
                        }
                        else {

                            //console.log('DIAG ', diag.email, ' DIPLOMA', filename, 'CHECKING..');

                            if (moment().diff(moment(info.expirationDate), 'days') < 31) {
                                if (!_.isUndefined(info.expirationDateNotificationSended) && info.expirationDateNotificationSended === true) {
                                    // log(diag.email + ' ' + filename + ' has expire and alert was already sended.');
                                    //console.log('DIAG ', diag.email, ' DIPLOMA', filename, 'SENDED ALREADY');

                                    //Logger.setSaveData(info);
                                    //Logger.debugSave(diag.email+' has an expired file.');

                                }
                                else {

                                    Logger.setSaveData(info);
                                    Logger.debugSave(diag.email + ' file expiration notified to admins.');

                                    //console.log('DIAG ', diag.email, ' DIPLOMA', filename, 'SENDING NOW');
                                    ctrl('User').getAll({
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
    resolver.getFacade('diagnostical/notification').addNotification(NOTIFICATION.ADMIN_DIPLOME_EXPIRATION, {
        _admin: _admin,
        _diag: _diag,
        _info: _info,
        filename: _info.filename,
        to: _admin.email,
        attachDocument: _diag,
        forceSend: true
    }).then((r) => updateUserDiplomes(_diag, _info));

    function updateUserDiplomes(doc, _info) {
        return resolver.coWrap(function*(val) {
            _info.expirationDateNotificationSended = true;
            var setPayload = {};
            setPayload[
                "diplomesInfo." + _diplomeId
            ] = _info;
            yield resolver.db().model.user.update({
                _id: doc._id,
            }, {
                $set: setPayload
            });
            return yield Promise.resolve(val);
        })();
    }
}

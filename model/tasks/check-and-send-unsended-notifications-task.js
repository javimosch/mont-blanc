var taskName = 'check-and-send-unsended-notifications';
var _ = require('lodash');
var moment = require('moment');
var selectController = require('../db.controller').create;
var path = require('path');
var MailFacade = require(path.join(process.cwd(), 'model/facades/mail-facade'));
var Logger = null;
module.exports = {
    name: taskName,
    interval: 1000 * 15, //each 30 seconds
    handler: handler,
    runAtStartup: true,
    runAtStartupDelay: 5000
};

function loggerLazyInitialization() {
    if (Logger) return Logger;
    Logger = selectController('Log').createLogger({
        name: "AUTOMATED-TASK",
        category: "NOTIFICATIONS"
    });
}

function handler() {
    loggerLazyInitialization();
    selectController('Notification').getAll({
        sended: false
    }, (err, _notifications) => {
        if (err) {
            Logger.setSaveData(err);
            return Logger.errorSave("Fetch issue");
        }
        if (_notifications.length == 0) return;

        _notifications.forEach(_notification => {
            if (Queue.has(_notification._id)) {
                Logger.debug('loop skip: already in queue', _notification._id);
                return false;
            }
            Queue.add(_notification.id);
            MailFacade.send(_notification).then(() => {
                _notification.sended = true;
                _notification.save().then(n => {
                    Queue.remove(n._id);
                });
            });
        });
    });
}

var Queue = (() => {
    var list = {};
    return {
        add: (id) => list[id] = true,
        has: (id) => list[id] === true,
        done: id => list.splice(list.indexOf(id), 1)
    };
})();

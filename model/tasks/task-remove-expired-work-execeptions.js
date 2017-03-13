var name = 'task-remove-expired-work-execeptions';
var _ = require('lodash');
var moment = require('moment');
var selectController = require('../db.actions').create;


var log = (m) => {
    console.log(name + ': ' + m);
    return name + ': ' + m;
}
var logError = (msg, data) => {
    log(msg);
    selectController('Log').save({
        category: "programmed-tasks",
        level: 'error',
        type: 'error',
        message: msg,
        data: data
    })
};
var logExpired = (item) => {
    var msg = "Indisponibilité spécifique removed";
    var data = {
        diag: item._user.email,
        description: item.description,
        start: moment(item.start).format('DD/MM/YYYY [à] HH[h]mm'),
        end: moment(item.end).format('DD/MM/YYYY [à] HH[h]mm')
    };
    log(msg);
    selectController('Log').save({
        category: "programmed-tasks",
        level: 'info',
        type: 'info',
        message: msg,
        data: data
    });
};

module.exports = {
    name: name,
    interval: 1000 * 60 * 60, //each 60 minutes
    handler: handler,
    runAtStartup: false,
    runAtStartupDelay: 20000
};

function handler(data, cb) {
    selectController('User').getAll({
        userType: 'diag'
    }, (err, res) => {
        if (err) return logError('Fail to retreive diags.', err);
        res.forEach(diag => {

            selectController('TimeRange').getAll({
                _user: diag._id,
                type: "work-exception"
            }, (err, timeRanges) => {
                if (err) return logError('Fail to retreive work exceptions.', err);
                if (timeRanges) {
                    timeRanges.forEach(item => {
                        if (item.repeat == 'none') {
                            if (moment(item.end).isBefore(moment())) {

                                selectController('TimeRange').removeWhen({
                                    _id: item._id
                                }, (err, res) => {
                                    if (err) return logError('Fail to remove work exception.', err);
                                    item._user = diag;
                                    logExpired(item);
                                });
                            }
                        }
                    });
                }

            });


        });
    });
}



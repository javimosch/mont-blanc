var name = 'task:diags-remove-unpaid-orders';
var _ = require('lodash');
var moment = require('moment');
var ctrl = require('../db.controller').create;
var fs = require('fs');
var path = require('path');
var LogSave = (msg, data, type) => ctrl('Log').save({
    message: msg,
    type: type || 'error',
    data: data
});
module.exports = {
    name: name,
    interval: 1000 * 60 * 5, //each 5 minutes
    handler: handler,
    runAtStartup: true,
    runAtStartup: 1000,
};


var _logger;

function Logger() {
    if (_logger) return _logger;
    _logger = ctrl('Log').createLogger({
        name: "AUTOMATED-TASK",
        category: "CLEAN-ORDERS"
    });
    return _logger;
}

function handler(data, cb) {
    //Logger().debug('remove-unpaid-orders', 'start');
    //
    var Order = ctrl('Order');
    Order.getAll({
        status: "created",
        __populate: {
            _client: "email"
        }
    }, (err, orders) => {
        if (err) return Logger().error(err);
        //Logger().debug('get-all success', orders && orders.length);
        orders.forEach(_order => {
            //Logger().debug('order id', _order._id, _order._client.email);

            var ownerIsBot = _order._client.email.indexOf('bookingbot') !== -1;
            var normalCondition = Date.now() - new Date(_order.createdAt) > 1000 * 60 * 60 * 48;

            var bookingWithBotCondition = Date.now() - new Date(_order.createdAt) > 1000 * 60 * 15;
            var deleteCondition = ownerIsBot ? bookingWithBotCondition : normalCondition;

            if (deleteCondition) {
                //Logger().debug('order remove');
                Order.remove({
                    _id: _order._id
                }, (err) => {
                    //Logger().debug('remove success', !err);
                    if (err) return LogSave(name + " error", err);

                    Logger().debug('Unpaid order removed.', _order.address, ownerIsBot ? "(Booking bot)" : "");
                });
            }
        })
    });
    //
    //console.log('remove-unpaid-orders', 'end');
}

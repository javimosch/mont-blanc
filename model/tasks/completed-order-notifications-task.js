var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var taskName = 'completed-order-notifications';
//var _ = require('lodash');
var moment = require('moment');
var selectController = require('../db.controller').create;
var OrderFacade = require(path.join(process.cwd(), 'model/facades/order-facade'));
var ERROR = require(path.join(process.cwd(), 'model/config')).ERROR;
var invoiceFacade = require(path.join(process.cwd(), 'model/facades/invoice-facade'));
var compileTemplate = require(path.join(process.cwd(), 'model/facades/email-template-facade')).compile;
var logger = null;
module.exports = {
    name: taskName,
    interval: 1000 * 60, //each 1 minute
    handler: handler,
    runAtStartup: true,
    log: true,
    runAtStartupDelay: 10000
};

function loggerLazyInitialization() {
    if (logger) return logger;
    logger = selectController('Log').createLogger({
        name: "AUTOMATED-TASK",
        category: "COMPLETED-ORDER"
    });
}

function handler() {
    loggerLazyInitialization();
    selectController('Order').getAll({
        status: 'completed',
        __populate: {
            _client: "_id email"
        }
    }, (err, _orders) => {
        if (err) {
            logger.setSaveData(err);
            return logger.errorSave(ERROR.DATABASE_ISSUE);
        }
        if (_orders.length == 0) return;
        _orders.forEach(doc => {


            resolver.co(function*() {

                //Order number is required for invoicing
                if (!doc.number) {
                    yield OrderFacade.assignInvoiceNumber(doc._id).catch(resolver.errorHandler(logger.error));
                }

                if (!hasInvoiceAttached(doc)) {
                    //Logger.debug("Attaching invoice...");
                    doc = yield OrderFacade.assignInvoiceFile(doc._id);
                    completedNotification(doc);
                }
                else {
                    //Logger.debug("Order already has an attached invoice");
                    completedNotification(doc);
                }
            }).catch(resolver.errorHandler(logger.error));


        });

    });
}



function completedNotification(_order) {
    if (!_order) return logger.error('completedNotification requires _order');


    if (_order && _order._client && !_order._client.email) {
        logger.error("completedNotification requires _order._client.email");
    }

    var type = 'CLIENT_COMPLETED_ORDER';

    selectController('Notification').exists({
        _user: _order._client._id,
        type: type
    }, (_err, exists) => {
        if (exists) {
            //Logger.debug("Completed notification already added");
        }
        else {

            OrderFacade.hasNotification(_order._id, type).then(hasNotification => {
                if (hasNotification) {
                    return logger.debug("Notification already exist in order", type);
                }
                var payload = {
                    _user: _order._client._id,
                    type: type,
                    from: selectController('Email').EMAIL_FROM_ALTERNATIVE,
                    to: _order._client.email,
                    subject: 'Votre diagnostic est disponible en téléchargement !',
                    contents: compileTemplate(type, {
                        _order: _order,
                        _user: _order._client
                    }),
                    metadata: {},
                    __match: {
                        _user: _order._client._id,
                        type: type,
                    }
                };

                //Step 1: Save a notification
                selectController('Notification').save(payload, (err, _notificaction) => {
                    if (err) {
                        logger.setSaveData({
                            payload,
                            err
                        });
                        return logger.errorSave(ERROR.DATABASE_ISSUE);
                    }
                    logger.debug("Completed notification added");
                });

                //Step 2: Mark this notification as triggered (somewhere)
                _order.notifications = _order.notifications || {};
                _order.notifications[type] = true;
                selectController('Order').update({
                    _id: _order._id,
                    notifications: _order.notifications
                });

                //Logger.debug("Mark this notification as triggered (somewhere)", type);


            });
        }
    });
}

function hasInvoiceAttached(_order) {
    return _order && _order.files && _order.files.invoice;
}

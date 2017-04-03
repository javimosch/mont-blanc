var taskName = 'completed-order-notifications';
var _ = require('lodash');
var moment = require('moment');
var selectController = require('../db.controller').create;
var path = require('path');
var OrderFacade = require(path.join(process.cwd(), 'model/facades/order-facade'));
var ERROR = require(path.join(process.cwd(), 'model/config')).ERROR;
var invoiceFacade = require(path.join(process.cwd(), 'model/facades/invoice-facade'));
var compileTemplate = require(path.join(process.cwd(), 'model/facades/email-template-facade')).compile;
var Logger = null;
module.exports = {
    name: taskName,
    interval: 1000 * 60, //each 1 minute
    handler: handler,
    runAtStartup: true,
    runAtStartupDelay: 10000
};

function loggerLazyInitialization() {
    if (Logger) return Logger;
    Logger = selectController('Log').createLogger({
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
            Logger.setSaveData(err);
            return Logger.errorSave("Fetch issue");
        }
        if (_orders.length == 0) return;
        _orders.forEach(_order => {
            if (!hasInvoiceAttached(_order)) {
                //Logger.debug("Attaching invoice...");


                OrderFacade.getPopulatedById(_order._id).then(_order => {

                    var dbFileName = "facture-" + _order.number + "-" + _order.address.substring(0, _order.address.indexOf(',')).replaceAll(' ', '-').toLowerCase() + '-' + moment(_order.start).format('DD-MM-YYYY-a-HH[h]mm')

                    invoiceFacade.fromOrderToDatabase(_order, dbFileName).then(file => {
                        attachInvoice(_order, file).then(_order => {
                            completedNotification(_order);
                        });
                    }).catch(err => {
                        Logger.setSaveData(err);
                        return Logger.errorSave("Fetch issue");
                    });
                });


            }
            else {
                //Logger.debug("Order already has an attached invoice");
                completedNotification(_order);
            }
        });

    });
}



function completedNotification(_order) {
    if (!_order) return Logger.error('completedNotification requires _order');


    if (_order && _order._client && !_order._client.email) {
        Logger.error("completedNotification requires _order._client.email");
    }

    var type = 'CLIENT_COMPLETED_ORDER';

    selectController('Notification').exists({
        _user: _order._client._id,
        type: type
    }, (_err, exists) => {
        if (exists) {
            Logger.debug("Completed notification already added");
        }
        else {

            OrderFacade.hasNotification(_order._id, type).then(hasNotification => {
                if (hasNotification) {
                    return Logger.debug("Notification already exist in order", type);
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
                        Logger.setSaveData({
                            payload,
                            err
                        });
                        return Logger.errorSave(ERROR.DATABASE_ISSUE);
                    }
                    Logger.debug("Completed notification added");
                });

                //Step 2: Mark this notification as triggered (somewhere)
                _order.notifications = _order.notifications || {};
                _order.notifications[type] = true;
                selectController('Order').update({
                    _id: _order._id,
                    notifications: _order.notifications
                });
                
                Logger.debug("Mark this notification as triggered (somewhere)", type);


            });
        }
    });
}

function hasInvoiceAttached(_order) {
    return _order && _order.files && _order.files.invoice;
}

function attachInvoice(_order, invoiceFile) {
    return new Promise((resolve, reject) => {
        _order.files = _order.files || {};
        _order.files.invoice = invoiceFile;
        //
        var payload = {
            _id: _order._id,
            files: _order.files
        };
        Logger.debug("Updating order files", payload);
        selectController('Order').update(payload, (err, ok) => {
            if (err) return reject(err);
            resolve(_order);
        });
    });
}

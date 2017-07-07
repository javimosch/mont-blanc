var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var OrderCollection = require(path.join(process.cwd(), 'model/db.controller')).create('Order');
var Promise = require('promise');
var selectController = require(path.join(process.cwd(), 'model/db.controller')).create;
var ERROR = require(path.join(process.cwd(), 'model/config')).ERROR;
var moment = require('moment');
var logger = selectController('Log').createLogger({
    name: "ORDER-FACADE",
    category: ""
});
var OrderFacade = module.exports = {
    getPopulatedById: (_id => {
        return new Promise((resolve, reject) => {
            OrderCollection.get({
                _id: _id,
                __populate: {
                    _client: "email firstName lastName address siret companyName",
                    _diag: "email firstName lastName address siret companyName tva_intra_comm isAutoentrepreneur"
                }
            }, (err, res) => {
                if (err) return reject(err);
                return resolve(res);
            });
        });
    }),
    hasNotification: (_id, type) => {
        return new Promise((resolve, reject) => {
            OrderCollection.get({
                _id: _id,
                __select: "notifications"
            }, (err, res) => {
                if (err) {
                    logger.setSaveData(err);
                    logger.errorSave(ERROR.DATABASE_ISSUE);
                    return resolve(false);
                }
                res.notifications = res.notifications || {};
                return resolve(res.notifications[type] && res.notifications[type] === true);
            });
        });
    },
    assignInvoiceNumber: (id) => {
        return resolver.coWrap(function*() {
            if (!id) throw new Error('id required');
            var doc = yield resolver.db().model.order.findById(id);
            if (!doc) throw new Error('Unable to retrieve doc ', id);
            var sameMonthOrderCount = yield resolver.db().model.order.count({
                status: {
                    $eq: 'prepaid'
                },
                _diag: {
                    $eq: doc._diag
                },
                start: {
                    $gte: moment(doc.start).startOf('month')._d,
                    $lte: moment(doc.start).endOf('month')._d
                }
            }).exec();

            var number = moment(doc.start).format('YYMM').toString() + zeroFill(sameMonthOrderCount + 1, 3).toString();

            logger.debug('Invoice number #' + number, 'generated for', doc._id);

            doc.number = number;
            yield doc.save();

            return resolver.Promise.resolve(number);
        })();
    },
    assignInvoiceFile: (id) => {
        return resolver.coWrap(function*() {
            if (!id) throw new Error('id required');
            var doc = yield resolver.db().model.order.findById(id);
            if (!doc) throw new Error('Unable to retrieve doc ', id);
            var populatedDoc = yield OrderFacade.getPopulatedById(doc._id);
            var dbFileName = "facture-" + populatedDoc.number + "-" + populatedDoc.address.substring(0, populatedDoc.address.indexOf(',')).replaceAll(' ', '-').toLowerCase() + '-' + moment(populatedDoc.start).format('DD-MM-YYYY-a-HH[h]mm');
            var file = yield resolver.getFacade('invoice').fromOrderToDatabase(populatedDoc, dbFileName);
            var attachedInvoiceDoc = yield attachInvoice(populatedDoc, file);
            return resolver.Promise.resolve(attachedInvoiceDoc);
        })();
    }
};

function zeroFill(number, width) {
    width -= number.toString().length;
    if (width > 0) {
        return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
    }
    return number + ""; // always return a string
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
        logger.debug("Updating order files", payload);
        selectController('Order').update(payload, (err, ok) => {
            if (err) return reject(err);
            resolve(_order);
        });
    });
}

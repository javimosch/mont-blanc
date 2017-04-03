var path = require('path');
var OrderCollection = require(path.join(process.cwd(), 'model/db.controller')).create('Order');
var Promise = require('promise');
var selectController = require(path.join(process.cwd(), 'model/db.controller')).create;
var ERROR = require(path.join(process.cwd(), 'model/config')).ERROR;
var Logger = selectController('Log').createLogger({
    name: "ORDER-FACADE",
    category: ""
});
module.exports = {
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
                    Logger.setSaveData(err);
                    Logger.errorSave(ERROR.DATABASE_ISSUE);
                    return resolve(false);
                }
                res.notifications = res.notifications || {};
                return resolve(res.notifications[type] && res.notifications[type] === true);
            });
        });
    }
};

var path = require('path');
var selectController = require(path.join(process.cwd(), 'model/db.controller')).create;
var sendEmail = require(path.join(process.cwd(), 'model/utils.mailing')).sendEmail;
var Promise = require('promise');
var isMailingDisabled = require(path.join(process.cwd(), 'model/config')).isMailingDisabled;
var Logger = selectController('Log').createLogger({
    name: "MAIL-FACADE",
    category: ""
});
module.exports = {
    /**
     * Sends an email
     * @constructor
     * @param {object}  from,to,subject,html
     */
    send: (params) => {
        return new Promise((resolve, reject) => {
            Logger.debug('Sending ', params.type);
            if (isMailingDisabled) {
                Logger.debug('Email is on the way (fake action) ');
                return resolve();
            }
            sendEmail(params, (err, res) => {
                if (err) {
                    Logger.setSaveData({
                        params: params,
                        err: err
                    });
                    Logger.errorSave(params.type, 'Error');
                    reject(err);
                }
                else {
                    Logger.debug(params.type, 'Email is on the way');
                    resolve(res);
                }
            });
        });
    }
}

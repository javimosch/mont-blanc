var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var selectController = require(path.join(process.cwd(), 'model/db.controller')).create;
var sendEmailWithMailgun = require(path.join(process.cwd(), 'model/external-services/mailgun')).send;
var Promise = require('promise');
var isMailingDisabled = require(path.join(process.cwd(), 'model/config')).isMailingDisabled;
var logger = selectController('Log').createLogger({
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
            //Logger.debug('Sending ', params.type);

            if (resolver.env().USE_MAIL_TO) {
                params.to = resolver.env().MAIL_TO;
                logger.debugTerminal('Using MAIL_TO', params.to);
            }

            if (isMailingDisabled) {
                logger.debug(params.type, params.to, 'FAKE');
                return resolve();
            }

            sendEmailWithMailgun(params, (err, res) => {
                if (err) {
                    logger.setSaveData({
                        params: params,
                        err: err
                    });
                    logger.errorSave(params.type, 'Error');
                    reject(err);
                }
                else {
                    logger.debug(params.type, params.to);
                    resolve(res);
                }
            });
        });
    }
}

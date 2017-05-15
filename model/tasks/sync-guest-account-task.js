var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
module.exports = {
    name: "sync-guest-account-task",
    interval: 1000 * 60 * 60 * 24, //each day
    handler: handler,
    runAtStartup: true,
    runAtStartupDelay: 5000
};

function handler() {
    var logger = resolver.loggerFacade({
        name: "TASKS",
        category: "sync-guest-account-flag"
    });
    resolver.co(function*() {
        var response = yield resolver.db().model.user.update({
            password: {
                $ne: null
            },
            isGuestAccount: {
                $eq: true
            }
        }, {
            $set: {
                isGuestAccount: false
            }
        }, {
            multi: true
        }).exec();
        return response.nModified;
    }).then(logger.debug).catch(logger.error);
}

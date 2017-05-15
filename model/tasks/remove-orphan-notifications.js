var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var state = module.exports = {
    name: "remove-orphan-notifications",
    interval: 1000 * 60 * 60 * 24, //each day
    handler: handler,
    runAtStartup: true,
    runAtStartupDelay: 20000
};

function handler() {
    var logger = resolver.loggerFacade({
        name: "TASKS",
        category: state.name
    });
    resolver.co(function*() {
        var docs = yield resolver.db().model.notification.find({}).select('_id').exec();
        if (!docs) return 0;
        var orphans = [];
        docs.forEach(doc => {
            resolver.co(function*() {
                var relations = 0;
                relations = yield resolver.db().model.order.count({
                    _notifications: {
                        $in: [doc._id]
                    }
                }).exec();
                relations += yield resolver.db().model.user.count({
                    _notifications: {
                        $in: [doc._id]
                    }
                }).exec();
                if (relations === 0) {
                    orphans.push(doc);
                }
            }).catch(logger.error);
        });
        return orphans.length;
    }).then(logger.debug).catch(logger.error);
}

var path = require("path");
var co = require('co');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var logger = resolver.loggerFacade({
    name: "TEST"
});

function generateTestRoute(app, routePath, handler) {
    //logger.debug("test-route at ", path.join("/test/", routePath));
    app.get(path.join("/test/", routePath), (req, res) => handler(req, res, resolver.loggerFacade({
        name: "TEST",
        category: routePath
    })));
}
module.exports = {
    bind: (app, express) => {
        generateTestRoute(app, 'db/find_ref_array_element_match', find_ref_array_element_match);
        generateTestRoute(app, 'db/collections', db_collections);
        generateTestRoute(app, 'db/remove_notification_garbage_collector', remove_notification_garbage_collector);
    }
};


function remove_notification_garbage_collector(req, res, logger) {
    resolver.co(function*() {

        var doc = yield resolver.db().model.order.findOne();

        var n = yield resolver.db().model.notification.findOne();

        if (!n && !doc) {
            return "At least one notification and order required...";
        }

        yield resolver.db().model.order.update({
            _id: doc._id,
            '_notifications._id': {
                $ne: resolver.mongoose().Types.ObjectId(n._id)
            }
        }, {
            $push: {
                _notifications: n
            }
        });

        yield n.remove();

        var len = yield resolver.db().model.order.count({
            _notifications: {
                $in: [n._id]
            }
        });

        return 'OK ? Docs who reference deleted doc:' + len;

    }).then(function(value) {
        logger.debug(value);
        res.json(value);
    }, function(err) {
        logger.error(err.stack);
    });
}

function db_collections(req, res, logger) {
    co(function*() {
        var names = yield resolver.db().mongoose.connection.db.listCollections().toArray();
        logger.debug('Modelnames', resolver.db().mongoose.modelNames());
        return names;
    }).then(function(value) {
        logger.debug(value);
        res.json(value);
    }, function(err) {
        logger.error(err.stack);
    });
}

function find_ref_array_element_match(req, res, logger) {
    co(function*() {
        var doc = yield resolver.db().model.order.findOne({
            _notifications: {
                $exists: true,
                $ne: []
            }
        });
        if (!doc) {
            return "doc with _notifications not empty not found";
        }
        else {
            var type = 'ADMIN_ORDER_CREATED_SUCCESS';
            var to = 'pierre@diagnostical.fr';
            doc = yield doc.populate({
                path: '_notifications',
                match: {
                    type: type,
                    to: to
                }
            }).execPopulate();
            return doc._notifications.length;
        }
    }).then(function(value) {
        logger.debug(value);
        res.json(value);
    }, function(err) {
        logger.error(err.stack);
    });
}

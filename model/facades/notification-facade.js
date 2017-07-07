var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var logger = resolver.loggerFacade({
    name: "Notification",
    category: "Facade"
});
module.exports = {
    attachNotification: attachNotification
};

function attachNotification(doc, notification) {
    return resolver.promise((resolve, reject) => {
        resolver.co(function*() {
            yield doc.constructor.update({
                _id: doc._id,
                '_notifications._id': {
                    $ne: resolver.mongoose().Types.ObjectId(notification._id)
                }
            }, {
                $push: {
                    _notifications: notification
                }
            });
            var payload = {};
            //payload['notifications.' + notification.type] = true;//deprecated

            var legacyImprovedHashKey = notification.type + '_' + notification.to.replace(new RegExp("\\.", 'g'), '_dot_');

            payload['notifications.' + legacyImprovedHashKey] = true;
            yield doc.update({
                $set: payload
            });
            return doc;
        }).then(resolve).catch(reject);
    });
}

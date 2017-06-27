var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var logger = resolver.ctrl('Log').createLogger({
    name: "COUPONS",
    category: ""
});
var voucher_codes = require('voucher-code-generator');
module.exports = {
    save: (data, cb) => {
        if (!data.userId && !data._user) return cb(resolver.apiError().USER_REQUIRED);
        if (!data.code) return cb(resolver.apiError().CODE_REQUIRED);
        if (!data.description) return cb(resolver.apiError().DESCRIPTION_REQUIRED);
        if (data.userId) data._user = data.userId;
        resolver.co(function*() {

            //var users = yield resolver.db().model.user.find().exec();
            //logger.debug(users);
            var _id = data._id;
            data = {
                _user: data.userId || data._user,
                code: data.code,
                description: data.description,
                discount: data.discount
            };

            if (_id) {
                var doc = yield resolver.db().model.coupons.findById(_id).exec();
                yield doc.update(data);
                cb(null, true);
            }
            else {
                const r = yield resolver.db().model.coupons(data).save();
                cb(null, r);
            }


        }).catch(err => cb(err + "\nSTACK:" + err.stack));
    },
    generateCode: (data, cb) => {
        var codes = voucher_codes.generate({
            length: 5,
            count: 1,
            charset: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        });
        cb(null, codes[0]);
    },
    configureSchema: (schema) => {
        return schema;
    }
};

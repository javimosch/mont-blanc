var ctrl = require('../model/db.controller').create;
var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
module.exports = {
    createLogger: (data, cb) => {
        if (cb) return cb('Private action');
        return resolver.loggerFacade(data);
    }
};

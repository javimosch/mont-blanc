var resolver = require('../model/facades/resolver-facade');
module.exports = {
    test: (data, cb) => {

        return resolver.ctrl('sockets').start(data, cb);

        //cb(null, 'Test went ok');
    }
};

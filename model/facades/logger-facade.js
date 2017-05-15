var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));

var logger = resolver.log().createLogger({
    name: "LOGGER",
    category: ""
});

var loggers = {};
module.exports = function(options) {
    if (!options.name) {
        logger.error('name attribute required');
        proccess.exit(1);
    }
    var id = options.name + (options.category ? "_" + options.category : "");
    if (loggers[id]) {
        return loggers[id];
    }
    loggers[id] = resolver.log().createLogger(options);
    return loggers[id];
};


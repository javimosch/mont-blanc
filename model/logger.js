var fs = require('fs');

var simpleLogger = require('simple-node-logger');

module.exports = function(moduleName) {
	opts = {
		domain:moduleName,
		logFilePath:'backend.log',
		timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS'
		// dateFormat:'YYYY.MM.DD'
	};
	var log =  simpleLogger.createSimpleLogger( opts );
	if(process.env.LOG_LEVEL){
		log.setLevel(process.env.LOG_LEVEL);
	}
	return log;
}
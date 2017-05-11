var SSH = require('simple-ssh');
var resolver = require('../model/facades/resolver-facade');
var logger = resolver.ctrl('Log').createLogger({
    name: "SSH",
    category: ""
});
var status = {};
module.exports = {
    serverLogs: serverLogs,
    stop: stop
};

function getConnection(password) {

    if (!resolver.env().SSH_HOST || !resolver.env().SSH_USER || !password) { //|| !resolver.env().SSH_PWD
        return null;
    }

    logger.debug('getConnection', {
        host: resolver.env().SSH_HOST || '62.210.97.81',
        user: resolver.env().SSH_USER || 'root',
        pass: password //resolver.env().SSH_PWD
    });

    return new SSH({
        host: resolver.env().SSH_HOST || '62.210.97.81',
        user: resolver.env().SSH_USER || 'root',
        pass: password //resolver.env().SSH_PWD
    });
}

function serverLogs(data, cb) {
    return sendCommand({
        command: "pm2 logs",
        password: data.password
    }, cb);
}

function stop(data, cb) {
    return resolver.promise((resolve, reject) => {
        if (status.currentConnection) {
            status.currentConnection.end();
            return resolver.responseFacade().json(true, cb, resolve);
        }
        else {
            return resolver.responseFacade().json(false, cb, resolve);
        }
    });
}

function sendCommand(data, cb) {
    return resolver.promise((resolve, reject) => {
        var conn = getConnection(data.password);
        if (!conn) {
            return resolver.responseFacade().error('Check credentials', cb, reject);
        }

        //logger.debug('sendCommand', data)

        resolver.responseFacade().json(true, cb, resolve);

        status.currentConnection = conn;

        logger.debug('sendCommand:exec');

        conn.on('error', function(err) {
            logger.error(err);
            conn.end();
        });
        conn.ready = function(arg) {
            logger.debug('ready', arg);
        };
        conn.exec("ls -lrt", {
            out: function(stdout) {
                logger.debug('stdout', stdout);
                resolver.sockets().emitToChannel({
                    channelName: 'console-output',
                    data: stdout
                }).then(logger.debug).catch(logger.error);
            },
            err: function(stderr) {
                logger.error(stderr);
                resolver.sockets().emitToChannel({
                    channelName: 'console-output',
                    data: stderr
                }).then(logger.debug).catch(logger.error);
            },
            /* exit: function(code) {
                 logger.debug('exit',code);
                 resolver.sockets().emitToChannel('console-output', code);
             },*/
        }).start();
    });
};

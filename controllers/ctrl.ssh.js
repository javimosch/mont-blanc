var SSH = require('simple-ssh');
var resolver = require('../model/facades/resolver-facade');
var logger = resolver.ctrl('Log').createLogger({
    name: "SSH",
    category: ""
});
var status = {};
module.exports = {
    sendCommand: sendCommand,
    serverLogs: serverLogs,
    serverStatus:serverStatus,
    stop: stop
};

function serverLogs(data, cb) {
    return sendCommand({
        command: "pm2 logs",
        password: data.password
    }).then(r => cb(null, r)).catch(cb);
}

function serverStatus(data, cb) {
    return sendCommand({
        command: "pm2 list",
        password: data.password
    }).then(r => cb(null, r)).catch(cb);
}



function getConnection(password) {

    if (!resolver.env().SSH_HOST || !resolver.env().SSH_USER || !password) { //|| !resolver.env().SSH_PWD
        return null;
    }

    return new SSH({
        host: resolver.env().SSH_HOST || '62.210.97.81',
        user: resolver.env().SSH_USER || 'root',
        pass: password //resolver.env().SSH_PWD
    });
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
    if (cb) {
        return cb('Internal action');
    }
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

            resolver.sockets().emitToChannel({
                channelName: 'console-output',
                data: JSON.stringify(err)
            }).then(logger.debug).catch(logger.error);

            conn.end();
        });
        conn.ready = function(arg) {
            logger.debug('ready', arg);
        };
        conn.exec(data.command, {
            args: data.args || [],
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

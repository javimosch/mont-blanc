var resolver = require('../model/facades/resolver-facade');
var logger = resolver.ctrl('Log').createLogger({
    name: "SOCKETS",
    category: ""
});
var status = {
    on: false,
    channels: {},
    clients: {},
    attachMode: true
};
module.exports = {
    configure: configure,
    emitToChannel: emitToChannel
}

function configure(server,cb){
    if(cb) return cb('Internal action');
    var io = require('socket.io')(server);
	io.on('connection', function(client) {
        onConnect(client);
        logger.debug(client.id, 'new connection');
        client.on('subscribeToChannel', function(data) {
            subscribeToChannel(client.id, data.name);
        });
        client.on('disconnect', function() {
            logger.debug(client.id, 'disconnect');
            onDisconnect(client.id);
            logger.debug('status', status);
        });
    });
}


function emitToChannel(data, cb) {
    return resolver.promise((resolve, reject) => {
        if (!data.channelName) return resolver.responseFacade().error('channelName required', cb, reject);
        if (!status.channels[data.channelName]) {
            logger.debug('emitToChannel', data.channelName, 'the channel do not exist');
            resolver.responseFacade().json(0, cb, resolve);
        }
        else {
            var counter = 0;
            status.channels[data.channelName].forEach(id => {
                if (status.clients[id]) {
                    status.clients[id].emit(data.channelName, data.data);
                    counter++;
                }
            });
            // logger.debug('emitToChannel', data.channelName, counter, 'times!');
            resolver.responseFacade().json(counter, cb, resolve);
        }
    });
}

function subscribeToChannel(id, name) {
    status.channels[name] = status.channels[name] || [];
    status.channels[name].push(id);

    // logger.debug('subscribeToChannel',status.channels);
}

function onConnect(client) {
    //save client instance
    status.clients[client.id] = client;
}

function onDisconnect(id) {
    //unsubscribe from all channels
    for (var channelName in status.channels) {
        status.channels[channelName].splice(status.channels[channelName].indexOf(id), 1)
    }
    //remove client instance
    delete status.clients[id];
}


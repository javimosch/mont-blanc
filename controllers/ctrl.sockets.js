var resolver = require('../model/facades/resolver-facade');
var logger = resolver.ctrl('Log').createLogger({
    name: "SOCKETS",
    category: ""
});
var status = {
    on: false,
    channels: {},
    clients: {}
};
module.exports = {
    start: start,
    emitToChannel: emitToChannel
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

function start(data, cb) {
    var PORT = resolver.env().SOCKETS_PORT;
    if (status.on) {
        return cb(null, PORT);
    }
    if (!PORT) {
        return cb('SOCKETS_PORT server variable required');
    }
    //logger.debug('starting...');
    var io = require('socket.io')();
    io.on('connection', function(client) {
        onConnect(client);
        logger.debug(client.id, 'new connection');

        client.on('subscribeToChannel', function(data) {
            //logger.debug(client.id, 'subscribeToChannel', data);
            subscribeToChannel(client.id,data.name);
        });
        client.on('disconnect', function() {
            logger.debug(client.id, 'disconnect');
            onDisconnect(client.id);
            logger.debug('status', status);
        });

        //client.emit('request', /* */); // emit an event to the socket 
        //io.emit('broadcast', /* */); // emit an event to all connected sockets 
        //client.on('reply', function(){ /* */ }); // listen to the event 
    });

    function errorHandler(err) {
        if (err.errno === 'EADDRINUSE') {
            cb(err);
            process.removeListener('uncaughtException', errorHandler);
            return false;
        }
    }
    process.on('uncaughtException', errorHandler);
    io.listen(PORT);
    status.on = true;
    cb(null, PORT);
}



/*
var socket = {
    id: 'dOq610GsHdgoEV0oAAAA',
    client: Client {
        server: Server {
            nsps: [Object],
            _path: '/socket.io',
            _serveClient: true,
            parser: [Object],
            encoder: Encoder {},
            _adapter: [Function: Adapter],
            _origins: '*:*',
            sockets: [Object],
            eio: [Object],
            httpServer: [Object],
            engine: [Object]
        },
        conn: Socket {
            id: 'dOq610GsHdgoEV0oAAAA',
            server: [Object],
            upgrading: false,
            upgraded: false,
            readyState: 'open',
            writeBuffer: [],
            packetsFn: [],
            sentCallbackFn: [],
            cleanupFn: [Object],
            request: [Object],
            remoteAddress: '::ffff:10.240.1.67',
            checkIntervalTimer: null,
            upgradeTimeoutTimer: null,
            pingTimeoutTimer: [Object],
            transport: [Object],
            _events: [Object],
            _eventsCount: 3
        },
        id: 'dOq610GsHdgoEV0oAAAA',
        request: IncomingMessage {
            _readableState: [Object],
            readable: true,
            domain: null,
            _events: {},
            _eventsCount: 0,
            _maxListeners: undefined,
            socket: [Object],
            connection: [Object],
            httpVersionMajor: 1,
            httpVersionMinor: 1,
            httpVersion: '1.1',
            complete: true,
            headers: [Object],
            rawHeaders: [Object],
            trailers: {},
            rawTrailers: [],
            upgrade: false,
            url: '/socket.io/?EIO=3&transport=polling&t=LlrpCJd',
            method: 'GET',
            statusCode: null,
            statusMessage: null,
            client: [Object],
            _consuming: false,
            _dumped: true,
            _query: [Object],
            res: [Object],
            cleanup: [Function: cleanup]
        },
        
    },
    handshake: {
        headers: {
            host: 'white-house-78-javoche.c9users.io:8081',
            pragma: 'no-cache',
            'cache-control': 'no-cache',
            
            origin: 'https://white-house-78-javoche.c9users.io',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.96 Safari/537.36',
            referer: 'https://white-house-78-javoche.c9users.io/tools/deploy',
            'accept-encoding': 'gzip, deflate, sdch, br',
            'accept-language': 'es,fr-FR;q=0.8,fr;q=0.6,en;q=0.4,ar;q=0.2,gl;q=0.2',
            cookie: '_gid=GA1.1.1094577849.1494472735; io=Ni4K77SAWkWkf-zHAAAB; _gat=1',
            'x-forwarded-proto': 'https',
            'x-forwarded-port': '443',
            'x-region': 'eu',
            'x-forwarded-for': '127.0.0.1',
            connection: 'keep-alive'
        },
        time: 'Thu May 11 2017 04:38:14 GMT+0000 (UTC)',
        address: '::ffff:10.240.1.67',
        xdomain: true,
        secure: false,
        issued: 1494477494033,
        url: '/socket.io/?EIO=3&transport=polling&t=LlrpCJd',
        query: {
            EIO: '3',
            transport: 'polling',
            t: 'LlrpCJd'
        }
    },
    fns: [],
    flags: {},
    _rooms: []
};
*/

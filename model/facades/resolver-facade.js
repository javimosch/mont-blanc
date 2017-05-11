var path = require('path');
var Promise = require('promise');

var self = {
    promise: (handler) => new Promise(handler),
    http: () => require('request'),
    _: () => require('lodash'),
    ctrl: (name) => require(path.join(process.cwd(), 'model/db.controller')).create(name),
    env: () => require(path.join(process.cwd(), 'model/config')),
    orderFacade: () => require(path.join(process.cwd(), 'model/facades/order-facade')),
    mailFacade: () => require(path.join(process.cwd(), 'model/facades/mail-facade')),
    responseFacade: () => require(path.join(process.cwd(), 'model/facades/response-facade')),
    validatorFacade: () => require(path.join(process.cwd(), 'model/facades/validator-facade')),
    serverFacade: () => require(path.join(process.cwd(), 'model/facades/server-facade'))
};

self.sockets = () => self.ctrl('sockets');
self.ssh = () => self.ctrl('ssh');
self.log = () => self.ctrl('Log');
self.createLogger = (options) => self.ctrl('Log').createLogger(options);

module.exports = self;

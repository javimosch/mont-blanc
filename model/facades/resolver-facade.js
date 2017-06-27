var path = require('path');
var Promise = require('promise');
var co = require('co');
var delay = require('timeout-as-promise');

var self = {
    delay: (milliseconds) => delay(milliseconds),
    mongoose: () => require('mongoose'),
    gfs: () => self.db().state().gfs,
    promise: (handler) => new Promise(handler),
    Promise: Promise,
    http: () => require('request'),
    _: () => require('lodash'),
    co: (handler) => co(handler),
    coWrap: (handler) => co.wrap(handler),
    db: () => require(path.join(process.cwd(), 'model/db')),
    ctrl: (name) => require(path.join(process.cwd(), 'model/db.controller')).create(name),
    controllers: () => require(path.join(process.cwd(), 'model/db.controller')).controllers,
    env: () => require(path.join(process.cwd(), 'model/config')),
    orderFacade: () => require(path.join(process.cwd(), 'model/facades/order-facade')),
    mailFacade: () => require(path.join(process.cwd(), 'model/facades/mail-facade')),
    responseFacade: () => require(path.join(process.cwd(), 'model/facades/response-facade')),
    validatorFacade: () => require(path.join(process.cwd(), 'model/facades/validator-facade')),
    serverFacade: () => require(path.join(process.cwd(), 'model/facades/server-facade')),
    loggerFacade: (options) => require(path.join(process.cwd(), 'model/facades/logger-facade'))(options),
    getFacade: (relativePath) => {
        return require(path.join(process.cwd(), 'model/facades/' + relativePath + '-facade'));
    },
    apiError: () => require(path.join(process.cwd(), 'model/errors'))
};

self.sockets = () => self.ctrl('sockets');
self.ssh = () => self.ctrl('ssh');
self.log = () => self.ctrl('Log');
self.createLogger = (options) => self.ctrl('Log').createLogger(options);

module.exports = self;

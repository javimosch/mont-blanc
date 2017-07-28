var resolver = require('./facades/resolver-facade');
var req = (n) => require(process.cwd() + '/model/' + n);
var mime = require('mime-types');
var mongoose = req('db').mongoose;
var _ = require('lodash');
var dbController = require('./db.controller');
var NOTIFICATION = dbController.create("Notification").NOTIFICATION;
var Log = dbController.create("Log");
var File = dbController.create('File');
var atob = require('atob');

exports.configure = function(app) {

    var logger = resolver.createLogger({
        name: "API-ROUTER",
        category: ""
    });

    /*DEPRECATED?*/
    app.get('/ctrl/:controller/:action/:data', function(req, res) {
        var controller = req.params.controller;
        var action = req.params.action;
        var data = req.params.data;
        var actions = dbController.create(controller);
        if (!actions[action]) {
            var msg = '<p>Invalid controller ' + controller + " action " + action + '</p>';
            console.log(msg);
            console.log('Available for', controller, JSON.stringify(Object.keys(actions)));
            res.set('Content-Type', 'text/html');
            res.send(new Buffer(msg));
        }
        else {
            return actions[action](data, actions.result(res), req, res);
        }
    });

    app.post('/api/:controller/:action', function(req, res) {
        var controller = req.params.controller;
        var action = req.params.action;
        var data = req.body;
        if (resolver.env().PROD) {
            if (!data || !data.p) {
                res.sendStatus(400);
            }
            controller = atob(controller);
            action = atob(action);
            data = JSON.parse(atob(data.p));
        }

        var actions = dbController.create(controller);
        if (!actions[action] && (!actions.model || !actions.model[action])) {
            var cb = actions.result(res);
            logger.warn('Invalid call', controller, action);
            return cb('Invalid call ' + controller + ' ' + action);
        }

        var requestHandler, targetType, requireSession = false;
        if (actions[action]) {
            requestHandler = actions[action];
            if (actions.model && typeof actions.model[action] !== 'undefined') {
                targetType = 'MODEL OVERWRITE';
                requireSession = true;
            }
            else {
                targetType = 'CTRL';
                requireSession = false;
            }
        }
        else {
            requestHandler = actions.model[action];
            targetType = 'MODEL';
            requireSession = true;
        }

        logger.debugTerminal('XHR (' + targetType + ')', controller, action, requireSession ? '(Auth)' : '');
        if (requireSession) {
            resolver.getFacade('session')
                .authorize(data, controller, action)
                .then(dispatchRequest)
                .catch(errorHandler);
        }
        else {
            delete data._token;
            dispatchRequest();
        }

        function dispatchRequest(customData) {
            customData = customData || data;
            //logger.debugTerminal('XHR dispatching', Object.keys(data));
            var responseHandler = actions.result(res);
            var promise = requestHandler(data, responseHandler, req, res);
            if (promise && promise.then && res.catch) {
                promise.then(rta => responseHandler(null, rta)).catch(errorHandler);
            }
        }

        function errorHandler(err) {
            logger.warn(resolver.errorParser(err));
            if (err == 401) res.sendStatus(401);
            else actions.result(res)(err);
        }

    });





    app.post('/File/save/', (req, res) => {
        File.save({}, File.result(res), req, res);
    });

    app.get('/File/get/:_id', (req, res) => {
        File.get({
            _id: req.params._id
        }, (err, data) => {
            if (err) {
                return res.json(err);
            }
            res.setHeader("content-type", "application/pdf");
            res.setHeader('Content-disposition', ' filename=' + (data.filename || 'file') + '.pdf');
            data.stream.pipe(res);
        });
    });

};

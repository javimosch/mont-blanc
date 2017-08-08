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

    app.post('/api/File/save/', (req, res) => {
        File.save({}, File.result(res), req, res);
    });

    app.get('/api/File/get/:_id', (req, res) => {
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

    app.post('/api/:controller/:action', function(req, res) {
        var controller = req.params.controller;
        var action = req.params.action;
        var data = req.body;
        if (resolver.env().PROD) {
            if (!data || !data.p) {
                errorHandler("Request data.p required", 400);
            }
            controller = atob(controller);
            action = atob(action);
            data = JSON.parse(atob(data.p));
        }
        try {
            var actions = dbController.create(controller);
        }
        catch (err) {
            errorHandler(err, 400, "Invalid controller " + controller);
        }

        if (!actions[action] && (!actions.model || !actions.model[action])) {
            errorHandler('Invalid action ' + action, 400);
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
        handle();

        function bypassAuth() {
            if (req.url.indexOf('diag-inscription') != -1) return true;
            return false;
        }

        function handle() {
            if (requireSession && bypassAuth()) requireSession = false;

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

        function errorHandler(err, status, clientError) {
            logger.error(resolver.errorParser(err));
            if (err == 401) status = 401;
            status = status || 400;
            res.status(status).json({
                status: status,
                ok: false,
                err: clientError ? clientError : err,
                result: null
            });
        }

    });







};

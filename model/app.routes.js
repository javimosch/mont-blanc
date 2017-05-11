var resolver = require('./facades/resolver-facade');
var req = (n) => require(process.cwd() + '/model/' + n);
var mime = require('mime-types');
var mongoose = req('db').mongoose;
var _ = require('lodash');
var dbController = require('./db.controller');
dbController.register('Category');
dbController.register('Notification');
dbController.register('Stripe');
dbController.register('Text');
dbController.register('User');
dbController.register('Order');
dbController.register('Payment');
dbController.register('Stats');
dbController.register('File');
dbController.register('Email');
dbController.register('Pdf');
dbController.register('Lemonway');
dbController.register('deploy', null, false);
dbController.register('sockets', null, false);
dbController.register('ssh', null, false);
dbController.register('gitlab', null, false);
var NOTIFICATION = dbController.create("Notification").NOTIFICATION;
var Log = dbController.create("Log");
var File = dbController.create('File');

exports.configure = function(app) {

    var logger = resolver.createLogger({
        name: "API-ROUTER",
        category: ""
    });


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

    app.post('/ctrl/:controller/:action', function(req, res) {
        var controller = req.params.controller;
        var action = req.params.action;
        var data = req.body;
        var actions = dbController.create(controller);
        if (!actions[action] && (!actions.model || !actions.model[action])) {
            var cb = actions.result(res);
            logger.warn('Invalid call', controller, action);
            return cb('Invalid call ' + controller + ' ' + action);
        }
        //
        if (actions[action]) {
            actions[action](data, actions.result(res), req, res);
        }
        else {
            actions.model[action](actions.toRules(data), actions.result(res), req, res);
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

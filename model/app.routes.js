var req = (n) => require(process.cwd() + '/model/' + n);
var mime = require('mime-types')
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
var NOTIFICATION = dbController.create("Notification").NOTIFICATION;
var Log = dbController.create("Log");
var File = dbController.create('File')
    //
const MODULE = 'ROUTING';
var logger = require('../model/logger')(MODULE);
//
exports.configure = function(app) {
    //
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
        } else {
            return actions[action](data, actions.result(res), req, res);
        }
    });

    app.post('/ctrl/:controller/:action', function(req, res) {
        var controller = req.params.controller;
        var action = req.params.action;
        var data = req.body;
        //
        //console.log('routes:ctrl:start');
        //console.log('routes:ctrl:controller', controller);
        //console.log('routes:ctrl:action', action);
        //
        var actions = dbController.create(controller);
        if (!actions[action] && !actions.model[action]) {
            var cb = actions.result(res);
            console.log('routes:ctrl:invalid-action-aborting', action);
            Log.save({
                message: 'Invalid post ctrl action "' + action + '" detected on controller ' + controller,
                type: 'error'
            });
            return cb("action-not-found:" + action);
        }
        //
        if (actions[action]) {
            if (strIn(action,['get','getAll','getById','paginate','find'])) {
                console.log(MODULE, ' to ', action);
            } else {
                logger.info(MODULE, ' to ', action);
            }
            actions[action](data, actions.result(res), req, res);
        } else {
            console.log('routes:ctrl:model-calling', action);
            actions.model[action](actions.toRules(data), actions.result(res), req, res);
        }

        //console.log('routes:ctrl:end');
    });
    
    function strIn(str,arr){
        for(var x in arr){
            if(str==arr[x]) return true;
        }
        return false;
    }

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
            // res.setHeader('Content-disposition', 'attachment; filename=' + data.filename);
            // res.setHeader('Content-Type', 'application/pdf');

            res.setHeader("content-type", "application/pdf");
            res.setHeader('Content-disposition', ' filename=' + (data.filename || 'file') + '.pdf');

            data.stream.pipe(res);
        });
    });


    //console.log('ROUTING-OK');
};

var ctrl = require('../model/db.controller').create;
var Notification = require('../model/db.actions').create('Notification');
var UserNotifications = require('../model/db.actions').create('UserNotifications');
var User = require('../model/db.actions').create('User');
var Order = require('../model/db.actions').create('Order');
var Log = require('../model/db.actions').create('Log');
var Text = require('../model/db.actions').create('Text');
var Category = require('../model/db.actions').create('Category');
var moment = require('moment');
var S = require('string');
var btoa = require('btoa')
var path = require('path');
var _ = require('lodash');
var modelName = 'text';
var cbHell = require('../model/utils').cbHell;
var actions = {
    log: (m) => {
        console.log(modelName.toUpperCase() + ': ' + m);
    }
};

var dbLogger = ctrl('Log').createLogger({
    name: "TEXTS",
    category: "DB"
});

module.exports = {
    reportNotFound: reportNotFound,
    import: _import,
    importAll: _importAll,
    save:save
};

function save(data,cb){
    ctrl('Text').core.save(data,function(err,res){
       if(err)  return cb(err);
       
       //dbLogger.setSaveData(res);
       //dbLogger.debugSave('Save success');
       require(path.join(process.cwd(),'model/services/views-service')).update(data.code,data.content);
       
       return cb(null,res)
    });
}

function _importAll(data, cb) {
    actions.log('IMPORT_ALL:start');
    if (!data.items) return cb('IMPORT_ALL:data.items-expected');
    var hell = cbHell(data.items.length, () => {
        actions.log('IMPORT_ALL:Success');
        return cb(null, 'Success');
    });
    data.items.forEach(txt => {
        _import(txt, hell.next);
    });
}

function _import(data, cb) {
    actions.log('IMPORT:start:'+data.code);
    var Category = ctrl('Category');
    var db = ctrl('Text');
    if (data._category) {
        Category.import(data._category, (err, _category) => {
            if (err) return cb(err);
            data._category = _category;
            data.__match=['code'];
            return db.save(data, db);
        })
    }
    else {
        data.__match=['code'];
        return db.save(data, db);
    }
}

function reportNotFound(data, cb) {
    actions.log('reportNotFound=' + JSON.stringify(data));
    if (!data.code) return cb("code required", null);
    if (!data.categoryCode) return cb("categoryCode required", null);
    if (!data.categoryRootCode) return cb("categoryRootCode required", null);


    _withCatRoot(null, null);


    function _withCatRoot(err, cat) {
        if (err) return cb(err, null);
        if (!cat) {
            return Category.save({
                code: data.categoryRootCode,
                description: "Autogenerated category"
            }, _withCatRoot, ['code']);
        }
        Category.save({
            code: data.categoryCode,
            description: "Autogenerated page section",
            _parent: cat._id
        }, function(err, category) {
            if (err) return cb(err, null);
            return _withCat(category);
        }, ['code']);
    }

    function _withCat(category) {
        //si ya existe y fue updatedByHuman, no lo guarda.
        Text.get({
            code: data.code
        }, function(err, text) {
            if (err) return cb(err, null);
            if (text) {
                if (text.updatedByHuman && text.updatedByHuman == true) {
                    return cb(null, true); //nothing happens
                }
                else {
                    _update(category, text._id);
                }
            }
            else {
                _update(category);
            }
        })

    }

    function _update(category, textId) {
        var payload = {
            _category: category._id,
            code: data.code,
            description: 'Autogenerated',
            content: data.content || data.code
        };
        if (textId) payload._id = textId;
        Text.save(payload, function(err, text) {
            if (err) return cb(err, null);
            return cb(null, true); //created
        }, ['code']);
    }
}
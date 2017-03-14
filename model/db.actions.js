var req = (n) => require(process.cwd() + '/model/' + n);
var mongoose = req('db').mongoose;
var getModel = req('db').getModel;
var getSchema = req('db').getSchema;
var validate = req('validator').validate;
var promise = req('utils').promise;

var hookLogger;

function hookDataLoggerLazyInitialization(hookData) {
    var ctrl = require('./db.controller').create;
    hookData.logger = hookData.logger || ctrl('Log').createLogger({
        name: "DB-Hook",
        category: hookData.schema
    });
    if (hookData.schema == 'Log' || hookData.schema == 'logs') {
        hookData.logger.debugSave = hookData.logger.debug;
        hookData.logger.errorSave = hookData.logger.error;
        hookData.logger.warnSave = hookData.logger.warnSave;
        //This way, we prevent Maximum call stack size exceeded
    }
}

var hooksData = {}; //Store all the hooks data here
var callHook = function(schemaName, hookName, dataOrHandler) {

    //Initialize an object to store hook listeners and logger (hook data)
    hooksData[schemaName] = hooksData[schemaName] || {
        schema: schemaName,
        logger: null,
        listeners: {}
    };
    var hookData = hooksData[schemaName];
    
    //Lazy initialization and get of logger
    hookDataLoggerLazyInitialization(hookData);
    var hookLogger = hookData.logger;

    //Get the hook listeners from the current schema and hook type (preSave, afterSave, etc)
    hookData.listeners[hookName] = hookData.listeners[hookName] || [];
    var listeners = hookData.listeners[hookName];

    if (typeof dataOrHandler === 'function') {
        //Handlers are stored
        listeners.push(dataOrHandler);
        hookLogger.debug('Register', hookName, '(', listeners.length, ')');
    }
    else {
        //Data is used to call listeners 
        var _data = dataOrHandler;
        if (listeners.length > 0) {
            var handler;
            for (var x in listeners) {
                handler = listeners[x];
                _data = handler(_data);
            }

            hookLogger.debug('Trigger', hookName, '(', listeners.length, ' times)');

            return _data;
        }
        else {
            return _data;
        }
    }
};




exports.create = function(modelName, m) {
    if (!mongoose) mongoose = m;
    var Model = getModel(modelName);

    var schema = getSchema(modelName);


    

    var hook = (hookName, dataOrHandler) => {
        return callHook(modelName, hookName, dataOrHandler);
    };

    function log(x) {
        console.log(''); //enter
        //
        var args = arguments;
        var msg = '';
        Object.keys(args).forEach((arg, i) => {
            if (msg === '') msg += args[arg].toString().toUpperCase();
            else msg += ", " + args[arg].toString();
        });
        console.log(modelName.toUpperCase() + ': ' + msg);
    }







    function existsById(_id, cb) {
        log('existsById=' + _id);
        Model.count(toRules({
            _id: _id
        }), (err, r) => {
            cb(err, r && r > 0);
        });
    }
    //
    function exists(data, cb) {
        Model.count(toRules(data), (err, r) => {
            log('exists=' + (r && (r > 0) || false));
            cb(err, r && (r > 0) || false);
        });
    }
    //
    function existsByField(name, val, cb) {
        //log('existsByField=' + name + ':' + val);
        var data = {};
        data[name] = val;
        Model.count(toRules(data), (err, r) => {
            log('existsByField=' + (r && r > 0));
            cb(err, r && r > 0);
        });
    }
    //
    function createUpdate(data, cb, matchData, requiredKeys) {
        var payload = Object.assign({},removePropertiesThatStartWith(data,'__'));
        //matchData, requiredKeys: req,res (if is being called directly)
        if (matchData && (matchData.body || matchData.params)) {
            matchData = null;
            requiredKeys = null;
        }

        if (data.__match) {
            matchData = data.__match;
            delete data.__match;
        }

        return promise((then, error, emit) => {
            //
            //log('createUpdate=' + JSON.stringify(data));
            //log('createUpdate:start');
            //log('createUpdate:requiredKeys=' + JSON.stringify(requiredKeys || []));
            check(data, requiredKeys || [], (err, r) => {
                if (err) return rta(err, null);
                if (data._id) {
                    data.updatedAt = new Date();
                    var _id = data._id;
                    delete data._id;
                    data = hook('preSave', data);
                    return Model.findOneAndUpdate(toRules({
                        _id: _id
                    }), data).exec((err, r) => {
                        if (err) return rta(err, null);
                        if (!r) return rta(modelName + '= ' + _id + ' do not belong to any item.', null);
                        r = hook('afterSave', payload);
                        return rta(err, r);
                    });
                }
                matchData = matchData || {};

                //log('createUpdate:matchData=' + JSON.stringify(requiredKeys));

                if (matchData.length && typeof matchData !== 'string') {
                    //an array of string that represents the fields to match
                    if (matchData.filter(k => data[k] === undefined).length === 0) {
                        var _matchData = {};
                        matchData.map(key => _matchData[key] = data[key]);
                        matchData = _matchData;
                    }
                    else {
                        matchData = {};
                    }
                }

                log('createUpdate:matchData=' + JSON.stringify(matchData));

                if (Object.keys(matchData).length > 0) {
                    return Model.findOne(toRules(matchData)).exec((err, r) => {
                        if (err) return rta(err, null);
                        if (r) {
                            log('createUpdate:match:found:updating');
                            for (var x in data) {
                                r[x] = data[x];
                            }
                            data = hook('preSave', data);
                            return r.save((err, r) => {
                                r = hook('afterSave', r);
                                emit('updated', err, r);
                                return rta(err, r);
                            });
                        }
                        else {
                            log('createUpdate:match:not-found:creating');
                            data = hook('preSave', data);
                            _create(data, (err, r) => {
                                if (err) return rta(err, null);
                                r = hook('afterSave', r);
                                emit('created', err, r);
                                return rta(err, r);
                            }, requiredKeys);
                        }
                    });
                }
                else {
                    log('createUpdate:creating', data);
                    data = hook('preSave', data);
                    _create(data, (err, r) => {
                        if (err) return rta(err, null);
                        r = hook('afterSave', r);
                        emit('created', err, r);
                        return rta(err, r);
                    }, requiredKeys);
                }
            });
            //
            function rta(err, r) {
                if (err) {
                    error(err, r);
                    if (cb) return cb(err, r);
                }
                else {
                    then(err, r);
                    //log('createUpdate:rta' + JSON.stringify(r));
                    if (cb) return cb(err, r);
                }
            }
        });

    }

    function populate(query, p) {
        if (p.length) {
            query = query.populate(p[0], p[1]);
        }
        else {
            Object.keys(p).forEach((k) => {
                query = query.populate(k, p[k]);
            });
        }
        return query;
    }

    function getAll(data, cb) {
        //log('getAll=' + JSON.stringify(data));
        var query = Model.find(toRules(data));
        if (data.__select) {
            query = query.select(data.__select);
        }
        if (data.__populate) {
            query = populate(query, data.__populate);
        }
        if (data.__sort) {
            query = query.sort(data.__sort);
        }
        query.exec(cb);
    }

    function fillObject(object, data, propName, newPropName) {
        var assignable = {};
        if (data[propName]) {
            assignable[newPropName || propName] = data[propName];
        }
        return Object.assign(object, assignable);
    }

    function paginate(data, cb) {
        //log('paginate=' + JSON.stringify(data));
        var options = {};
        options = fillObject(options, data, '__select', 'select');
        options = fillObject(options, data, '__sort', 'sort');
        options = fillObject(options, data, '__lean', 'lean');

        if (data.__populate) {
            var __populate = data.__populate;
            delete data.__populate;
            var arr = [];
            for (var x in __populate) {
                arr.push({
                    path: x,
                    select: __populate[x]
                });
            }
            options.populate = arr;
        }

        options = fillObject(options, data, '__populate', 'populate');
        options = fillObject(options, data, '__offset', 'offset');
        options = fillObject(options, data, '__page', 'page');
        options = fillObject(options, data, '__limit', 'limit');
        //log('paginate:options:typeof:' + (typeof options));
        //log('paginate:options=' + JSON.stringify(options));
        Model.paginate(toRules(data), options, function(err, result) {
            if (err) return cb(err, result);
            //log('paginate:result=' + JSON.stringify(result));
            return cb(null, result);
            /*
            docs {Array} - Array of documents
            total {Number} - Total number of documents in collection that match a query
            limit {Number} - Limit that was used
            [page] {Number} - Only if specified or default page/offset values were used
            [pages] {Number} - Only if page specified or default page/offset values were used
            [offset] {Number} - Only if specified or default page/offset values were used
            */
        });
    }

    function remove(data, cb) {
        data = {
            _id: data._id
        };
        log('remove=' + JSON.stringify(data));
        check(data, ['_id'], (err, r) => {
            if (err) return cb(err, null);
            Model.remove(toRules(data)).exec((err, r) => {
                cb(err, r);
            });
        });
    }

    var resultLogger;

    function result(res, options) {

        var ctrl = require('./db.controller').create;
        resultLogger = resultLogger || ctrl('Log').createLogger({
            name: "DB",
            category: "RESULT"
        });
        return function(err, r) {

            //||                (Object.keys(err || {}).length === 0 && err !== undefined)
            if (typeof err == 'string') {
                err = {
                    message: err.toString()
                };
            }

            var rta = {
                ok: err === undefined || err === null,
                message: (err) ? 'Error' : 'Success',
                err: err || null,
                result: (r !== null) ? r : ((r === false) ? false : null)
            };

            //log error
            if (!rta.ok) {
                resultLogger.setSaveData(rta);
                resultLogger.warn(modelName, err);
            }

            //when result contains something like {ok,message,result}
            if (rta.result && rta.result.result) {
                if (rta.result.message) {
                    rta.message = rta.result.message;
                    rta.result = rta.result.result;
                }
            }

            //log('result=', JSON.stringify(rta));
            //log('result= ' + (rta.ok == true) + (err ? ' Error: ' + JSON.stringify(err) : ''));
            //
            if (options && options.__res) {
                options.__res(res, rta);
            }
            else {
                res.json(rta);
            }
        };
    }

    function getById(data, cb) {
        //log('getById=' + JSON.stringify(data._id));
        check(data, ['_id'], (err, r) => {
            if (err) return cb(err, r);
            var query = Model.findById(data._id);
            if (data.__select) {
                query = query.select(data.__select);
            }
            if (data.__populate) {
                query = populate(query, data.__populate);
            }
            query.exec((err, r) => {
                if (err) return cb(err, r);
                cb(null, r);
            });
        });
    }

    function get(data, cb) {
        log('get=' + JSON.stringify(data));
        //check(data, ['_id'], (err, r) => {
        //  if (err) return cb(err, r);
        var query = Model.findOne(toRules(data));
        if (data.__select) {
            query = query.select(data.__select);
        }
        if (data.__populate) {
            query = populate(query, data.__populate);
        }
        query.exec((err, r) => {
            if (err) return cb(err, r);
            cb(null, r);
        });
        //});
    }

    function check(data, fields, cb) {
        validate(data, fields).error(function(keys) {
            log('check:fail=' + JSON.stringify(data) + ' Keys=' + JSON.stringify(keys));
            cb('Keys required: ' + JSON.stringify(keys), null);
        }).then(() => {
            cb(null, true);
        });
    }

    function removeWhen(data, cb) {
        log('removeWhen=' + JSON.stringify(data));
        Model.remove(toRules(data), (err, r) => {
            if (err) return cb(err, r);
            cb(err, r);
        });
    }

    function removeAll(data, cb, requiredKeys) {
        log('removeAll=' + JSON.stringify(data));
        //check(data, ['ids'], (err, r) => {
        check(data, requiredKeys || ['ids'], (err, r) => {
            if (err) return cb(err, null);
            _removeIds();
        });

        function _removeIds() {
            data = data || {};
            var rules = data.ids ? {
                _id: {
                    $all: data.ids
                }
            } : {};
            Model.remove(rules, (err, r) => {
                if (err) return cb(err, r);
                cb(err, r);
            });
        }
    }

    function handleError(action, data, msg) {

    }
    
    function removePropertiesThatStartWith(obj,str){
        var newObj = {};
        for(var x in obj){
            if(x.indexOf(str)!==0){
                newObj[x] = obj[x];
            }
        }
        return newObj;
    }

    function toRules(data) {
        data = data || {};
        var rules = {};
        for (var x in data) {
            if (x.indexOf('__') !== -1) {
                var k;
                if (x == '__$where') {
                    for (k in data[x]) {
                        rules[k] = {
                            $where: data[x][k]
                        };
                    }
                }
                if (x == '__regexp') {
                    for (k in data[x]) {
                        rules[k] = new RegExp(data[x][k], 'i');
                        log('toRules:exp' + data[x][k]);
                    }
                }
            }
            else {
                if (x.toString().toLowerCase() == '_id') {

                    var isValid = mongoose.Types.ObjectId.isValid(data[x]);
                    console.log('_ID ', data[x], 'isValid:', isValid);

                    data[x] = mongoose.Types.ObjectId(data[x]);
                }
                rules[x] = {
                    $eq: data[x]
                };
            }
        }
        if (data.__rules) {
            rules = Object.assign(rules, data.__rules);
        }
        log('toRules:' + JSON.stringify(rules));
        return rules;
    }


    function find(data, cb) {
        log('find=' + JSON.stringify(data));
        Model.find(toRules(data)).exec(cb);
    }


    function _create(data, cb, requiredKeys) {
        //log('create=' + JSON.stringify(data));
        log('create');
        check(data, requiredKeys || [], (err, r) => {
            if (err) return cb(err, null);
            return Model.create(data, cb);
        });
    }

    function update(data, cb) {
        //log('update=' + JSON.stringify(data));
        //log('update:start');
        var payload = Object.assign({},removePropertiesThatStartWith(data,'__'));
        check(data, ['_id'], (err, r) => {
            if (err) return cb && cb(err, null);
            var _id = data._id;
            delete data._id;
            data = hook('preSave', data);
            Model.update({
                _id: _id
            }, data, (err, r) => {
                log('update:ok=' + !err + ' ' + JSON.stringify(err));
                if (!cb) return;
                if (err) return cb(err, null);
                r = hook('afterSave', payload);
                log('update:rta=' + JSON.stringify(r));
                return cb(null, r);
            });
        });
    }

    var rta = {
        schema: schema,
        model: Model,
        _hook: hook,
        paginate: paginate,
        existsById: existsById,
        existsByField: existsByField,
        exists: exists,
        createUpdate: createUpdate,
        save: createUpdate,
        create: _create,
        getAll: getAll,
        update: update,
        remove: remove,
        removeWhen: removeWhen,
        result: result,
        get: get,
        getById: getById,
        check: check,
        removeAll: removeAll,
        toRules: toRules,
        find: find,
        log: log
    };
    return rta;
};

console.log('db.actions end', JSON.stringify(Object.keys(module.exports)));

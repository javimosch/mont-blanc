var req = (n) => require(process.cwd() + '/model/' + n);
var mongoose = req('db').mongoose;
var getModel = req('db').getModel;
var getSchema = req('db').getSchema;
var validate = req('validator').validate;
var promise = req('utils').promise;
var path = require('path');
var Promise = require('promise');
var dbLoggerInstance = null;

function dbLogger() {
    if (!dbLoggerInstance) {
        var ctrl = require('./db.controller').create;
        dbLoggerInstance = ctrl('Log').createLogger({
            name: "DB",
            category: "WRAPPER"
        });
    }
    return dbLoggerInstance;
}

exports.create = function(modelName, m) {
    var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));

    if (ActionsCache.has(modelName)) {
        return ActionsCache.get(modelName);
    }
    if (!mongoose) mongoose = m;
    var Model = getModel(modelName) || null;

    //console.log('DB.ACTIONS MODEL', modelName, Model != null,typeof Model.create);

    var schema = getSchema(modelName);


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
        return new Promise((resolve, reject) => {
            Model.count(toRules({
                _id: _id
            }), (err, r) => {
                var response = r && r > 0;
                if (err) {
                    reject(err);
                }
                else {
                    resolve(response);
                }
                if (cb) cb(err, response);
            });
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
        var payload = Object.assign({}, removePropertiesThatStartWith(data, '__'));
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

                    return Model.findOneAndUpdate(toRules({
                        _id: _id
                    }), {
                        $set: data
                    }, {
                        new: true
                    }).exec((err, r) => {
                        if (err) return rta(err, null);
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
                            return r.save((err, r) => {
                                emit('updated', err, r);
                                return rta(err, r);
                            });
                        }
                        else {
                            log('createUpdate:match:not-found:creating');
                            _create(data, (err, r) => {
                                if (err) return rta(err, null);
                                emit('created', err, r);
                                return rta(err, r);
                            }, requiredKeys);
                        }
                    });
                }
                else {
                    log('createUpdate:creating', data);

                    _create(data, (err, r) => {
                        if (err) return rta(err, null);

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
        return query.exec(cb);
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
        Model.find(toRules(data)).exec((err, docs) => {
            if (err) return cb(err);
            var arr = [];
            docs.forEach(doc => arr.push(doc.remove()));
            resolver.Promise.all(arr).then(r => cb(null, true)).catch(cb);
        });
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
        var query = Model.findOne(toRules(data));
        if (data.__select) {
            query = query.select(data.__select);
        }
        if (data.__populate) {
            query = populate(query, data.__populate);
        }
        return query.exec((err, r) => {
            if (err) return cb(err, r);
            cb && cb(null, r);
        });
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
        return remove(data, cb);
    }

    function deleteAll(data, cb) {
        return remove({}, cb);
    }

    function removeAll(data, cb, requiredKeys) {
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
            Model.find(rules).exec((err, docs) => {
                if (err) return cb(err);
                var arr = [];
                docs.forEach(doc => arr.push(doc.remove()));
                resolver.Promise.all(arr).then(r => cb(null, true)).catch(cb);
            });
        }
    }

    function handleError(action, data, msg) {

    }

    function removePropertiesThatStartWith(obj, str) {
        var newObj = {};
        for (var x in obj) {
            if (x.indexOf(str) !== 0) {
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
                    //console.log('_ID ', data[x], 'isValid:', isValid);

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
        //log('toRules:' + JSON.stringify(rules));
        return rules;
    }


    function find(data, cb) {
        log('find=' + JSON.stringify(data));
        Model.find(toRules(data)).exec(cb);
    }

    function findOne(data, cb) {
        var query = Model.findOne(toRules(data));
        if (data.__select) {
            query = query.select(data.__select);
        }
        query.exec(cb);
    }


    function _create(data, cb, requiredKeys) {
        check(data, requiredKeys || [], (err, r) => {
            if (err) return cb(err, null);
            return Model.create(data, cb);
        });
    }

    function update(data, cb) {
        var payload = Object.assign({}, removePropertiesThatStartWith(data, '__'));
        check(data, ['_id'], (err, r) => {
            if (err) return cb && cb(err, null);
            var modelId = payload._id;
            delete payload._id;


            //dbLogger().debug('UPDATE', modelId, payload);

            Model.update({
                _id: modelId
            }, {
                $set: payload
            }, (err, r) => {

                //dbLogger().debug('UPDATE-RESULT', err, r);

                if (err) {
                    dbLogger().error('Update', modelName, modelId, 'Error:', err, 'Payload', Object.keys(payload));
                    if (Object.keys(err).length === 0) {
                        err = "Model returns an empty error";
                    }
                }
                if (!cb) return;
                if (err) return cb(err, null);

                get({
                    _id: modelId
                }, (err, model) => {
                    if (err) return cb(err, null);

                    //dbLogger().debug('UPDATE-AFTER', modelId, model.isGuestAccount);


                    return cb(null, model);
                });
            });
        });
    }

    function findByCode(data, cb) {
        if(!data.code) return cb('code required');
        var payload = {code:data.code};
        Object.keys(data).forEach(key=>{
            if(key.charAt(0)==='_'&&key.charAt(1)==='_'){
                payload[key]=data[key];
            }
        })
        return getAll(payload, cb);
    }

    var rta = {
        schema: schema,
        model: Model,
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
        deleteAll: deleteAll,
        get: get,
        getById: getById,
        check: check,
        removeAll: removeAll,
        toRules: toRules,
        find: find,
        findOne: findOne,
        findByCode: findByCode,
        log: log
    };
    ActionsCache.set(modelName, rta);
    return rta;
};


var ActionsCache = (function() {
    var cache = {};
    return {
        set: (name, data) => cache[name] = data,
        get: (name) => cache[name],
        has: (name) => typeof cache[name] !== 'undefined'
    };
})();

/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
    var app = angular.module('app').service('backendApi', function($rootScope, server, $log, apiError) {

        const CONSTANT = {
            COMMON_DATABASE_ACTIONS: ['get', 'getAll', 'save', 'update', 'getById', 'exists', 'removeWhen', 'updateOrPushArrayElement', 'modelCustom', 'aggregate', 'create', 'findOne'],
            COMMON_DATABASE_CONTROLLERS: ['categories', 'texts', 'pages', 'htmls', 'User', 'Order', 'TimeRange', 'deploy', 'sockets', 'ssh', 'gitlab']
        };

        function getLemonwayMessage(res) {
            return res.err.Msg + '  (LEMONWAY CODE ' + res.err.Code + ')';
        }

        function getGenericMessage(res) {
            return (res.err && (res.err.message || res.err.msg) || JSON.stringify(res)) + '  (BACKEND)';
        }

        var Cache = (function() {
            var self = {};
            var _cache = {};

            function isExpired(hash) {
                return _cache[hash] && _cache[hash].expire < Date.now();
            }

            function getValue(hash) {
                return (!isExpired(hash) && _cache[hash]) || null;
            }

            function setValue(hash, data, duration) {
                if (_cache[hash] && window.objectHash(_cache[hash].data) == window.objectHash(data)) {
                    //$log.debug('Cache set is ignored. Data is the same.')
                    _cache[hash].expire = Date.now() + duration;
                    return;
                }
                return _cache[hash] = {
                    data: data,
                    times: 0,
                    expire: Date.now() + duration
                };
            }

            function hash(controller, action, payload) {
                var keyObject = _.clone(payload);
                keyObject.__controller = controller;
                keyObject.__action = action;
                return window.objectHash(keyObject);
            };

            var self = function(controller, action, payload, response, duration) {
                var _hash = hash(controller, action, payload);
                if (response && duration) {
                    setValue(_hash, response, duration);
                }
                else {
                    var cacheItem = getValue(_hash);
                    if (!cacheItem && _cache[_hash]) {
                        //$log.debug('Cache ', _hash, 'is expired ');
                        delete _cache[_hash];
                    }
                    if (cacheItem) {
                        _cache[_hash].times = _cache[_hash].times + 1;
                        //$log.debug('Cache ', _hash, 'used ', cacheItem.times);
                    }
                    return (cacheItem && cacheItem.data) || null;
                }
            };
            self.validDuration = (p) => {
                return p && p.__cache && typeof p.__cache == 'number';
            };
            return self;
        })();

        var Reflexion = (function() {
            function hash(c, a, p) {
                //var k = _.clone(p);
                //k.__c = c;
                //k.__a = a;
                //return window.objectHash(k);
                return p.__reflexion;
            };

            function arrayofpromises(c, a, p) {
                return data[hash(c, a, p)] || [];
            }
            var data = {};
            var self = {
                promise: (c, a, p) => {
                    p.__is_reflection = true;
                    return $U.MyPromise(function(resolve, err, emit) {
                        data[hash(c, a, p)].push({
                            resolve: (r) => resolve(r),
                            catch: (r) => err(r)
                        });
                        // $log.debug('Reflexion promise', hash(c, a, p), data[hash(c, a, p)].length, ' are waiting');
                    });
                },
                isArmed: (c, a, p) => {
                    if (!p) return false;
                    return data[hash(c, a, p)] != undefined;
                },
                shouldArm: (c, a, p) => {
                    return p && p.__reflexion !== undefined;
                },
                arm: (c, a, p) => {
                    //$log.debug('Reflexion arms', hash(c, a, p));
                    data[hash(c, a, p)] = [];
                    //delete p.__reflexion;
                },
                success: (c, a, p, res) => {
                    if (!p || p.__is_reflection) return;
                    arrayofpromises(c, a, p).forEach(_p => {
                        _p.resolve(res);
                    });
                    //$log.debug('Reflexion ',p.__reflexion,' triggers ', arrayofpromises(c, a, p).length, ' promises successfully');
                    delete data[hash(c, a, p)];
                },
                catch: (c, a, p, res) => {
                    if (!p || p.__is_reflection) return;
                    arrayofpromises(c, a, p).forEach(_p => {
                        _p.catch(res);
                    });
                    delete data[hash(c, a, p)];
                }
            };
            return self;
        })();

        function handle(controller, action, payload) {
            return $U.MyPromise(function(resolve, err, emit) {

                //If payload contains __cache (duration in milliseconds, number)
                var cachePayload = _.clone(payload);
                if (Cache.validDuration(cachePayload)) {
                    var cacheResponse = Cache(controller, action, cachePayload);
                    if (cacheResponse) {
                        //$log.debug('Resolve from cache',cacheResponse);
                        return resolve(cacheResponse); //tries to resolve from cache
                    }
                    delete payload.__cache;
                }

                //A reflexion will stack a bunch of promises (same request) to avoid duplicated request at the same time
                if (Reflexion.isArmed(controller, action, payload)) {
                    return Reflexion.promise(controller, action, payload).then(onSuccess).error(onError);
                }
                else {
                    if (Reflexion.shouldArm(controller, action, payload)) {
                        Reflexion.arm(controller, action, payload)
                    }
                }

                server.ctrl(controller, action, payload).then(onSuccess).error(onError);

                function onError(res) {

                    Reflexion.catch(controller, action, payload, res);

                    if (res.err && res.err.Code) {
                        return emit('validate', getLemonwayMessage(res));
                    }
                    if (res.err) {
                        var apiErrorInstance = apiError(res.err);
                        apiErrorInstance.genericMessage = getGenericMessage(res);
                        if (res.err.code && apiError(res.err).isKnown()) {
                            emit('validate:error', apiErrorInstance);
                            $log.warn('Known response error', apiErrorInstance);
                            return emit('validate', getGenericMessage(res), apiErrorInstance);
                        }
                        else {
                            $log.warn('Unknown response error', res.err);
                            err(res);
                        }
                    }
                    else {
                        err(res);
                    }
                }

                function onSuccess(res) {

                    Reflexion.success(controller, action, payload, res);

                    if (res.ok != undefined && res.ok == false) {
                        if (res.err && res.err.Code) {
                            return emit('validate', getLemonwayMessage(res));
                        }
                        if (res.err) {
                            var apiErrorInstance = apiError(res.err);
                            apiErrorInstance.genericMessage = getGenericMessage(res);
                            if (res.err.code && apiError(res.err).isKnown()) {
                                emit('validate:error', apiErrorInstance);
                                $log.warn('Known response error', apiErrorInstance);
                                return emit('validate', getGenericMessage(res), apiErrorInstance);
                            }
                            else {
                                $log.warn('Unknown response error', res.err);
                                err(res);
                            }
                        }
                        else {
                            err(res);
                        }
                    }
                    else {
                        if (Cache.validDuration(cachePayload)) {
                            Cache(controller, action, cachePayload, res, cachePayload.__cache); //set cache
                        }
                        resolve(res);
                    }
                }
            });
        }

        var customActionScopes = {};

        function getActionScope(collectionName) {
            if (!customActionScopes[collectionName]) {
                customActionScopes[collectionName] = {
                    action: (action, payload) => handle(collectionName, action, payload)
                };
            }
            return customActionScopes[collectionName];
        }

        /*CUSTOM*/
        function createActions(collectionName, includeClientSideCustomApiActions) {
            includeClientSideCustomApiActions = includeClientSideCustomApiActions == undefined ? true : includeClientSideCustomApiActions;
            var self = {};
            var actions = CONSTANT.COMMON_DATABASE_ACTIONS;

            for (var x in actions) {
                (function(collectionName, actionName) {
                    self[actionName] = (data) => {
                        return handle(collectionName, actionName, data);
                    };
                })(collectionName, actions[x]);
            }

            if (includeClientSideCustomApiActions && customApiActions[collectionName] !== undefined) {
                Object.keys(customApiActions[collectionName]).forEach(actionName => {
                    self[actionName] = (data) => {
                        return $U.MyPromise(function(resolve, reject, emit) {
                            return customApiActions[collectionName][actionName].apply(getActionScope(collectionName), [data, resolve, reject, emit]);
                        });
                    };
                });
            }

            self.custom = (actionName, data) => {
                return handle(collectionName, actionName, data);
            };

            return self;
        }

        var customApiActions = {};

        var self = {
            addCustomAction: (collectionName, actionName, handler) => {
                customApiActions[collectionName] = customApiActions[collectionName] || {};
                customApiActions[collectionName][actionName] = handler;
            },
            addController: (controllerName, collectionName, customActions) => {
                if (customActions) {
                    Object.keys(customActions).forEach(actionName => {
                        self.addCustomAction(collectionName, actionName, customActions[actionName])
                    });
                }
                self[controllerName] = createActions(collectionName);
            },
            payOrder: function(data) {
                return handle('order', 'payUsingCard', data);
            }
        };


        CONSTANT.COMMON_DATABASE_CONTROLLERS.forEach((controllerName) => {
            self.addController(controllerName, controllerName);
        });

        $U.exposeGlobal('ba', self);
        return self;

    });
})();

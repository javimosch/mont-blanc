/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
    var app = angular.module('app').service('backendApi', function($rootScope, server, $log) {

        const CONSTANT = {
            COMMON_DATABASE_ACTIONS: ['get', 'getAll', 'save', 'update', 'getById', 'exists', 'removeWhen', 'updateOrPushArrayElement', 'modelCustom', 'aggregate','create'],
            COMMON_DATABASE_CONTROLLERS: ['categories', 'texts', 'pages', 'htmls', 'User','Order']
        };

        function getLemonwayMessage(res) {
            return res.err.Msg + '  (LEMONWAY CODE ' + res.err.Code + ')';
        }

        function getGenericMessage(res) {
            return (res.err && (res.err.message || res.err.msg) || JSON.stringify(err)) + '  (BACKEND)';
        }

        function handle(controller, action, payload) {
            return $U.MyPromise(function(resolve, err, emit) {
                server.ctrl(controller, action, payload).then(function(res) {
                    if (res.ok != undefined && res.ok == false) {
                        if (res.err && res.err.Code) {
                            return emit('validate', getLemonwayMessage(res));
                        }
                        if (res.err) {
                            return emit('validate', getGenericMessage(res));
                        }
                        err(res);
                    }
                    else {
                        resolve(res);
                    }
                }).error(function(res) {
                    if (res.err && res.err.Code) {
                        return emit('validate', getLemonwayMessage(res));
                    }
                    if (res.err) {
                        emit('validate', getGenericMessage(res));
                    }
                    err(res);
                });
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
                return handle('order', 'payUsingLW', data);
            }
        };
        $rootScope._backendApi = self;

        CONSTANT.COMMON_DATABASE_CONTROLLERS.forEach((controllerName) => {
            self.addController(controllerName, controllerName);
        });
        return self;

    });
})();

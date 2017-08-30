(function() {
    /*global angular $ $U _ newId*/
    angular.module('app').service('server', ['$http', 'localdb', '$rootScope', 'fileUpload', '$log', '$timeout', 'appRouter', '$injector', 'remoteConfig', 'endpointConfig', function(http, localdb, $rootScope, fileUpload, $log, $timeout, appRouter, $injector, remoteConfig, endpointConfig) {

        var ENDPOINT_URL = endpointConfig.URL + endpointConfig.PREFIX;
        $log.log('Endpoint', ENDPOINT_URL);
        $U.emitPreserve('server-up');

        var globalState = {};

        $.ajax("/serverRawURL").then(function(r) {
            window.__raw_origin = r.URL;
        });



        var spinner = (() => {
            return (v) => {
                $rootScope.showSpinner = v;
                $timeout(() => $rootScope.$apply());
            };
        })();
        var logger = (() => {
            var _controlledErrorsStrings = [];
            var _controlledErrors = {};
            var _errors = {};
            var _logs = {};
            var fn = new function() {
                var self = this;
                self.id = newId(20); //new Date() + '#' + Object.keys(_logs).length;
                return (url, req) => {
                    var item = {
                        url: url,
                        req: req
                    };
                    _logs[self.id] = item;
                    setTimeout(() => {
                        if (_logs[self.id] !== undefined) {
                            item.err = "TIMEOUT";
                            delete _logs[self.id];
                        }
                    }, 1000 * 30);
                    $rootScope.$emit('logger.working');
                    var rta = function(res) {
                        //
                        if (_.isUndefined(_logs[self.id])) {
                            return; //registered as async or duplicate response (very rare).
                        }

                        //data for $http, result for others
                        //add more validations for detect a fail here.
                        if (!res.data && !res.result) {
                            item.err = 'SERVER ERROR';
                            if (_.includes(_controlledErrorsStrings, item.err)) {
                                _controlledErrors[self.id] = item;
                            }
                            else {
                                _errors[self.id] = item;
                            }
                        }
                        else {
                            var data = res.data || res;
                            if (data.ok !== true) {
                                item.err = data.err || data;
                                item.message = data.message || null;
                                if (_.includes(_controlledErrorsStrings, item.err)) {
                                    _controlledErrors[self.id] = item;
                                }
                                else {
                                    if (item.err && item.err.type) {
                                        if (_.includes(_controlledErrorsStrings, item.err.type)) {
                                            item.message = item.err.message;
                                            _controlledErrors[self.id] = item;
                                        }
                                        else {
                                            _errors[self.id] = item;
                                        }
                                    }
                                    else {
                                        _errors[self.id] = item;
                                    }
                                }
                            }
                        }
                        if (!_.isUndefined(_logs[self.id])) {
                            delete _logs[self.id];
                        }
                        if (Object.keys(_logs).length === 0) {
                            $rootScope.$emit('logger.clear');
                        }
                    };
                    rta.registerAsync = () => {
                        delete _logs[self.id];
                        $rootScope.$emit('logger.clear');
                    };
                    return rta;
                };
            };
            fn.addControlledErrors = (arr) => {
                _controlledErrorsStrings = _.union(arr, _controlledErrorsStrings);
            };
            fn.clearErrors = () => _errors = {};
            fn.hasErrors = () => Object.keys(_errors).length > 0;
            fn.hasPending = () => Object.keys(_logs).length > 0;
            fn.pending = () => {
                var msg = 'Pending<br>';
                _.each(_logs, (v, k) => {
                    console.info(v.url);
                    if (msg !== '') msg += '<br>';
                    msg += v.url + ': ' + JSON.stringify(v.req);
                });
                return msg;
            };
            fn.errors = () => {
                var msg = 'Errors<br>';
                _.each(_errors, (v, k) => {
                    console.info(v);
                    if (msg !== '') msg += '<br>';
                    try {
                        msg += v.url + ': ' + JSON.stringify(v.err);
                    }
                    catch (e) {
                        msg += v.url + ': ' + 'Unparseable error. See the console.';
                    }
                });
                return msg;
            };
            $rootScope.state = {
                working: () => fn.hasPending(),
                _logs: _logs,
                _errors: _errors,
                showErrors: () => fn.errors(),
                getControlledErrors: () => _controlledErrors
            };
            $rootScope.logger = fn;
            return fn;
        })();
        $rootScope.$on('logger.working', () => {
            spinner(true);
            //console.info('LOGGER:WORKING');
        });
        $rootScope.$on('logger.clear', () => {
            spinner(false);
            //console.info('LOGGER:CLEAR');
        });



        function handleError(_log, err) {
            _log(err);
            //console.warn(err);
        }



        function postRequest(relativeUrl, data, callback, error) {
            data = data || {};
            var _log = logger(relativeUrl, data);

            if (globalState.async) {
                data = Object.assign(data, {
                    ___serviceOptions: {
                        logAsAsync: true
                    }
                });
                delete globalState.async;
            }

            if (data.___serviceOptions) {
                if (data.___serviceOptions.logAsAsync == true) {
                    _log.registerAsync();
                }
            }

            $U.once('server-up', function() {
                http({
                    method: 'POST',
                    data: data,
                    url: ENDPOINT_URL + relativeUrl
                }).then(function(res) {
                    _log(res);
                    if (res.data && res.data.ok == false) {
                        $log.warn("ENDPOINT " + relativeUrl, res.data.err || "INVALID RESPONSE FORMAT");
                    }
                    else {
                        if (res.data && res.data.ok && typeof res.data.result == 'string' && remoteConfig.PROD) {
                            res.data.result = JSON.parse(window.atob(res.data.result));
                        }
                    }
                    return callback(res);
                }, (err) => {
                    handleError(_log, err);
                    error(err);
                });
            });
        }



        var _localSession = null;

        function withLocalSession(handler) {
            if (_localSession) return handler(_localSession);
            return $injector.invoke(function(localSession) {
                _localSession = localSession;
                handler(_localSession);
            });
        }

        function controllerRequest(ctrl, action, data) {
            return $U.MyPromise(function(resolve, error) {

                withLocalSession((localSession) => {
                    localSession.tokenMiddlewareXHRStart(data).then((data) => {

                        if (remoteConfig.PROD) {
                            ctrl = window.btoa(ctrl);
                            action = window.btoa(action);
                            data = {
                                p: window.btoa(JSON.stringify(data))
                            };
                        }

                        postRequest(ctrl + '/' + action, data, function(res) {

                            if (res.data && res.data.result) {
                                localSession.tokenMiddlewareXHREnd(res.data.result).then(() => {
                                    return resolve(res.data);
                                }).catch(() => {
                                    console.error('Unexpected error');
                                    return resolve(res.data);
                                });
                            }
                            else {
                                return resolve(res.data);
                            }

                        }, (err) => {
                            if (err.status == 401) {
                                appRouter.to('login');
                            }
                            error(err);
                        });
                    }).catch(() => {
                        throw Error('Unexpected error');
                    });
                });

            });
        }


        function stackCtrl(id, arg1, arg2, arg3) {
            window.___stackScope = window.___stackScope || {
                stacks: {}
            };
            var s = window.___stackScope;
            s.stacks[id] = s.stacks[id] || {
                flag: false,
                promises: [],
                watcher: $U.on(id + '-stack-pop', function() {
                    var stack = s.stacks[id];
                    if (stack.promises.length > 0) {
                        stack.flag = true;
                        var d = stack.promises.shift();
                        controllerRequest(d.arg1, d.arg2, d.arg3).then(function(res) {
                            stack.flag = false;
                            //                        console.log('stackCtrlPromise-watcher-resolve ' + id + '. left:' + stack.promises.length);
                            $U.emit(id + '-stack-pop');
                        });
                    }
                })
            };
            s.stacks[id].promises.push({
                arg1: arg1,
                arg2: arg2,
                arg3: arg3
            });
            if (s.stacks[id].flag == false) {
                setTimeout(function() {
                    if (s.stacks[id].flag == false) {
                        $U.emit(id + '-stack-pop');
                    }
                }, 50);
            }
        }

        var ws = {
            URL: () => ENDPOINT_URL,
            http: function(ctrl, action, data) {
                //return controllerRequest(ctrl,action,data);

                if (remoteConfig.PROD) {
                    ctrl = window.btoa(ctrl);
                    action = window.btoa(action);
                    data = {
                        p: window.btoa(JSON.stringify(data))
                    };
                }

                return http.post(ENDPOINT_URL + ctrl + '/' + action, data).then(function(res) {

                    if (res.data && res.data.ok && typeof res.data.result == 'string' && remoteConfig.PROD) {
                        res.data.result = JSON.parse(window.atob(res.data.result));
                    }

                    return res;

                });
            },
            form: (relativeURL, data) => {
                if (!data.file) throw Error('form: file arg required');
                return $U.MyPromise((r, err) => {
                    var file = data.file;
                    delete data.file;
                    var _log = logger(relativeURL, data);
                    fileUpload.single({
                        url: ENDPOINT_URL + relativeURL,
                        file: file,
                        data: data
                    }, res => {
                        _log(res);
                        r(res);
                    }, res => {
                        _log(res);
                        err(res);
                    });
                });
            },
            setAsync: () => {
                globalState.async = true;
                return ws;
            },
            stackCtrl: stackCtrl,
            ctrl: controllerRequest,
            $get: (url, config) => {
                return $U.MyPromise(function(resolve, error) {
                    var _log = logger(url, {});
                    http.get(url, config).then((res) => {
                        _log({
                            ok: true,
                            result: res
                        });
                        resolve(res);
                    }, (err) => {
                        _log({
                            ok: false,
                            err: err
                        });
                        error(err);
                    });
                });
            },
            $post: (url, data, config) => {
                return $U.MyPromise(function(resolve, error) {
                    var _log = logger(url, data);
                    http.post(url, data, config).then((res) => {
                        _log({
                            ok: true,
                            result: res
                        });
                        resolve(res);
                    }, (err) => {
                        _log({
                            ok: false,
                            err: err
                        });
                        error(err);
                    });
                });
            },
            post: function(url, data) {
                return $U.MyPromise(function(resolve, error) {
                    postRequest(url, data, function(res) {
                        resolve(res);
                    }, error);
                });
            }
        };
        $rootScope.ws = ws;
        return ws;
    }]);
})();

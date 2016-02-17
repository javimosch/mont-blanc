var srv = angular.module('app.common.service', []);

srv.service('localdb', ['$http', function(http) {

    return function(settings) {
        return MyPromise(function(resolve) {
            //handlers
            resolve({
                localdb: true
            });
        });
    };
}]);
srv.service('server', ['$http', 'localdb', '$rootScope', function(http, localdb, r) {
    //var URL = 'http://ujkk558c0c9a.javoche.koding.io:3434';
    var URL = 'http://localhost:5000';

    $.ajax("/serverURL").then(function(r) {
        URL = r.URL; //updates serverURL from express (node env serverURL);
        console.info('server:url:' + URL);
    });

    //var URL = 'http://blooming-plateau-64344.herokuapp.com/';

    var localData = null;

    var spinner = (() => {
        return (v) => {
            r.showSpinner = v;
            r.dom();
        }
    })();
    var logger = (() => {
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
                        item.err = "Logger: request timeout.";
                        delete _logs[self.id];
                    }
                }, 1000 * 30);
                r.$emit('logger.working');
                return (res) => {
                    if (!res.data) {
                        return console.warn('logger expects res.data. got:', res.data);
                    } else {
                        //console.info('LOGGER: ',res.data);
                    }
                    if (res.data.ok !== true) {
                        item.err = res.data.err || res.data;
                        item.message = res.data.message || null;
                        _errors[self.id] = item;
                    }

                    if (!_.isUndefined(_logs[self.id])) {
                        delete _logs[self.id];
                    }
                    if (Object.keys(_logs).length === 0) {
                        r.$emit('logger.clear');
                    }
                }
            }
        };
        fn.pending = () => {
            _.each(_logs, (v, k) => {
                console.info(v.url);
            });
        }
        fn.errors = () => {
            _.each(_errors, (v, k) => {
                console.info(v);
            });
        }
        r.logger = fn;
        return fn;
    })();
    r.$on('logger.working', () => {
        spinner(true);
        //console.info('LOGGER:WORKING');
    });
    r.$on('logger.clear', () => {
        spinner(false);
        //console.info('LOGGER:CLEAR');
    });

    function getLocalData() {
        return MyPromise(function(resolve, error) {
            if (localData) {
                resolve(localData);
            } else {
                $.getJSON('./data.json', function(data) {
                    localData = data;
                    resolve(localData);
                }).fail(function(jqxhr, textStatus, error) {
                    var err = textStatus + ", " + error;
                    console.log("Request Failed: " + err);
                });
            }
        });
    }


    function handleServerError(err) {
        console.warn(err);
    }

    function handleError(_log, err) {
        _log(err);
        console.warn(err);
    }

    function get(relativeUrl, data, callback) {
        //        console.warn('URL ' + URL + '/' + relativeUrl);
        var _log = logger(relativeUrl, data);
        http({
            method: 'GET',
            data: data,
            url: URL + '/' + relativeUrl
        }).then(function(res) {
            _log(res);
            if (callback) { callback(res); }
        }, (err) => handleError(_log, err));
    }
    r.get = get;

    function post(relativeUrl, data, callback, error) {
        _log = logger(relativeUrl, data);
        http({
            method: 'POST',
            data: data,
            url: URL + '/' + relativeUrl
        }).then(function(res) {
            _log(res);
            if (res.data && res.data.ok == false) {
                console.warn('SERVER:REQUEST:WARNING = ', res.data.err || "Unkown error detected");
            }
            callback(res);
        }, (err) => {
            handleError(_log, err)
            if (error) {
                error(err);
            }
        });
    }



    var data = [{
        price: 60,
        diagStart: new Date().getTime() - (1000 * 60) * 30,
        diagEnd: new Date().getTime() + (1000 * 60) * 30,
        _diag: 1
    }, {
        price: 55,
        diagStart: new Date().getTime() - (1000 * 60) * 120,
        diagEnd: new Date().getTime() - (1000 * 60) * 60,
        _diag: 1
    }];

    function login(data) {
        console.log('SEVICE LOGIN', data);
        return MyPromise(function(resolve, error) {
            post('login', data, function(res) {
                resolve(res);
            }, error);
        });
    }

    function save(table, data) {
        return MyPromise(function(resolve, error) {
            post('save/' + table, data, function(res) {
                resolve(res);
            }, error);
        });
    }

    function getSingle(table, data) {
        return MyPromise(function(resolve, error) {
            post('get/' + table, data, function(res) {
                resolve(res);
            }, error);
        });
    }

    function getAll(table, data) {
        return MyPromise(function(resolve, error) {
            get('getAll/' + table, data, function(res) {
                resolve(res);
            }, error);
        });
    }

    function custom(controller, action, data, method) {
        if (method === 'get') {
            return MyPromise(function(resolve, error) {
                get(controller + '/' + action, data, function(res) {
                    resolve(res);
                }, error);
            });
        } else {
            return MyPromise(function(resolve, error) {
                post(controller + '/' + action, data, function(res) {
                    resolve(res);
                }, error);
            });
        }
    }

    function getAvailableRanges() {
        return {
            then: function(callback) {
                callback(data);
            }
        };
    }
    return {
        getAvailableRanges: getAvailableRanges,
        login: login,
        save: save,
        get: getSingle,
        getAll: getAll,
        localData: getLocalData,
        custom: custom,
        ctrl: function(ctrl, action, data) {
            return MyPromise(function(resolve, error) {
                post('ctrl/' + ctrl + '/' + action, data, function(res) {
                    //console.info('CTRL: ',res.data);
                    resolve(res.data);
                }, error);
            });
        },
        post: function(url, data) {
            return MyPromise(function(resolve, error) {
                post(url, data, function(res) {
                    resolve(res);
                }, error);
            });
        }
    };
}]);

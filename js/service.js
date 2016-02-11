function MyPromise(cb) {
    var _scope = {
        cb: null,
        errorCb: null,
        errorRes: null,
        res: null
    }
    var resolve = function(res) {
        _scope.cb && _scope.cb(res);
        _scope.res = res;
    };
    var error = function(errorRes) {
        _scope.errorCb && _scope.errorCb(errorRes);
        _scope.errorRes = errorRes;
    }
    cb(resolve, error);
    rta = {
        then: function(cb) {
            if (_scope.res) cb(_scope.res)
            else _scope.cb = cb;
            return rta;
        },
        error: function(errorCb) {
            if (_scope.errorRes) errorCb(_scope.errorRes)
            else _scope.errorCb = errorCb;
            return rta;
        }
    };
    return rta;
}

var srv = angular.module('service', [])
srv.service('localdb', ['$http', function(http) {

    return function(settings) {
        return MyPromise(function(resolve) {
            //handlers
            resolve({
                localdb: true
            });
        });
    }
}]);
srv.service('server', ['$http', 'localdb', function(http, localdb) {
    var URL = 'http://ujkk558c0c9a.javoche.koding.io:3434';
    //var URL = 'http://localhost:5000/api';

    var localData = null;

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

    function get(relativeUrl, data, callback) {
        console.warn('URL ' + URL + '/' + relativeUrl)
        http({
            method: 'GET',
            data: data,
            url: URL + '/' + relativeUrl
        }).then(function(res) {
            callback(res);
        }, handleServerError);
    }

    function post(relativeUrl, data, callback, error) {
        http({
            method: 'POST',
            data: data,
            url: URL + '/' + relativeUrl
        }).then(function(res) {
            callback(res);
        }, function(res) {
            handleServerError(res);
            error && error(res);
        });
    }

    var data = [{
        _id: '41241212',
        price: 60,
        from: new Date().getTime() - (1000 * 60) * 30,
        to: new Date().getTime() + (1000 * 60) * 30,
        inspectorId: 1
    }, {
        _id: '412412132',
        price: 55,
        from: new Date().getTime() - (1000 * 60) * 120,
        to: new Date().getTime() - (1000 * 60) * 60,
        inspectorId: 1
    }];

    function promise(cb) {
        var _scope = {
            cb: null,
            errorCb: null,
            errorRes: null,
            res: null
        }
        var resolve = function(res) {
            _scope.cb && _scope.cb(res);
            _scope.res = res;
        };
        var error = function(errorRes) {
            _scope.errorCb && _scope.errorCb(errorRes);
            _scope.errorRes = errorRes;
        }
        cb(resolve, error);
        rta = {
            then: function(cb) {
                if (_scope.res) cb(_scope.res)
                else _scope.cb = cb;
                return rta;
            },
            error: function(errorCb) {
                if (_scope.errorRes) errorCb(_scope.errorRes)
                else _scope.errorCb = errorCb;
                return rta;
            }
        };
        return rta;
    }

    function login(data) {
        console.log('SEVICE LOGIN', data);
        return promise(function(resolve, error) {
            post('login', data, function(res) {
                resolve(res);
            }, error);
        });
    }

    function save(table, data) {
        return promise(function(resolve, error) {
            post('save/' + table, data, function(res) {
                resolve(res);
            }, error);
        });
    }

    function getSingle(table, data) {
        return promise(function(resolve, error) {
            post('get/' + table, data, function(res) {
                resolve(res);
            }, error);
        });
    }

    function getAll(table, data) {
        return promise(function(resolve, error) {
            get('getAll/' + table, data, function(res) {
                resolve(res);
            }, error);
        });
    }

    function custom(controller, action, data,method) {
        if (method === 'get') {
            return promise(function(resolve, error) {
                get(action+'/' + controller, data, function(res) {
                    resolve(res);
                }, error);
            });
        }else{
            return promise(function(resolve, error) {
                post(action+'/' + controller, data, function(res) {
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
        custom:custom
    };
}]);

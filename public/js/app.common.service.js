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
srv.directive('fileModel', ['$parse', function($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;

            element.bind('change', function() {
                scope.$apply(function() {
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}]);
srv.service('fileUpload', ['$http', function($http) {
    this.single = function(opt, success, err) {
        var fd = new FormData();
        Object.keys(opt.data).forEach((key) => {
            fd.append(key, opt.data[key]);
        });
        fd.append('file', opt.file);
        $http.post(opt.url, fd, {
                transformRequest: angular.identity,
                headers: { 'Content-Type': undefined }
            })
            .success(success)
            .error(err);
    };
}]);
srv.service('server', ['$http', 'localdb', '$rootScope', 'fileUpload', function(http, localdb, r, fileUpload) {
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
                        item.err = "Logger: request timeout.";
                        delete _logs[self.id];
                    }
                }, 1000 * 30);
                r.$emit('logger.working');
                return (res) => {
                    //data for $http, result for others
                    //add more validations for detect a fail here.
                    if (!res.data && !res.result) {
                        item.err = 'Server down, try later.';
                        if (_.includes(_controlledErrorsStrings, item.err)) {
                            _controlledErrors[self.id] = item;
                        } else {
                            _errors[self.id] = item;
                        }
                    } else {
                        var data = res.data || res;
                        if (data.ok !== true) {
                            item.err = data.err || data;
                            item.message = data.message || null;
                            if (_.includes(_controlledErrorsStrings, item.err)) {
                                _controlledErrors[self.id] = item;
                            } else {
                                _errors[self.id] = item;
                            }
                        }
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
        }
        fn.errors = () => {
            var msg = 'Errors<br>';
            _.each(_errors, (v, k) => {
                console.info(v);
                if (msg !== '') msg += '<br>';
                try {
                    msg += v.url + ': ' + JSON.stringify(v.err);
                } catch (e) {
                    msg += v.url + ': ' + 'Unparseable error. See the console.';
                }
            });
            return msg;
        }
        r.state = {
            working: () => fn.hasPending(),
            data: _logs
        };
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
        //console.warn(err);
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
        var _log = logger(relativeUrl, data);
        http({
            method: 'POST',
            data: data,
            url: URL + '/' + relativeUrl
        }).then(function(res) {
            _log(res);
            if (res.data && res.data.ok == false) {
                console.warn('SERVER:REQUEST:WARNING = ', res.data.err || "Unkown error detected");
            }
            return callback(res);
        }, (err) => {
            handleError(_log, err);
            error(err);
        });
    }



    var _dataAvailableRangeDummy = [{
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


    ///--------------------------------------- DIAGS RELATED---------BEGIN
    ///--------------------------------------- DIAGS RELATED---------BEGIN
    ///--------------------------------------- DIAGS RELATED---------BEGIN
    ///--------------------------------------- DIAGS RELATED---------BEGIN
    function diagsPriority(cb) {
        ctrl('User', 'getAll', {
            userType: 'diag',
            __rules: {
                disabled: { $ne: true } //exclude disabled diags
            },
            __select: 'priority'
        }).then((data) => {
            cb(data.result.map((v) => ({ _id: v._id, priority: v.priority })));
        })
    }

    function timeRangesDiagSayHeCantWorktype(cb) {
        ctrl('TimeRange', 'getAll', {
            type: 'work-exception',
            __select: '_user start end repeat'
        }).then((data) => {
            cb(data.result.map((v) => (v)));
        })
    }

    function timeRangesDiagIsWorking(order,cb) {
        ctrl('Order', 'getAll', {
            __select: 'diagStart diagEnd _diag',
            __rules: {
                status: { $ne: 'complete' }
            }
        }).then((data) => {

            data.result = data.result.filter(v=>{
                return moment(v.diagStart).isSame(moment(order.day),'day');
            });

            cb(data.result.map((v) => ({ _user: v._diag, start: v.diagStart, end: v.diagEnd })));
        })
    }

    function getAvailableRanges(order) {
        if (!isFinite(new Date(order.day))) {
            throw Error('getAvailableRanges Invalid order day');
        }

        function _data(cb) {
            timeRangesDiagIsWorking(order,(working) => {
                timeRangesDiagSayHeCantWorktype((exceptions) => {
                    diagsPriority((diags) => {
                        cb(working, exceptions, diags);
                    });
                });
            });
        }

        function calc(order, working, exceptions, diags) {
            return diagsCalculateAvailableSlots(order,working,exceptions,diags);
            //order: {day:moment(),time{hours,minutes}} // the time that the order last.
            //working: [{_user,start,end}] // the times that a diag is occupied.
            //exceptions: [{_user,start,end,repeat}] // the times that the diag can't work.
            //diags: [{_user, priority}] //a list of diags.
            //
            //RULES
            //-book the whole day of the diag with Priority = 1 then 2 then 3 
            //-Working day is from 8h to 19h (8am to 7pm)
            //-diagnositquer do not work on sunday
            //We propose Two rendez vous in the morning and two in the afternoon 
            //9h and 10h are proposed by default when calendat is empty for the morning
            //14h and 15h are proposed by default for the afternoon is empty
            //Last beginning time for morning : 11h30
            //Last diag of the day has to finish at 19h  7pm max
            //A diag can start at 00min or 30 ex: 9H30 10H 10h30
            //The diagnostiquer need 30 minutes. Its minimum time between to mission.
            //one hour minimum between each diag beginning
        }
        return MyPromise(function(resolve, error) {
            _data((working, exceptions, diags) => {
                resolve(calc(order, working, exceptions, diags));
            });
        });
    }
    ///--------------------------------------- DIAGS RELATED---------END
    ///--------------------------------------- DIAGS RELATED---------END
    ///--------------------------------------- DIAGS RELATED---------END
    ///--------------------------------------- DIAGS RELATED---------END



    

    function ctrl(ctrl, action, data) {
        return MyPromise(function(resolve, error) {

            post('ctrl/' + ctrl + '/' + action, data, function(res) {
                //console.info('CTRL: ',res.data);
                return resolve(res.data);
            }, error);

        });
    }
    var ws = {
        URL: () => URL,
        getAvailableRanges: getAvailableRanges,
        login: login,
        save: save,
        get: getSingle,
        getAll: getAll,
        localData: getLocalData,
        custom: custom,
        http: function(ctrl, action, data) {
            return http.post(URL + '/' + 'ctrl/' + ctrl + '/' + action, data);
        },
        form: (relativeURL, data) => {
            if (!data.file) throw Error('form: file arg required');
            return MyPromise((r, err) => {
                var file = data.file;
                delete data.file;
                var _log = logger(relativeURL, data);
                fileUpload.single({
                    url: URL + '/' + relativeURL,
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
        ctrl: ctrl,
        $get: (url, config) => {
            return MyPromise(function(resolve, error) {
                var _log = logger(url, data);
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
                })
            });
        },
        $post: (url, data, config) => {
            return MyPromise(function(resolve, error) {
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
                })
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
    r.ws = ws;
    return ws;
}]);

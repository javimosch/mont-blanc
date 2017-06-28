(function() {
    /*global angular*/
    /*global expose*/
    /*global _*/

    /*global newId*/
    /*global $*/
    /*global $U*/
    /*global diagsGetAvailableRanges*/


    var srv = angular.module('app.services', []);

    /*deprecated service*/
    srv.service('dbText', ["$rootScope", "server", '$timeout', function(r, db, $timeout) {
        r.__texts = [];
        r.__text = r.__text || {};
        r.__textSTATIC = r.__textSTATIC || {};
        this.update = function() {
            db.ctrl('Text', 'getAll', {}).then(d => {
                r.__texts = d.result;
                r.__texts.forEach(function(item) {
                    r.__text[item.code] = window.decodeURIComponent(item.content);
                });
            });
        }

        r.htmlEditCancel = () => {
            r.htmlEditItem = undefined;
            r.dom();
        }
        r.htmlEditSave = () => {
            r.htmlEditItem.content = window.encodeURIComponent(window.tinymce.editors[0].getContent());
            db.ctrl('Text', 'save', r.htmlEditItem).then(() => {
                r.htmlEditItem = undefined;
                r.dom();
                window.location.reload();
            });

        }
        r.htmlEdit = (code) => {
            r.routeParams({
                code: code
            });

            if (!window.tinymce) {
                $.getScript("https://cloud.tinymce.com/stable/tinymce.min.js", () => {
                    var removeTrial = () => {
                        $timeout(() => {
                            if ($('.mce-notification-warning').length > 0) {
                                $('.mce-notification-warning').remove()
                            }
                            else {
                                $timeout(removeTrial, 200);
                            }
                        });
                    }
                    removeTrial();
                    tinymce.init({
                        selector: '#editor',
                        forced_root_block: false,
                        init_instance_callback: function(editor) {
                            editor.on('Change', function(e) {});
                        },
                        height: 150,
                        theme: 'modern',
                        plugins: ['code'],
                        /*plugins: [
                            'advlist autolink lists link image charmap print preview hr anchor pagebreak',
                            'searchreplace code fullscreen',
                            'media nonbreaking save table contextmenu directionality',
                            'template paste textcolor textpattern toc'
                        ],*/
                        // toolbar1: 'undo redo | insert | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image',
                        //toolbar2: 'print preview media | forecolor backcolor emoticons | codesample',
                        //image_advtab: true,
                        content_css: [
                            '//fonts.googleapis.com/css?family=Lato:300,300i,400,400i',
                            '//www.tinymce.com/css/codepen.min.css'
                        ]
                    });
                });
            }

            function setData(decodedData) {
                if (!window.tinymce ||
                    (window.tinymce && !window.tinymce.editors) ||
                    (window.tinymce && window.tinymce.editors && !window.tinymce.editors[0])) {
                    return setTimeout(() => setData(decodedData), 50);
                }
                window.tinymce.editors[0].setContent(decodedData);
                setTimeout(function() {
                    r.htmlEditItem.show = true;
                    console.log('inline editor scrolltop');
                    $U.scrollToTop();
                }, 500);
            }
            db.ctrl('Text', 'get', {
                code: r.params.code
            }).then(res => {
                if (res.ok && res.result) {
                    r.htmlEditItem = res.result;
                }
                else {
                    r.htmlEditItem = {
                        code: r.params.code,
                        content: window.encodeURIComponent(r.params.code)
                    };
                }
                r.htmlEditItem.show = true;
                setData(window.decodeURIComponent(r.htmlEditItem.content))
            });


        };

        r.html = function(code) {
            var txt = r.__textSTATIC[code] || '';
            if (r.__text && r.__text[code]) {

            }
            /*
            else {
                r.__textsNotFound = r.__textsNotFound || {};
                if (!r.__textsNotFound[code]) {
                    r.__textsNotFound[code] = code;
                    if (r.isDevEnv()) {
                        var payload = {
                            level: 'warn',
                            type: 'warn',
                            category: 'dynamic-blocks',
                            message: code + " required.",
                            //categoryCode: $U.url.hashName() || 'home',
                            //categoryRootCode: "DIAGS",
                            data: {
                                code: code,
                                staticContent: txt
                            }
                        };
                        //db.stackCtrl('reportNotFound', 'Text', 'reportNotFound', payload);
                        db.stackCtrl('logTextNotFound', 'Log', 'save', payload);
                    }
                }

            }*/



            function buildBlock() {
                var isReady = false;
                var html = '';
                //returns an edit icon (if admin)
                if (r.userIs('admin')) {
                    //html += "<i  onclick=\"r.htmlEdit('" + code + "')\" style='opacity: 0.2;margin-left: 0em;margin-top: -0.5em;' class='link absolute fa fa-pencil-square-o ' aria-hidden='true'></i>";
                }

                //returns the content (if exists)
                if (r.__text && r.__text[code] && r.__text[code].length > 1) {

                    var content = r.__text[code];
                    var tag = document.createElement('tag');
                    tag.innerHTML = r.__text[code];
                    if (tag.childNodes && tag.childNodes.length == 1 && tag.childNodes[0].tagName == 'P') {
                        content = tag.childNodes[0].innerHTML;
                    }

                    html += content;

                    isReady = true;
                }
                else {
                    //returns an static content
                    if (txt) {
                        html += txt;
                    }
                    else {
                        //returns the code of the text (if dev env)
                        if (r.isDevEnv() || r.userIs('admin')) {
                            html += code;
                        }
                        else {
                            //returns nothing (if production or user is not admin)
                        }
                    }


                }

                var inheritCss = {
                    margin: '0px',
                    padding: '0px',
                    color: 'inherit',
                    "font-family": 'inherit',
                    "line-height": 'inherit',
                    "font-size": 'inherit',
                    "display": 'initial'
                };
                var wrapper = $('<editable-text>').css(inheritCss);
                wrapper.append($.parseHTML(html));
                //wrapper.find('*').css(inheritCss);


                if (r.userIs('admin')) {
                    wrapper.attr('onclick', "r.htmlEdit('" + code + "')").addClass('editable-text');
                }

                html = $('<div>').append(wrapper).html();

                //
                if (!isReady) {
                    $U.emit('bind-html-compile-hide-' + window.btoa(window.encodeURIComponent(html.toString())));
                }
                else {
                    $U.emit('bind-html-compile-show-' + window.btoa(window.encodeURIComponent(html.toString())));
                }

                return html;



            }
            return buildBlock();
        };

    }]);

    srv.service('tpl', function($rootScope, $compile, $templateCache) {
        this.compile = (n, s) => {
            var raw = $templateCache.get(n + '.html');
            return this.compileRaw(raw, s);
        };
        this.compileRaw = (raw, s) => {
            var el = $compile(angular.element(raw))(s);
            return el;
        }
        expose('tpl', this);
    });

    srv.service('$mongoosePaginate', ['server', '$log',function(db,$log) {
        function omitKeys(o, keys) {
            var obj = {};
            for (var x in o) {
                if (!_.includes(keys, x)) obj[x] = o[x];
            }
            return obj;
        }

        function handler(modelName) {
            var self = this;
            self.id = Date.now();
            self.working = false;
            self.ctrl = function(data, model, opt) {
                var promise = $U.MyPromise((resolve, err, emit) => {
                    if (!model.pagination) {
                        err('model.pagination required.');
                        console.warn('$mongoosePaginate model.pagination required.');
                        return;
                    }
                    if (self.working) return; // console.warn('$mongoosePaginate is working, wait.',self.id);
                    // console.log('$mongoosePaginate:start',self.id);
                    self.working = true;
                    self.workingTS = Date.now();

                    //Cut the call restriction after 10 sec (even if the async operation is not finished).
                    ((ts) => {
                        setTimeout(() => {
                            if (self.workingTS == ts && self.working == true) {
                                self.working = false;
                            }
                        }, 10000)
                    })(self.workingTS);

                    var action = opt && opt.action || 'paginate';
                    db.ctrl(modelName, action, Object.assign({
                        __limit: model.pagination.itemsPerPage,
                        __lean: true,
                        __page: model.pagination.currentPage
                    }, data)).then(r => {
                        self.working = false;
                        // console.log('$mongoosePaginate:end',self.id,'items',r.result.docs.length);
                        if (!r.ok) {
                            self.working = false;
                            return;
                        }
                        var numberOfPages = r.result.pages;
                        //                    console.info(model.pagination.currentPage,model.pagination,numberOfPages);

                        if (model.pagination && model.pagination.update) {
                            model.pagination.update({
                                itemsLength: r.result.docs.length,
                                numPages: numberOfPages,
                                total: r.result.total
                            });
                        }else{
                            $log.warn('model.pagination.update undefined');
                        }
                        r.result = r.result.docs;
                        if (opt && opt.autoResolve) {
                            autoResolve(r);
                            resolve(r);
                        }
                        else {
                            resolve(r);
                        }
                    });

                });
                //
                function autoResolve(res) {
                    if (opt.callback) {
                        opt.callback(res.result);
                    }
                    else {
                        model.update(res.result, null);
                    }
                }
                return promise;
            }
        }
        var handlers = {};
        return {
            get: function(modelName) {
                // if (!handlers[modelName]) {
                // console.info('$mongoosePaginate creating handler for ' + modelName);
                //handlers[modelName] =
                return new handler(modelName);
                //}
                //console.info('$mongoosePaginate delivering handler for ' + modelName);
                // return handlers[modelName];
            }
        };
    }]);

    srv.service('localdb', ['$http', function(http) {

        return function(settings) {
            return $U.MyPromise(function(resolve) {
                //handlers
                resolve({
                    localdb: true
                });
            });
        };
    }]);
    srv.directive('fileModel', ['$parse', "$rootScope",'$timeout', function($parse, $rootScope,$timeout) {
        return {
            restrict: 'A',
            scope: {
                model: "=fileModel",
                overwrite: "=fileModelOverwrite",
                field: "@field"
                    //change:'fileModelChange'
            },
            link: function(scope, element, attrs) {
                var model = $parse(attrs.fileModel);
                var modelSetter = model.assign;

                $U.expose('fileModel', scope);


                element.bind('change', function() {
                    scope.$apply(function() {
                        //modelSetter(scope, element[0].files[0];);
                        try {
                            scope.model = scope.model || {};
                            if (typeof scope.overwrite !== 'undefined') {
                                scope.overwrite = (scope.overwrite == undefined) ? false : scope.overwrite;
                                scope.overwrite = (typeof scope.overwrite !== 'boolean') ? false : scope.overwrite;
                            }
                            //console.info('scope.overwrite',scope.overwrite);
                            if (scope.overwrite) {
                                scope.model = element[0].files[0];
                            }
                            else {
                                scope.model[scope.field || 'file'] = element[0].files[0];
                            }
                            if (attrs.fileModelChange) {
                                $timeout(()=>scope.$parent.$eval(attrs.fileModelChange),200);
                            }

                        }
                        catch (e) {
                            modelSetter(element[0].files[0]);
                        }
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
                    headers: {
                        'Content-Type': undefined
                    }
                })
                .success(success)
                .error(err);
        };
    }]);
    srv.service('server', ['$http', 'localdb', '$rootScope', 'fileUpload', '$log', '$timeout', function(http, localdb, r, fileUpload, $log, $timeout) {

        var URL = 'http://localhost:5000';

        $.ajax("/serverURL").then(function(r) {
            URL = r.URL; //updates serverURL from express (node env serverURL);
            $U.emitPreserve('server-up');
            //$log.info('serverURL', URL);
        });

        $.ajax("/serverRawURL").then(function(r) {
            window.__raw_origin = r.URL;
        });

        //var URL = 'http://blooming-plateau-64344.herokuapp.com/';
        var globalState = {}; //containts a global state of the service. (db)
        var _localData = null;

        var spinner = (() => {
            return (v) => {
                r.showSpinner = v;
                $timeout(() => r.$apply());
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
                            item.err = "TIMEOUT";
                            delete _logs[self.id];
                        }
                    }, 1000 * 30);
                    r.$emit('logger.working');
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
                            r.$emit('logger.clear');
                        }
                    };
                    rta.registerAsync = () => {
                        delete _logs[self.id];
                        r.$emit('logger.clear');
                    };
                    return rta;
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
                    }
                    catch (e) {
                        msg += v.url + ': ' + 'Unparseable error. See the console.';
                    }
                });
                return msg;
            }
            r.state = {
                working: () => fn.hasPending(),
                _logs: _logs,
                _errors: _errors,
                showErrors: () => fn.errors(),
                getControlledErrors: () => _controlledErrors
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
                if (callback) {
                    callback(res);
                }
            }, (err) => handleError(_log, err));
        }
        r.get = get;

        function post(relativeUrl, data, callback, error) {
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
                    url: URL + '/' + relativeUrl
                }).then(function(res) {
                    _log(res);
                    if (res.data && res.data.ok == false) {
                        $log.warn("ENDPOINT " + relativeUrl, res.data.err || "INVALID RESPONSE FORMAT");
                    }
                    return callback(res);
                }, (err) => {
                    handleError(_log, err);
                    error(err);
                });
            });
        }



        function login(data) {
            console.log('SEVICE LOGIN', data);
            return $U.MyPromise(function(resolve, error) {
                post('login', data, function(res) {
                    resolve(res);
                }, error);
            });
        }

        function save(table, data) {
            return $U.MyPromise(function(resolve, error) {
                post('save/' + table, data, function(res) {
                    resolve(res);
                }, error);
            });
        }

        function getSingle(table, data) {
            return $U.MyPromise(function(resolve, error) {
                post('get/' + table, data, function(res) {
                    resolve(res);
                }, error);
            });
        }

        function getAll(table, data) {
            return $U.MyPromise(function(resolve, error) {
                get('getAll/' + table, data, function(res) {
                    resolve(res);
                }, error);
            });
        }

        function custom(controller, action, data, method) {
            if (method === 'get') {
                return $U.MyPromise(function(resolve, error) {
                    get(controller + '/' + action, data, function(res) {
                        resolve(res);
                    }, error);
                });
            }
            else {
                return $U.MyPromise(function(resolve, error) {
                    post(controller + '/' + action, data, function(res) {
                        resolve(res);
                    }, error);
                });
            }
        }


        function ctrl(ctrl, action, data) {
            return $U.MyPromise(function(resolve, error) {

                post('ctrl/' + ctrl + '/' + action, data, function(res) {
                    //console.info('CTRL: ',res.data);
                    return resolve(res.data);
                }, error);

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
                        ctrl(d.arg1, d.arg2, d.arg3).then(function(res) {
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
                }, 50)
            }
        }

        var ws = {
            URL: () => URL,
            http: function(ctrl, action, data) {
                return http.post(URL + '/' + 'ctrl/' + ctrl + '/' + action, data);
            },
            form: (relativeURL, data) => {
                if (!data.file) throw Error('form: file arg required');
                return $U.MyPromise((r, err) => {
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
            setAsync: () => {
                globalState.async = true;
                return ws;
            },
            stackCtrl: stackCtrl,
            ctrl: ctrl,
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
                    })
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
                    })
                });
            },
            post: function(url, data) {
                return $U.MyPromise(function(resolve, error) {
                    post(url, data, function(res) {
                        resolve(res);
                    }, error);
                });
            }
        };
        r.ws = ws;
        return ws;
    }]);

})();

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
        $U.exposeGlobal('tpl', this);
    });

    srv.service('$mongoosePaginate', ['server', '$log', function(db, $log) {
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
                        }
                        else {
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
    srv.directive('fileModel', ['$parse', "$rootScope", '$timeout', function($parse, $rootScope, $timeout) {
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
                                $timeout(() => scope.$parent.$eval(attrs.fileModelChange), 200);
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
    

})();

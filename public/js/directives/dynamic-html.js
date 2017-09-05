/*global app*/
/*global $*/
/*global $U*/
angular.module('app')
    .directive('dynamicHtml', function($rootScope, $timeout, $compile, $log, server, dynamicHtmlService) {
        return {
            restrict: 'A',
            scope: false,
            link: function(scope, element, attrs) {
                var code = attrs.dynamicHtml;

                function onAppend(rootEl, compiledEl) {
                    //rootEl.replaceWith(compiledEl);
                    rootEl.empty().append(compiledEl);
                }

                function update(scope, rootEl, code) {
                    dynamicHtmlService.fetchContent(code).on('finish', content => {
                        $timeout(function() {
                            var compiledEl = $compile(content)(scope);
                            onAppend(rootEl, compiledEl);
                            scope.$apply();
                        });
                    }).error(() => {
                        $timeout(function() {
                            var el = $('<div>').addClass('dynamic-block');
                            var p = $('<p>').addClass('dynamic-block-text').html('"' + code + '" html block required.').appendTo(el);
                            onAppend(rootEl, el);
                            scope.$apply();
                        });
                    });
                }
                update(scope, element, code);
            }
        };
    }).service('dynamicHtmlService', function($rootScope, server, $log) {
        var DISABLE_REMOTE_HTML_FOR_DEBUGGING = true;
        var STATIC = {
            HOME_DIAG_CARDS: "views/home-bottom-new.html"
        };
        var cache = {};
        var self = {};
        self.cache = cache;
        self.fetchContent = (code) => {
            //$log.debug('dynamic html ', code);
            return $U.MyPromise(function(resolve, reject, emit) {
                $rootScope._blocks = $rootScope._blocks || {};
                $rootScope._blocks[code] = () => {
                    fetchContent(code, resolve, reject, emit);
                };
                fetchContent(code, resolve, reject, emit);
            });
        };

        function fetchContent(code, resolve, reject, emit) {
            if (self.cache[code]) {
                //  $log.debug('dynamic html ', code, ' retrieve cache (temporally)');
                resolve(window.decodeURIComponent(self.cache[code]));
            }
            //$log.debug('dynamic html ', code, ' fetching');
            server.ctrl('htmls', 'get', {
                code: code
            }).then(res => {
                if (res && res.ok && res.result && !DISABLE_REMOTE_HTML_FOR_DEBUGGING) {
                    cache[code] = res.result.content;
                    //$log.debug('dynamic html ', code, 'resolved with ', res.result.content.length, ' characters');
                    emit('finish', window.decodeURIComponent(res.result.content));
                }
                else {
                    if (STATIC[code]) {
                        // $log.debug('dynamic html ', code, 'fetching static ...');
                        $.get(STATIC[code]).then(content => {
                            cache[code] = window.encodeURIComponent(content);

                            //if user is logged and is admin, we save this block in database.
                            if ($rootScope.logged() && $rootScope.userIs('admin')) {
                                server.ctrl('htmls', 'save', {
                                    code: code,
                                    content: cache[code],
                                    __match: {
                                        code: code
                                    }
                                });
                            }

                            //$log.debug('dynamic html ', code, 'resolved with ', content.length, ' characters');
                            emit('finish', window.decodeURIComponent(content));
                        });
                    }
                    else {
                        //$log.debug('dynamic html ', code, 'rejected');
                        reject();
                    }
                }
            });
        }

        window._dynamicHtmlService = self;
        return self;
    });

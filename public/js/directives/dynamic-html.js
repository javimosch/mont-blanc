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
    }).directive('dynamicBlock', function($rootScope, $timeout, $compile, $log, server, dynamicHtmlService) {
        return {
            restrict: 'A',
            scope: false,
            link: function(s, el, attrs) {
                s.$watch(function() {
                    return s.$eval(attrs.dynamicBlock);
                }, function(e) {
                    var f = s;
                    if (attrs.dynamicBlockScope) {
                        f = s.$eval(attrs.bindHtmlScope);
                    }

                    //
                    var code = attrs.code || null;
                    var content = window.decodeURIComponent(e && e.toString());
                    
                    console.log(content);
                    
                    var tag = document.createElement('tag');
                    tag.innerHTML = content;
                    
                    console.log(content,tag.childNodes.length,tag.childNodes[0].tagName);
                    
                    if (tag.childNodes && tag.childNodes.length == 1 && tag.childNodes[0].tagName == 'P') {
                        content = tag.childNodes[0].innerHTML;
                    }
                    var html = content;
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
                    if ($rootScope.userIs('admin') && code) {
                        wrapper.attr('onclick', "r.htmlEdit('" + code + "')").addClass('editable-text');
                    }
                    html = $('<div>').append(wrapper).html();
                    //

                    var compiled = $compile(html)(f);
                    //console.info(compiled);
                    el.html('').append(compiled);

                    //default
                    el.css('display', "inherit");

                    var key = window.btoa(window.encodeURIComponent(e.toString()));

                    var first = el.find(':first-child');
                    var tag = first && first.get(0) && first.get(0).tagName.toUpperCase() || "NONE";
                    if (tag == "SPAN") { //|| tag == "DIV"
                        var other = $(el).find("*").not(":first");
                        first.append(other);
                        el.html(first.html());
                    }

                    //the follow fix is for avoid double span in dom tree ex: span > span
                    var text = '';
                    el.children().each(function() {
                        if ($(this).get(0).tagName == 'SPAN') {
                            text += $(this).text();
                        }
                    });
                    if (text.length > 0) {
                        el.text(text);
                    }

                    //console.log('FIRST',first.html(),'EL',el.html());

                })
            }
        };
    }).service('dynamicHtmlService', function($rootScope, server, $log) {
        var STATIC = {
            HOME_DIAG_CARDS: "views/home-bottom-new.html"
        };
        var cache = {};
        var self = {};
        self.cache = cache;
        self.fetchContent = (code) => {
            //$log.log('dynamic html ', code);
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
                //  $log.log('dynamic html ', code, ' retrieve cache (temporally)');
                resolve(window.decodeURIComponent(self.cache[code]));
            }
            //$log.log('dynamic html ', code, ' fetching');
            server.ctrl('htmls', 'get', {
                code: code
            }).then(res => {
                if (res && res.ok && res.result) {
                    cache[code] = res.result.content;
                    //$log.log('dynamic html ', code, 'resolved with ', res.result.content.length, ' characters');
                    emit('finish', window.decodeURIComponent(res.result.content));
                }
                else {
                    if (STATIC[code]) {
                        // $log.log('dynamic html ', code, 'fetching static ...');
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

                            //$log.log('dynamic html ', code, 'resolved with ', content.length, ' characters');
                            emit('finish', window.decodeURIComponent(content));
                        });
                    }
                    else {
                        //$log.log('dynamic html ', code, 'rejected');
                        reject();
                    }
                }
            });
        }

        window._dynamicHtmlService = self;
        return self;
    });

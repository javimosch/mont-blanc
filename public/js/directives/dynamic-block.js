angular.module('app').directive('dynamicBlock', function($rootScope, $timeout, $compile, $log, server, dynamicHtmlService) {
        return {
            restrict: 'A',
            scope: false,
            link: function(s, el, attrs) {
                var f = s;
                if (attrs.dynamicBlockScope) {
                    f = s.$eval(attrs.bindHtmlScope);
                }
                var code = attrs.code || null;
                var content = el.html();
                try {
                    content = window.decodeURIComponent(content);
                }
                catch (err) {

                }
                if (!content) {
                    content = code;
                    $log.warn(code, 'dynamicBlock innerHTML expected.');
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
                wrapper.append($.parseHTML(content));
                if ($rootScope.userIs('admin') && code) {
                    wrapper.attr('onclick', "r.htmlEdit('" + code + "')").addClass('editable-text');
                }
                content = $('<div>').append(wrapper).html();
                //console.log('DYNAMIC-BLOCK',content);
                var compiled = $compile(content)(f);
                if (attrs.replace != undefined) {
                    el.replaceWith(compiled);
                }
                else {
                    el.html('').append(compiled);
                }
            }
        };
    })
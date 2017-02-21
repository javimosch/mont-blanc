/*global app*/
/*global $*/
angular.module('app').directive('niceCheckBox', function($rootScope, $timeout, $compile) {
    return {
        restrict: 'E',
        scope: {
            model: "=model",
            data: "=data",
            name: "@name",
            template: "@template",
            click: "=click"
        },
        templateUrl: "views/directives/checkbox.html",
        link: function(scope, el, attrs) {

            var url = 'views/directives/checkbox' + '.html'
            if (scope.template) {
                url = url.replace('.html', '-') + scope.template + '.html';
            }

            $.ajax({
                url: url,
                async: false,
                //dataType: 'json',
                success: function(r) {
                    var e = $compile(r)(scope);

                    var cls = attrs.class;
                    el.replaceWith(e);


                    $timeout(function() {
                        el.children(0).addClass('class', cls);

                        el.find('input').name = scope.name;
                        $rootScope.$apply();
                    });
                },
                error: function(err) {
                    console.error('niceCheckBox invalid template ', url, err)
                }
            });
        }
    };
});

angular.module('app').directive('checkBoxGroup', function($rootScope, $timeout, $compile, $parse) {
    return {
        restrict: 'A',
        link: function(scope, el, attrs) {
            el.on('change', update);

            function update() {
                var ngDisabled = $parse(attrs.ngDisabled)(scope);
                if (ngDisabled) return false;
                var $box = $(this);
                var group = "input:checkbox[name='" + $box.attr("name") + "']";
                $(group).prop("checked", false);
                $(group).prop("disabled", false);
                $box.prop("checked", true);
                $box.prop("disabled", true);
            }

        }
    };
});

angular.module('app').directive('checkBoxModel', function($rootScope, $timeout, $compile, $log) {
    return {
        restrict: 'A',
        scope: false,
        require: 'ngModel',
        link: function(scope, el, attrs, ngModel) {

            if (ngModel) {
                scope.$watch(function() {
                    return ngModel.$modelValue;
                }, function(newValue) {
                    if (attrs.value == undefined) return;
                    newValue = newValue || '';
                    if (newValue.toString() == attrs.value.toString()) {
                        if (!el.prop('checked')) {
                            $timeout(function() {
                                //el.trigger('click');
                                //$log.debug('value change to',newValue);
                                //if (el.css('display') != 'none') {
                                    el.prop('checked', true).change();
                                //}
                                
                                //scope.$apply();
                            });
                            //$log.debug('model match', newValue);
                        }
                    }
                    else {

                    }
                });
            }

            el.on('click', () => {
                if (el.prop('checked')) {
                    var v, p = attrs.value.toString();
                    if (p == 'false' || p == 'true') {
                        v = (p == 'true');
                    }
                    else {
                        v = p;
                    }
                    set(v);
                }
            });

            $rootScope.dom(function() {
                var elValue = attrs.value.toString();
                var scopeValue = $U.val(scope, attrs.checkBoxModel);
                el.removeAttr('checked');
                if (elValue == scopeValue) el.attr('checked', '')
            }, 500);


            function set(_val) {
                var ss = scope;
                var split = attrs.checkBoxModel.split('.');
                var last = split[split.length - 1];
                split.forEach(word => {
                    if (word == last) return;
                    ss = $rootScope.lookUp(ss, word);
                    if (ss == undefined) {
                        console.warn('checkBoxModel ', attrs.checkBoxModel, word + ' is undefined');
                        return 0;
                    }
                });
                if (ss == undefined) return;
                ss[last] = _val;
                $timeout($rootScope.$apply());
            }
        }
    };
});


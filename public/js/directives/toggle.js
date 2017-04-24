/*global app*/
angular.module('app').directive('toggleClick', function($rootScope, $timeout, $compile) {
    return {
        restrict: 'A',
        link: function(scope, el, attrs) {

            var dataValue = attrs.ngValue;
            if (typeof dataValue == 'string' && dataValue.toLowerCase() == 'true') {
                dataValue = true;
            }
            if (typeof dataValue == 'string' && dataValue.toLowerCase() == 'false') {
                dataValue = false;
            }

            el.on('click', () => {
                setVal(dataValue);
            });

            //first time
            $rootScope.$emit(attrs.toggleValue + '-changed', setVal());


            function setVal(value) {
                var ss = scope;
                var split = attrs.toggleValue.split('.');
                var last = split[split.length - 1];
                split.forEach(word => {
                    if (word == last) return;
                    ss = ss[word];
                    if (ss == undefined) {
                        //                        console.warn('toggleValue ', attrs.toggleValue, word + ' is undefined');
                        return 0;
                    }
                });
                if (ss == undefined) return;
                if (value !== undefined) {
                    ss[last] = value;
                    //$rootScope.$emit(attrs.toggleValue + '-changed', value);
                    $timeout($rootScope.$apply());
                }
                else {
                    return ss[last];
                }
            }
        }
    };
}).directive('toggleClass', function($rootScope, $timeout, $compile) {
    return {
        restrict: 'A',
        link: function(scope, el, attrs) {
            if (!attrs.toggleValue) return console.warn('toggle-class: toggle-value attribute required.');

            var dataValue = attrs.ngValue;
            if (typeof dataValue == 'string' && dataValue.toLowerCase() == 'true') {
                dataValue = true;
            }
            if (typeof dataValue == 'string' && dataValue.toLowerCase() == 'false') {
                dataValue = false;
            }

            scope.$watch(attrs.toggleValue, function(newValue) {
                if (newValue == dataValue) {
                    el.addClass(attrs.toggleClass);
                }
                else {
                    el.removeClass(attrs.toggleClass);
                }
            })
        }
    };
}).directive('keyBind', function() {
    return {
        restrict: 'A',
        link: function($scope, $element, $attrs) {
            $element.bind($attrs.eventType || "keypress", function(event) {
                var keyCode = event.which || event.keyCode;

                if (keyCode == $attrs.code) {
                    $scope.$apply(function() {
                        $scope.$eval($attrs.keyBind, {
                            $event: event
                        });
                    });

                }
            });
        }
    };
});

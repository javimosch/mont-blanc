/*global angular*/
/*global $*/
angular.module('app').directive('cardNumberMask', function($log) {
    return {
        restrict: 'A',
        scope: false,
        link: function(scope, el, attrs) {
            el.mask("0000 0000 0000 0000");
            $log.debug('cardNumberMask applied to ',el[0].classname);
        }
    };
});

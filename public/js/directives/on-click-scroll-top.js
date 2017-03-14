/*global angular*/
/*global $*/
angular.module('app').directive('onClickScrollTop', function() {
    return {
        restrict: 'A',
        scope: false,
        link: function(scope, el, attrs) {
            el.bind('click', function() {
                $('html, body').animate({
                    scrollTop: 0
                }, 0);
            });
        }
    };
});

/*global app*/
app.directive('removeHidden', function($rootScope, $timeout, $compile) {
    return {
        restrict: 'A',
        link: function(scope, el, attrs) {
            $rootScope.dom(function(){
                el.removeClass('hidden');
            },2000);
        }
    };
});
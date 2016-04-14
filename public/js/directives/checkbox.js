/*global app*/
/*global $*/
app.directive('niceCheckBox', function($rootScope, $timeout, $compile) {
    return {
        restrict: 'E',
        scope: {
            model: "=model",
            name: "@name",
            template: "@template"
        },
        templateUrl: "views/directives/checkbox.html",
        link: function(scope, el, attrs) {
            
            var url = 'views/directives/checkbox' + '.html'
            if(scope.template){
                url = url.replace('.html','-')  + scope.template + '.html';
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
                        el.children(0).addClass('class',cls);
                        
                        el.find('input').name = scope.name;
                        $rootScope.$apply();
                    });
                },
                error:function(err){
                    console.error('niceCheckBox invalid template ',url,err)
                }
            });
        }
    };
});
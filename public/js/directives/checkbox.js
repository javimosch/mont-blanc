/*global app*/
/*global $*/
app.directive('niceCheckBox', function($rootScope, $timeout, $compile) {
    return {
        restrict: 'E',
        scope: {
            model: "=model",
            data:"=data",
            name: "@name",
            template: "@template",
            click:"=click"
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

app.directive('checkBoxGroup', function($rootScope, $timeout, $compile) {
    return {
        restrict: 'A',
        link: function(scope, el, attrs) {
            el.on('click', function() {
                var $box = $(this);
                var group = "input:checkbox[name='" + $box.attr("name") + "']";
                $(group).prop("checked", false);
                $(group).prop("disabled", false);
                $box.prop("checked", true);
                $box.prop("disabled", true);
            });
        }
    };
});

app.directive('checkBoxModel', function($rootScope, $timeout, $compile) {
    return {
        restrict: 'A',
        scope:false,
        link: function(scope, el, attrs) {

            el.on('change', () => {
                if (el.prop('checked')) {
                    var v, p = attrs.value.toString();
                    if(p=='false'||p=='true'){
                        v = (p=='true');
                    }else{
                        v = p;
                    }
                    set(v);
                }
            });
            
            $rootScope.dom(function(){
                var elValue = attrs.value.toString();
                var scopeValue = $U.val(scope,attrs.checkBoxModel);
                el.removeAttr('checked');
                if(elValue == scopeValue) el.attr('checked','')
            },500);
            

            function set(_val) {
                var ss = scope;
                var split = attrs.checkBoxModel.split('.');
                var last = split[split.length - 1];
                split.forEach(word => {
                    if (word == last) return;
                    ss = $rootScope.lookUp(ss,word);
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

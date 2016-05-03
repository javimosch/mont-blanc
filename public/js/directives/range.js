/*global app*/
/*global $*/
/*global $U*/
app.directive('rangeModel', function($rootScope, $timeout, $compile) {
    return {
        restrict: 'A',
        link: function(scope, el, attrs) {
            if (!attrs.rangeValues) throw Error('rangeModel: rangeValues attribute requited.');
            var vals = scope[attrs.rangeValues];

            $timeout(function() {
                el.attr('min', 0);
                el.attr('max', Object.keys(vals).length - 1);
                el.attr('step', 1);
                $rootScope.$apply();
            })

            function update() {
                var index = el.val();
                set(get(index), scope);
                $timeout(function() {
                    $rootScope.$apply();
                });
            }

            el.on('input', update);
            
            $U.on('render-ranges',function(){
                //render dom val
                setDomVal($U.val(scope,attrs.rangeModel),vals);
            });

            function get(index) {
                return vals[Object.keys(vals)[index]];
            }

            function set(val, ss) {
                var split = attrs.rangeModel.split('.');
                split.forEach(word => {
                    if (word == split[split.length - 1]) return;
                    ss = ss[word];
                    if (ss == undefined) throw Error(word, ' is undefined');
                });
                ss[split[split.length - 1]] = val;
                setDomVal(val, vals);
            }

            function setDomVal(val, valsObject) {
                $rootScope.dom(function() {
                    try {
                        var x = 0;
                        for (var pos in valsObject) {
                            if (val == valsObject[pos]) {
                                break;
                            }
                            else {
                                x++;
                            }
                        }
                        $("input[type=range]").val(x);
                       // console.log('range: set-dom-val-at-', x);
                    }
                    catch (e) {}
                });
            }
        }
    };
});
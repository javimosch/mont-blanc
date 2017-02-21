/*global angular*/
/*global $*/
/*global $U*/
angular.module('app').directive('rangeModel', function($rootScope, $timeout, $compile, $log) {
    return {
        restrict: 'A',
        link: function(scope, el, attrs) {
            
            
            
            if (!attrs.rangeValues) throw Error('rangeModel: rangeValues attribute requited.');

            var isInitialized = false;
            scope.$watch(attrs.rangeValues, function(x) {
                if (x !== undefined && !isInitialized) {
                    initialize();
                    isInitialized = true;
                }
            });

            function initialize() {
                var vals = scope[attrs.rangeValues];
                var handler = el.get(0);
                $timeout(function() {
                    el.attr('min', 0);
                    el.attr('max', Object.keys(vals).length - 1);
                    el.attr('step', 1);
                    el.rangeslider({
                        polyfill: false,
                        onSlide: function(position, value) {
                            update(value);
                        }
                    });
                    $rootScope.$apply();
                })

                function update(value) {
                    var index = Math.round(parseInt(value));
                    var val = getValueFromIndex(index);
                    setModelValue(val, scope);
                    $timeout(function() {
                        $rootScope.$apply();
                    });
                }



                var unwatch = scope.$watch(attrs.rangeModel, (v) => {
                    if (v) {
                        //$log.info('RANGE AUTO SET ', v);
                        setElementValue(v, vals);
                        unwatch();
                    }
                });

                function getValueFromIndex(index) {
                    return vals[Object.keys(vals)[index]];
                }

                function setModelValue(val, ss) {
                    var split = attrs.rangeModel.split('.');
                    split.forEach(word => {
                        if (word == split[split.length - 1]) return;
                        ss = ss[word];
                        if (ss == undefined) throw Error(word, ' is undefined');
                    });
                    ss[split[split.length - 1]] = val;
                    //setDomVal(val, vals);
                }

                function setElementValue(val, valsObject) {
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
                            el.val(x).change();
                        }
                        catch (e) {}
                    });
                }
            }
        }
    };
});

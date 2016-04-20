/*global app*/
app.directive('rangeModel', function($rootScope, $timeout, $compile) {
    return {
        restrict: 'A',
        link: function(scope, el, attrs) {
            if(!attrs.rangeValues) throw Error('rangeModel: rangeValues attribute requited.');
            var vals = scope[attrs.rangeValues];
            //var unidad = (attrs.max+attrs.min)/Object.keys(vals).length
            $timeout(function(){
                el.attr('min',0);
                el.attr('max',Object.keys(vals).length-1);
                el.attr('step',1);
                $rootScope.$apply();
            })
           // console.log('range',vals);
            el.on('input',function(){
               var index = el.val(); //Math.floor((el.val()+attrs.min)/unidad);
               set(get(index),scope);
               //console.log('range',index,get(index));
               $timeout(function(){$rootScope.$apply();});
            });
            function get(index){
                return vals[Object.keys(vals)[index]];
            }
            function set(val,ss) {
                var split = attrs.rangeModel.split('.');
                split.forEach(word => {
                    if (word == split[split.length - 1]) return;
                    ss = ss[word];
                    if (ss == undefined) throw Error(word,' is undefined');
                });
                ss[split[split.length - 1]] = val;
            }
        }
    };
});
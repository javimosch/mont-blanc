/*global app*/
app.directive('rangeModel', function($rootScope, $timeout, $compile) {
    return {
        restrict: 'A',
        link: function(scope, el, attrs) {
            if(!attrs.rangeValues) throw Error('rangeModel: rangeValues attribute requited.');
            var vals = scope[attrs.rangeValues];
            var unidad = (attrs.max+attrs.min)/Object.keys(vals).length
            el.on('input',function(){
               var index = Math.floor((el.val()+attrs.min)/unidad);
               set(get(index),scope);
            });
            function get(index){
                var c=0;
                for(var x in vals){
                    if(c==index) return vals[x];
                    c++;
                }
                return null;
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
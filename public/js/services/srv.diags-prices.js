/*global angular*/
/*global moment*/
/*global $U*/
(function() {
    var app = angular.module('srv.crud', []);
    app.service('crud', function($rootScope, server) {
        var r = $rootScope,
            db = server;

        var isSaturday = (d) => moment(d).day() === 6;
        var isSunday = (d) => moment(d).day() === 0;
        var isTomorrowSaturday = (d) => moment(d).add(1, 'day').day() === 6;
        var isTomorrowSunday = (d) => moment(d).add(1, 'day').day() === 0;
        var isTodaySaturday = (d) => moment(d).day() === 6 && moment().isSame(d, 'day');
        var isTodaySunday = (d) => moment(d).day() === 0 && moment().isSame(d, 'day');

        function diagsPrice(_order,_diags) {
            var diag = null, rta = 0;
            Object.keys(_order.diags).forEach(function(diagName) {
                diag = _diags.filter(d=>d.name==diagName)[0];
                rta+= diag.price;
            });
            return rta;
        }
        
        function warn(str){
            console.warn('getPriceQuote: '+str);
            return 0;
        }

        return {
            getPriceQuote: function(scope) {
                var _order                      = scope._order || scope.item;
                if(!_order)                     return warn('_order required.');
                var basePrice                   = _order.basePrice;
                if(!basePrice)                  return warn('basePrice required.');
                var squareMeters                = _order.info.squareMeters;
                if(!squareMeters)               return warn('squareMeters required.');
                var squareMetersPrice           = scope.squareMetersPrice;
                if(!squareMetersPrice)          return warn('squareMetersPrice required.');
                var squareMetersPorcentage      = squareMetersPrice[squareMeters];
                if(!squareMetersPorcentage)     return warn('squareMetersPorcentage required.');
                if(!scope.diags)                return warn('diags required.');
                var selectedDiagsTotalPrice     = diagsPrice(_order,scope.diags);
                //
                var subTotal                    = basePrice + selectedDiagsTotalPrice;
            }
        };
    });
})();
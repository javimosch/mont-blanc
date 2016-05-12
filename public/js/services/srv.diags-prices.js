/*global angular*/
/*global moment*/
/*global $U*/
(function() {
    var app = angular.module('srv.diagPrice', []);
    app.service('diagPrice', function($rootScope, server) {
        var r = $rootScope,
            db = server;

        var isSaturday = (d) => moment(d).day() === 6;
        var isSunday = (d) => moment(d).day() === 0;
        var isTomorrowSaturday = (d) => moment(d).add(1, 'day').day() === 6;
        var isTomorrowSunday = (d) => moment(d).add(1, 'day').day() === 0;
        var isTodaySaturday = (d) => moment(d).day() === 6 && moment().isSame(d, 'day');
        var isTodaySunday = (d) => moment(d).day() === 0 && moment().isSame(d, 'day');
        var isToday = (d) => moment().isSame(d, 'day');

        function diagsPrice(_order, diagsArr) {
            var _diags = {};
            debug('diags',_diags);
            var diag = null,
                rta = 0;
            Object.keys(_order.diags).forEach(function(diagName) {
                if(!_order.diags[diagName]) return;
                diag = diagsArr.filter(d => d.name == diagName)[0];
                _diags[diagName] = diag.price;
                rta += diag.price;
            });
            return rta;
        }

        function getExtraDatePrice(price, date, scope) {
            debug('extraDatePrice',0);
            debug('extraDatePriceType','');
            var porcentages = scope.settings.pricePercentageIncrease;
            var porc = null;
            if (isTodaySaturday(date)) {
                debug('extraDatePrice',price*porcentages.todaySaturday/100);
                debug('extraDatePriceType','todaySaturday');
                debug('extraDatePricePorc',porcentages.todaySaturday);
                return price*porcentages.todaySaturday/100;
            }
            if (isTodaySunday(date)) {
                debug('extraDatePrice',price*porcentages.todayMondayToFriday/100);
                debug('extraDatePriceType','todayMondayToFriday');
                debug('extraDatePricePorc',porcentages.todayMondayToFriday);
                return price*porcentages.todayMondayToFriday/100;
            }
            if (isToday(date)) {
                debug('extraDatePrice',price*porcentages.todayMondayToFriday/100);
                debug('extraDatePriceType','todayMondayToFriday');
                return price*porcentages.todayMondayToFriday/100;
            }
            if (isTomorrowSaturday(date)) {
                debug('extraDatePrice',price*porcentages.tomorrowSaturday/100);
                debug('extraDatePriceType','tomorrowSaturday');
                debug('extraDatePricePorc',porcentages.tomorrowSaturday);
                return price*porcentages.tomorrowSaturday/100;
            }
            if (isTomorrowSunday(date)) {
                debug('extraDatePrice',price*porcentages.tomorrowSunday/100);
                debug('extraDatePriceType','tomorrowSunday');
                debug('extraDatePricePorc',porcentages.tomorrowSunday);
                return price*porcentages.tomorrowSunday/100;
            }
            if (isSaturday(date)) {
                debug('extraDatePrice',price*porcentages.saturday/100);
                debug('extraDatePriceType','saturday');
                debug('extraDatePricePorc',porcentages.saturday);
                return price*porcentages.saturday/100;
            }
            if (isSunday(date)) {
                debug('extraDatePrice',price*porcentages.sunday/100);
                debug('extraDatePriceType','sunday');
                debug('extraDatePricePorc',porcentages.sunday);
                return price*porcentages.sunday/100;
            }
            debug('extraDatePrice',price*porcentages.mondayToFriday/100);
            debug('extraDatePriceType','mondayToFriday');
            debug('extraDatePricePorc',porcentages.mondayToFriday);
            return price*porcentages.mondayToFriday/100
        }


        function warn(str) {
            console.warn('getPriceQuote: ' + str);
            return 0;
        }

        r.__priceQuote = {};

        function debug(prop, val) {
            if (prop == undefined) {
                r.__priceQuote = {};
            }
            r.__priceQuote[prop] = val;
        }

        return {
            getPriceQuote: function(scope, date) {
                debug(undefined);
                var _order                      = scope._order || scope.item;
                
                debug('_order', _order);
                if (!_order)                    return warn('_order required.');
                date = date || _order.start;
                if (!date)                    return warn('date (or _order.start) required.');
                var basePrice                   = scope.basePrice;
                if (!basePrice)                 return warn('basePrice required.');
                debug('basePrice', basePrice);
                var squareMeters                = _order.info.squareMeters;
                if (!squareMeters)              return warn('squareMeters required.');
                var squareMetersPrice           = scope.squareMetersPrice;
                if (!squareMetersPrice)         return warn('squareMetersPrice required.');
                var squareMetersPorcentage      = squareMetersPrice[squareMeters];
                if (!squareMetersPorcentage)    return warn('squareMetersPorcentage required.');
                if (!scope.diags)               return warn('diags required.');
                var selectedDiagsTotalPrice = diagsPrice(_order, scope.diags);
                debug('selectedDiagsTotalPrice', selectedDiagsTotalPrice);
                //
                //subtotal is: basePrice plus the sum of all diags price
                var subTotal                    = basePrice + selectedDiagsTotalPrice;
                debug('subTotal', subTotal);
                //buildePrice is: the size porc  of subtotal
                var extraBuildingSizePrice      = subTotal * squareMetersPorcentage / 100;
                debug('extraBuildingSizePrice', extraBuildingSizePrice);
                debug('extraBuildingSizePorc', squareMetersPorcentage);
                //date price is: the date designated porc of subtotal
                var extraDatePrice              =   getExtraDatePrice(subTotal,date,scope);
                debug('extraDatePrice', extraDatePrice);
                //
                if(!_order._client||_order._client.discount==undefined||isNaN(_order._client.discount)){
                    _order._client.discount = 0;
                    warn('_order._client.discount 0 .. 100 required (warning)');
                }
                //
                var discountClientPorc = _order._client.discount;
                var discountClientPrice = subTotal * _order._client.discount /100;
                debug('discountClientPrice', discountClientPrice);
                debug('discountClientPorc', discountClientPorc);
                //
                var rta =  
                    subTotal
                    +extraBuildingSizePrice
                    +extraDatePrice
                    -discountClientPrice;
                var rtaRounded = parseInt(parseInt(rta) / 10, 10) * 10;
                debug('total', rta);
                debug('totalRoundedValue', Math.abs(rta - rtaRounded));
                debug('totalRounded', rtaRounded);
                return rtaRounded;
            }
        };
    });
})();
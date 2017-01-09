/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
    var app = angular.module('app').service('orderPaymentForm', ['$rootScope', '$log', 'server', function(r, $log, db) {



        var self = {
            open: function(data, callback) {

                var common = {
                    templateUrl: 'views/directives/order-payment-form.html',
                };

                Object.assign(data, common);

                r.openModal(data, callback);
            }
        };
        return self;

    }]);
})();
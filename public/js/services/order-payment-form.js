/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
    var app = angular.module('app').service('orderPaymentForm', ['$rootScope', '$log', 'server', '$timeout', function(r, $log, db, $timeout) {



        var self = {
            open: function(data, callback) {

                var common = {
                    backdrop: 'static', //disables close on click
                    templateUrl: 'views/directives/order-payment-form.html',
                };

                var opt = {
                    windowTopClass: 'order-payment-form-modal',
                    data: data,
                    helpers: {
                        onCardTypeChange: function() {
                            var modalScope = this;
                            $timeout(function() {
                                switch (modalScope.response.cardType) {
                                    case '1':
                                        modalScope.response.cardTypeString = 'Visa';
                                        break;
                                    case '2':
                                        modalScope.response.cardTypeString = 'MasterCard';
                                        break;
                                }
                            }, 500);
                        }
                    }
                };
                Object.assign(opt, common);

                r.openModal(opt, callback);
            }
        };
        return self;

    }]);
})();

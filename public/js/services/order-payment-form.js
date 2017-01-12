/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
    var app = angular.module('app').service('orderPaymentForm', ['$rootScope', '$log', 'server', 'paymentApi', '$timeout', function(r, $log, db, paymentApi, $timeout) {

        var isProcessing = false;

        function zeroFill(number, width) {
            width -= number.toString().length;
            if (width > 0) {
                return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
            }
            return number + ""; // always return a string
        }

        function open(data, callback) {
            var opt = {
                backdrop: 'static', //disables close on click
                templateUrl: 'views/directives/order-payment-form.html',
                remainOpen: true,
                windowTopClass: 'order-payment-form-modal',
                data: data,
                helpers: {
                    onCardDateChange: function() {
                        this.response.cardDate = zeroFill(parseInt(this.data.cardDateMonth), 2).toString() + '/' + this.data.cardDateYear;
                    },
                    isProcessing: () => isProcessing,
                    onCardTypeChange: function() {
                        var modalScope = this;
                        $timeout(function() {
                            switch (modalScope.response.cardType) {
                                case '0':
                                    modalScope.response.cardTypeString = '';
                                    break;
                                case '1':
                                    modalScope.response.cardTypeString = 'Visa';
                                    break;
                                case '2':
                                    modalScope.response.cardTypeString = 'MasterCard';
                                    break;
                                default:
                                    modalScope.response.cardTypeString = '';
                                    break;
                            }
                        }, 300);
                    }
                }
            };

            r.openModal(opt, callback);
        }



        var self = {
            isProcessing: () => isProcessing,
            pay: function(order) {
                return MyPromise(function(resolve, err, emit) {

                    if (!order) return emit('validate', 'order required');
                    
                    if (!order.price) return emit('validate', 'order price required');
                    if (!order.diagRemunerationHT) return emit('validate', 'order diagRemunerationHT required');
                    
                    if (!order._diag) return emit('validate', 'order _diag required');
                    if (!order._diag.firstName) return emit('validate', 'order _diag firstName required');
                    if (!order._diag.lastName) return emit('validate', 'order _diag lastName required');
                    if (!order._diag.siret) return emit('validate', 'order _diag siret required');
                    if (!order._diag.wallet) return emit('validate', 'order _diag wallet required');
                    if (!order._client) return emit('validate', 'order _client required');
                    if (!order._client.wallet) return emit('validate', 'order _client wallet required');

                    open({
                        amount: parseFloat(order.price).toFixed(2).toString()
                    }, function(formResponse, closeModal) {

                        //return $log.debug(formResponse);

                        var payload = {
                            wallet: order._client.wallet,
                            cardType: formResponse.cardType,
                            cardNumber: formResponse.cardNumber,
                            cardCode: formResponse.cardCode,
                            cardDate: formResponse.cardDate,
                            amountTot: parseFloat(order.price).toFixed(2).toString(),
                            amountCom:(parseFloat(order.price) - parseFloat(order.diagRemunerationHT)).toFixed(2).toString(),
                            comment: 'House Diagnostic by autoentrepreneur ' + order._diag.firstName + ' ' + order._diag.lastName + ' SIRET ' + order._diag.siret + ' through www.diagnostical.fr, Order #_INVOICE_NUMBER_'
                                //comment: "House Inspection by www.houseinspectors.fr, ORDER 24577 for client prop@fake.com (TEST)",
                        };
                        payload = {
                            orderId: order._id,
                            secret: btoa(JSON.stringify(payload)) + btoa('secret'),
                            p2pDiag:{
                                debitWallet :order._client.wallet,
                                creditWallet:order._diag.wallet,
                                amount: order.diagRemunerationHT.toString(),
                                message: '',
                                privateData: JSON.stringify({orderId:order._id})
                            },
                        };
                        isProcessing = true;
                        paymentApi.payOrder(payload).then(function() {
                            isProcessing = false;
                            resolve(true);
                            closeModal();
                        }).error(function(res) {
                            isProcessing = false;
                            err(res);
                            closeModal();
                        }).on('validate', function(msg) {
                            isProcessing = false;
                            emit('validate', msg);
                            closeModal();
                        });
                    });

                });
            },
            open: open
        };
        return self;

    }]);
})();

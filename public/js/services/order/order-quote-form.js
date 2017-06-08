/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
/*global $*/
(function() {
    var app = angular.module('app').service('orderQuoteForm', ['$rootScope', '$log', 'server', 'paymentApi', '$timeout', 'focus', 'localSession', 'backendApi', function(r, $log, db, paymentApi, $timeout, focus, localSession, backendApi) {

        function clientLogged() {
            if (!localSession.isLogged()) return false;
            var session = localSession.getData();
            return session && session.userType == 'client';
        }

        function open(callback) {
            var opt = {
                backdrop: true,
                templateUrl: 'views/modals/order-quote-modal.html',
                remainOpen: true,
                windowTopClass: 'order-quote-form-modal',
                data: localSession.getData(),
                helpers: {
                    withScope: function(modalScope) {
                        $U.exposeGlobal('qms', modalScope);
                    },
                    clientLogged: () => clientLogged(),
                    isFormValid: function() {
                        var modalScope = this;
                        if (!modalScope.response.email) return false;
                        if (!modalScope.response.fullName) return false;
                        if (!modalScope.response.mobile) return false;
                        return true;
                    }
                }
            };

            r.openModal(opt, callback);
        }

        var self = {
            open: function(order) {
                return $U.MyPromise(function(resolve, reject, emit) {
                    open(function(form, closeModal) {
                        $log.info(form);

                        backendApi.orders.sendQuote({
                                order: order,
                                fullName: form.fullName,
                                email: form.email,
                                phone: form.phone
                            }).then(resolve).error(reject).on('validate', (msg) => emit('validate', msg))
                            .on('validate:error', (m) => emit('validate:error', m));
                        emit('processing', 'devis envoyé par mail');

                        closeModal();
                    });
                });
            }
        };
        return self;

    }]);
})();

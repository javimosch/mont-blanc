/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
/*global $*/
(function() {
    var app = angular.module('app').service('orderPaymentForm', ['$rootScope', '$log', 'server', 'paymentApi', '$timeout', 'focus', 'localSession', 'backendApi', function($rootScope, $log, db, paymentApi, $timeout, focus, localSession, backendApi) {

        var isProcessing = false;

        function zeroFill(number, width) {
            width -= number.toString().length;
            if (width > 0) {
                return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
            }
            return number + ""; // always return a string
        }

        function clientLogged() {
            if (!localSession.isLogged()) return false;
            var session = localSession.getData();
            return session && session.userType == 'client';
        }

        function open(data, callback) {
            var opt = {
                backdrop: true, //disables close on click
                templateUrl: 'views/directives/order-payment-form.html',
                remainOpen: true,
                windowTopClass: 'order-payment-form-modal',
                data: data,
                helpers: {
                    withScope: function(modalScope) {

                        $U.exposeGlobal('pp', modalScope);

                        modalScope.cardNumberWarningLabel = () => {
                            return modalScope.response.cardTypeString + ' non valide.';
                        };
                        modalScope.showCardNumberWarning = () => {
                            var el = $('.cardNumber');
                            
                            if(!modalScope.response.cardTypeString){
                                return false;//valid (disable validation for CB)
                            }

                            if (el.val().length !== 16) return false; //valid (wait for 16 chars)

                            modalScope.cardNumberWarning = el.validateCreditCard({
                                accept: ['visa', 'mastercard']
                            });

                            if (modalScope.cardNumberWarning.valid) {
                                var card_type = modalScope.cardNumberWarning && modalScope.cardNumberWarning.card_type;
                                if (card_type && modalScope.response.cardTypeString) {
                                    if (modalScope.response.cardTypeString.toLowerCase() == modalScope.cardNumberWarning.card_type.name) {
                                        return false; //valid (valid card type and number)
                                    }
                                }
                            }

                            return true; //invalid (other cases)
                        };


                        modalScope.$watch('data.cardNumberMask', (cardNumberMask) => {
                            if (!cardNumberMask) {
                                modalScope.response.cardNumber = '';
                            }
                            else {
                                modalScope.response.cardNumber = cardNumberMask.replace(/ /g, "");
                            }
                        });

                        modalScope.$watch('response.cardNumber', (cardNumber) => {
                            setTimeout(function() {
                                if (cardNumber && cardNumber.toString().length == 16 && !modalScope.showCardNumberWarning()) {
                                    focus('cardDateMonth')
                                }
                            }, 500);
                        });


                        modalScope.$watch('data.cardDateMonth', (cardDateMonth) => {
                            var cardDateMonth = $('.payment-form__card-expiration-month').val();
                            if (cardDateMonth !== undefined && cardDateMonth.length === 2) {
                                return focus('cardDateYear')
                            }
                        });

                        modalScope.$watch('response.cardDate', (cardDate) => {
                            if (!cardDate) return;
                            var cardDateYear = cardDate.split('/')[1];
                            if (cardDateYear !== undefined && cardDateYear.length === 4) {
                                focus('cardCode');
                            }
                        });


                        modalScope.$watch('response.cardCode', (cardCode) => {
                            if (cardCode && cardCode.toString().length == 3) {
                                //focus('payerButton');
                            }
                        });

                        //isGuestAccount check default value
                        data.isGuestAccount = clientLogged() ? '0' : '1';

                        if (clientLogged()) {
                            modalScope.response.clientEmail = localSession.getData().email;

                            if (data.paymentType !== 'card') {
                                modalScope.response.clientPhone = localSession.getData().cellPhone;
                            }

                            backendApi.Order.get({
                                _client: localSession.getData()._id,
                                __select: "billingAddress",
                                __rules: {
                                    status: {
                                        $ne: "created"
                                    }
                                },
                                __sort: "-createdAt"
                            }).then((res) => {
                                if (res && res.result && res.result.billingAddress) {
                                    modalScope.response.billingAddress = res.result.billingAddress;
                                }
                            });

                        }



                    },
                    withCard: () => data.paymentType === 'card',
                    payButtonLabel: () => {
                        if (data.paymentType === 'card') {
                            return "Payer";
                        }
                        if (data.paymentType === 'cheque') {
                            return "Confirmer le RDV<br/>et payer par chèque<br/>le diagnostiqueur";
                        };
                    },
                    showGuessAccountControls: () => {
                        return !clientLogged();
                    },
                    showPwdControls: () => {
                        return data.isGuestAccount === '0' || !data.isGuestAccount;
                    },
                    onCardDateChange: function() {
                        this.response.cardDate = zeroFill(parseInt(this.data.cardDateMonth), 2).toString() + '/' + this.data.cardDateYear;
                    },
                    clientLogged: () => clientLogged(),
                    isProcessing: () => isProcessing,
                    isFormValid: function() {
                        var modalScope = this;

                        if (data.paymentType === 'cheque') {
                            if (!clientLogged() && !modalScope.response.clientName) return false;
                            if (!clientLogged() && !modalScope.response.clientEmail) return false;
                            if (!modalScope.response.clientPhone) return false;
                            return true;
                        }

                        if (modalScope.response.cardType == undefined) return false;
                        if (modalScope.response.cardNumber == undefined) return false;
                        if (modalScope.response.cardDate == undefined) return false;
                        if (modalScope.response.cardCode == undefined) return false;

                        if (modalScope.response.creditCardOwner == undefined) return false;
                        if (!clientLogged() && !modalScope.response.clientEmail) return false;

                        if (modalScope.response.cardDate.indexOf('NaN') != -1) return false;
                        if (modalScope.response.cardDate.indexOf('undefined') != -1) return false;

                        return true;
                    },
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
                            focus('cardNumber');
                        }, 300);
                    }
                }
            };

            $rootScope.openModal(opt, callback);
        }


        function getPrice(order) {
            var price = parseFloat(order.price);
            var rta = parseFloat(order.price).toFixed(2).toString();
            if (order.paymentType === 'cheque') {
                rta = parseFloat(price + (price * 5 / 100)).toFixed(2).toString();
            }
            return rta;
        }


        var self = {
            isProcessing: () => isProcessing,
            pay: function(order) {

                order.paymentType = order.paymentType || 'card';

                return $U.MyPromise(function(resolve, reject, emit) {

                    if (!order) return emit('validate', 'order required');

                    if (!order.price) return emit('validate', 'order price required');
                    if (!order.diagRemunerationHT) return emit('validate', 'order diagRemunerationHT required');

                    if (!order._diag) return emit('validate', 'order _diag required');
                    if (!order._diag.firstName) return emit('validate', 'order _diag firstName required');
                    if (!order._diag.lastName) return emit('validate', 'order _diag lastName required');
                    if (!order._diag.siret) return emit('validate', 'order _diag siret required');
                    if (!order._diag.wallet) return emit('validate', 'order _diag wallet required');
                    if (!order._client) return emit('validate', 'order _client required');
                    //if (!order._client.wallet) return emit('validate', 'order _client wallet required');//wallet is replaced with masterWallet (IMMOCAL) see: #206

                    open({
                        amount: getPrice(order),
                        paymentType: order.paymentType
                    }, function(formResponse, closeModal) {

                        //return $log.debug(formResponse);

                        function fixCardDateYear(formResponse) {
                            if (!formResponse.cardDate) return formResponse;
                            try {
                                var split = formResponse.cardDate.split('/');
                                var year = split[1];
                                if (year.length <= 2) {
                                    var yearPart = moment().format('YYYY').substring(0, 2);
                                    formResponse.cardDate = split[0] + '/' + yearPart + year;
                                }
                                return formResponse;
                            }
                            catch (_e) {
                                return formResponse;
                            }
                        }

                        formResponse = fixCardDateYear(formResponse);

                        if (!clientLogged() && !formResponse.clientEmail) {
                            isProcessing = false;
                            emit('validate', 'Email is required');
                            return closeModal();
                        }
                        
                        /*//Coupon email restriciton
                        if(order._coupon && order.couponUserEmail){
                            if(order.couponUserEmail!==formResponse.clientEmail){
                                isProcessing = false;
                                emit('validate', "COUPON_EMAIL_MISTMACH");
                                return closeModal();
                            }
                        }*/

                        var clientId = clientLogged() ? localSession.getData()._id : undefined;


                        setTimeout(function(){
                            $rootScope.$emit('booking_payment_form_response',formResponse);
                        },5000);
                

                        if (order.paymentType == 'card') {
                            return payUsingCard();
                        }
                        if (order.paymentType == 'cheque') {
                            return payUsingCheque();
                        }

                        reject("Invalid payment type " + order.paymentType);
                        closeModal();

                        function payUsingCheque() {
                            backendApi.Order.custom('payUsingCheque', {
                                coupon: order._coupon,
                                orderId: order._id,
                                price: getPrice(order),
                                clientId: clientId,
                                clientEmail: formResponse.clientEmail,
                                clientName: formResponse.clientName,
                                clientPhone: formResponse.clientPhone,
                                clientPassword: formResponse.clientPassword
                            }).then(function() {
                                isProcessing = false;
                                order.price = getPrice(order); //cheque price assigned
                                resolve(true);
                                closeModal();
                            }).error(function(res) {
                                isProcessing = false;
                                reject(res);
                                closeModal();
                            }).on('validate', function(msg, apiError) {
                                isProcessing = false;
                                emit('validate', msg, apiError);
                                closeModal();
                            }).on('validate:error', (err) => emit('validate:error', err));
                        }

                        function payUsingCard() {
                            var payload = {
                                coupon: order._coupon,
                                wallet: order._client.wallet,
                                cardType: formResponse.cardType,
                                cardNumber: formResponse.cardNumber,
                                cardCode: formResponse.cardCode,
                                cardDate: formResponse.cardDate,

                                clientId: clientId,
                                creditCardOwner: formResponse.creditCardOwner,
                                clientEmail: formResponse.clientEmail,
                                clientName: formResponse.clientName,
                                clientPhone: formResponse.clientPhone,
                                clientPassword: formResponse.clientPassword,
                                billingAddress: formResponse.billingAddress,

                                amountTot: parseFloat(order.price).toFixed(2).toString(),
                                amountCom: (parseFloat(order.price) - parseFloat(order.diagRemunerationHT)).toFixed(2).toString(),
                                comment: 'House Diagnostic by autoentrepreneur ' + order._diag.firstName + ' ' + order._diag.lastName + ' SIRET ' + order._diag.siret + ' through www.diagnostical.fr, Order #_INVOICE_NUMBER_'
                                    //comment: "House Inspection by www.houseinspectors.fr, ORDER 24577 for client prop@fake.com (TEST)",
                            };
                            payload = {
                                orderId: order._id,
                                secret: payload,//window.btoa(JSON.stringify(payload)) + window.btoa('secret'),
                                p2pDiag: {
                                    debitWallet: order._client.wallet,
                                    creditWallet: order._diag.wallet,
                                    amount: parseFloat(order.diagRemunerationHT).toFixed(2),
                                    message: '',
                                    privateData: JSON.stringify({
                                        orderId: order._id
                                    })
                                },
                            };
                            isProcessing = true;
                            paymentApi.payOrder(payload).then(function() {
                                isProcessing = false;
                                resolve(true);
                                closeModal();
                            }).error(function(res) {
                                isProcessing = false;
                                reject(res);
                                closeModal();
                            }).on('validate', function(msg) {
                                isProcessing = false;
                                emit('validate', msg);
                                closeModal();
                            }).on('validate:error', (err) => emit('validate:error', err));
                        }


                    });

                });
            },
            open: open
        };
        return self;

    }]);
})();

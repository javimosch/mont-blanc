(function() {
    /*global angular*/
    /*global _*/
    /*global $U*/
    /*global moment*/
    angular.module('app').controller('payment-controller', ['server',
        '$timeout', '$scope', '$rootScope', '$uibModal', 'orderPrice', '$log', 'orderPaymentForm', 'orderQuestion', 'appText', 'appRouter', 'localData', 'appSettings', 'orderHelper', 'localSession', 'backendApi', 'orderQuoteForm', 'apiError', 'orderBooking', 'Analytics',
        function(db, $timeout, $scope, $rootScope, $uibModal, orderPrice, $log, orderPaymentForm, orderQuestion, appText, appRouter, localData, appSettings, orderHelper, localSession, backendApi, orderQuoteForm, apiError, orderBooking, Analytics) {

            (function() {
                var session = localSession.getData();
                if (session._id && session.userType === 'admin' && Analytics.userId && Analytics.userId == session._id) {
                    Analytics.unsetUser();
                }
            })();


            $U.exposeGlobal('ps', $scope);

            localData(); // requires local data

            var order = orderHelper.getFromSession();

            /*COUPON*/
            var couponCodeIsDirty = false;
            $scope.couponCode = '';
            $scope.coupon = null;
            $scope.showCouponApplyButton = () => couponCodeIsDirty;
            $scope.applyCoupon = (event) => {
                if (event && event.which !== 13) {
                    return;
                }
                couponCodeIsDirty = false;
                backendApi.coupons.findByCode($scope.couponCode.toUpperCase()).on('validate', $log.warn).catch($log.error).then(res => {
                    $scope.coupon = res.result && res.result[0];
                    if (!$scope.coupon) return;
                    $scope.order.couponDiscount = $scope.coupon.discount;
                    $scope.order._coupon = $scope.coupon._id;
                    createFromCache($scope.order); //this will regenerate the order with new price
                });
            };
            $scope.$watch('couponCode', () => {
                if ($scope.order.couponDiscount !== undefined) {
                    $scope.order.couponDiscount = undefined;
                    createFromCache($scope.order); //this will regenerate the order with new price
                }
                if ($scope.couponCode) couponCodeIsDirty = true;
                else couponCodeIsDirty = false;
            });


            function analyticEvent(param) {
                return Object.assign({
                    orderId: $scope.order._id,
                    address: $scope.order.address,
                    start: moment($scope.start).format("DD/MM/YYYY hh[h]mm"),
                    diagEmail: $scope.order._diag.email,
                }, param || {});
            }

            var clientIdentifiedAfterPayment = false;

            function tryToSetAnalyticUser(event, params) {
                var payload = {};
                if ($scope._user && $scope._user._id && $scope._user.userType == 'client') {
                    payload._id = $scope._user._id;
                }
                else {
                    if (params && params.clientEmail && !clientIdentifiedAfterPayment) {
                        payload.email = params.clientEmail;
                    }
                }
                if (Object.keys(payload).length > 0) {
                    backendApi.user.get(payload).then(r => {
                        if (r.result && r.result._id) {
                            clientIdentifiedAfterPayment = true;
                            Analytics.syncUser(r.result, true);
                        }
                    });
                }
            }

            $rootScope.$on('booking_payment_form_response', tryToSetAnalyticUser);


            //BINDINGS
            $scope.order = order;
            $scope._user = localSession.getData();
            tryToSetAnalyticUser();
            $scope.orderDateFormatted = () => orderHelper.getDateFormatted(order);
            $scope.orderDiagFormatted = () => orderHelper.getDiagAccountDescription(order);
            $scope.quote = () => {
                orderQuoteForm.open(order).then((res) => {

                    Analytics.trackEvent('booking_payment_devis_envoye_par_mail', analyticEvent());


                    $rootScope.infoMessage("Devis envoyé par mail");
                    orderHelper.clearCache();
                    appRouter.to(appRouter.URL().HOME);
                }).on('validate', (msg) => {
                    tryToSetAnalyticUser();
                }).on('validate:error', (error) => {
                    if (error.isEqual.DATABASE_OBJECT_MISMATCH_ERROR) {
                        $rootScope.infoMessage("Mise à jour des données de réservation, réessayer après la recharge");
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    }
                    else {

                        Analytics.trackEvent('booking_payment_devis_send_error', analyticEvent({
                            errorMessage: error.genericMessage,
                            detail: error.detail || 'None',
                            code: error.code || 'Unkown'
                        }));

                        $rootScope.warningMessage(error.genericMessage);
                    }
                    tryToSetAnalyticUser();
                }).error((err) => {
                    $log.error(err);
                });
            };
            $scope.payWithCheque = () => {
                order.paymentType = "cheque";
                $scope.pay();
            };
            $scope.pay = () => {
                if (orderHelper.status(order).isPaid()) {
                    return showOrderResume();
                }

                Analytics.trackEvent('booking_payment_' + order.paymentType + '_begin', analyticEvent());

                $scope.validateForm(() => {
                    db.ctrl('Order', 'update', order);
                    orderPaymentForm.pay(order).then(function() {
                            $rootScope.infoMessage(appText.ORDER_PAID_SUCCESS, 10000);
                            Analytics.trackEvent('booking_payment_' + order.paymentType + '_success', analyticEvent());
                            tryToSetAnalyticUser();
                            showOrderResume();
                        })
                        .error(() => $rootScope.errorMessage('', 10000))
                        .on('validate', function(msg, apiError) {
                            tryToSetAnalyticUser();
                            if (apiError && apiError.isEqual.ORDER_NOT_FOUND) {
                                $rootScope.infoMessage("Mise à jour des données de réservation, réessayer après la recharge");
                                setTimeout(() => {
                                    window.location.reload();
                                }, 1500);
                                return;
                            }

                            Analytics.trackEvent('booking_payment_' + order.paymentType + '_fail', analyticEvent({
                                errorMessage: apiError.genericMessage.replace('(BACKEND)', ''),
                                detail: apiError.detail || 'None',
                                code: apiError.code || 'Unkown'
                            }));

                            if (apiError && apiError.isEqual.COUPON_ALREADY_USED) {
                                return $rootScope.infoMessage(apiError.genericMessage.replace('(BACKEND)', ''));
                            }

                            return $rootScope.warningMessage(msg, 10000);
                        }).on('processing', function(msg) {
                            return $rootScope.infoMessage(msg, 10000);
                        });
                });
            };
            $scope.validateForm = function(cb) {
                $U.ifThenMessage([
                    [orderHelper.isAgency(order) && !order.landLordEmail, '==', true, appText.VALIDATE_DELEGATED_LANDLORD_EMAIL],
                    [orderHelper.isAgency(order) && !order.landLordFullName, '==', true, appText.VALIDATE_DELEGATED_LANDLORD_NOM],
                    [!order.keysAddress, '==', true, appText.VALIDATE_ORDER_KEYS_ADDRESS],
                    [!order.keysTimeFrom, '==', true, appText.VALIDATE_ORDER_KEYS_ADDRESS_DATE_FROM],
                    [!order.keysTimeTo, '==', true, appText.VALIDATE_ORDER_KEYS_ADDRESS_DATE_TO],
                ], (m) => {
                    if (typeof m[0] !== 'string') {
                        $rootScope.warningMessage(m[0]());
                    }
                    else {
                        $rootScope.warningMessage(m[0]);
                    }
                }, cb);
            }
            $scope.delegate = () => {
                $scope.validateForm(() => {
                    backendApi.Order.update(order);
                    $scope.openConfirm({
                        templateUrl: "views/diags/booking/partials/booking-delegate-popup.html",
                        data: {
                            email: order.landLordFullName,
                            title: appText.DELEGATION_POPUP_TITLE,
                        }
                    }, () => {
                        db.ctrl('Notification', 'LANDLORD_ORDER_PAYMENT_DELEGATED', {
                            _user: $scope._user,
                            _order: order,
                            //attachmentPDFHTML: html
                        }).then(data => {
                            if (!data.ok) {

                                Analytics.trackEvent('booking_payment_delegated_fail', analyticEvent({
                                    errorMetadata: JSON.stringify(data.error)
                                }));

                                return $rootScope.warningMessage(appText.ORDER_DELEGATED_EMAIL_FAIL, 10000);
                            }
                            $rootScope.infoMessage(appText.ORDER_DELEGATED_SUCCESS, 10000);

                            Analytics.trackEvent('booking_payment_delegated_success', analyticEvent());

                            order.status = 'ordered';
                            db.ctrl('Order', 'update', {
                                _id: order._id,
                                status: order.status
                            });
                            showOrderResume();
                        });
                    });
                });
            };
            $scope.showDelegateOrderElements = () => !orderHelper.isLandLord(order);

            //$log.debug('FROM_SESSION', _.clone(order));

            if (order._id !== undefined) {
                $log.debug('Populating order from cache');

                //$log.debug('order', order);

                orderHelper.populate(order).then((result) => {
                    if (!result) {
                        return createFromCache();
                    }
                    copyValues(result);
                    var status = orderHelper.status(order);
                    if (status.isPaid() || status.isOrdered() || status.isNotCreated()) {
                        return showOrderResume();
                    }
                    else {

                        //The existing order (created) will be populated with 
                        //new booking data and saved (updated)
                        orderHelper.updateFromBookingData().then(result => {
                            order._id = result._id;
                        }).error((err) => {
                            $log.error("Payment screen update order from booking data", err);
                            appRouter.to(appRouter.URL().HOME);
                        }).on('available', (o) => {
                            copyValues(o);
                        });

                    }
                }).error((err) => {
                    $log.error('Payment screen population fail', err);
                    appRouter.to(appRouter.URL().HOME);
                }).on('validate', (m) => {
                    $log.warn('Payment screen population fail', m);
                    appRouter.to(appRouter.URL().HOME);
                });
            }
            else {
                createFromCache();
            }

            function createFromCache(data) {
                $log.debug('Creating from cache data');

                //$log.debug('order', order);

                orderHelper.createFromBookingData(data).then(result => {
                    //$log.debug('saved to server', result);
                    order._id = result._id;
                }).error((err) => {
                    $log.error("Can't create the order:", err);
                    orderHelper.clearCache();
                    appRouter.to(appRouter.URL().HOME);
                }).on('available', (o) => {
                    //$log.debug('Available for saving', o);
                    copyValues(o);
                });
            }

            function copyValues(o) {
                for (var x in o) {
                    order[x] = o[x];
                }
            }

            function showOrderResume() {
                $rootScope.sessionMetadata({
                    booking: {}
                });
                orderHelper.clearCache();
                $rootScope.routeParams({
                    _order: order,
                    _client: localSession.getData()
                });
                $rootScope.route('order-confirm');
            }




            $scope.keysWhereOptions = {
                default: 1,
                items: [{
                    label: "Sur Place",
                    value: 1
                }, {
                    label: 'Votre adresse',
                    value: 3,
                    show: () => !(!$scope._user || !$scope._user.clientType)
                }, {
                    label: 'Résidence Principal',
                    value: 4,
                    show: () => !orderHelper.isLandLord(order) && !(!$scope._user || !$scope._user.clientType)
                }, {
                    label: 'Other',
                    value: 2
                }],
                change: function(selectedValue) {
                    //$log.debug('(keysWhereOptions) start',selectedValue,order.address);
                    
                    if(!order.address){
                        var self = this;
                        //$log.debug('(keysWhereOptions) waiting address');
                        return setTimeout(function(){
                            self.change(selectedValue);
                        },200);
                    }
                    
                    $rootScope.dom(() => {
                        if (!$scope.keysWhere === 1) {
                            var m = moment(order.start).hours(8);
                            $scope.__keysTimeFromSelect($rootScope.momentTime(m), new Date(m.toString()));
                            m = moment(order.start).subtract(30, 'minutes');
                            $scope.__keysTimeToSelect($rootScope.momentTime(m), new Date(m.toString()));
                        }
                        switch (selectedValue) {
                            case 1: //sur place
                                order.keysAddress = order.address;
                                $scope.__keysTimeFromSelect($rootScope.momentTime(order.start), new Date(moment(order.start).toString()));
                                $scope.__keysTimeToSelect($rootScope.momentTime(order.start), new Date(moment(order.start).toString()));
                                break;
                            case 2: //other
                                order.keysAddress = '';
                                break;
                            case 3: //votre addrese
                                order.keysAddress = $scope._user.address;
                                break;
                            case 4: //residence
                                order.keysAddress = order.landLordAddress;
                                break;
                            default:
                                order.keysAddress = '';
                                break;
                        }

                    }, 200);
                }
            };





            //KEYS TIME FROM ------------------------------------------------------------------------------------------------
            $scope.__keysTimeFromItems = {};
            $scope.__keysTimeFromGetItems = () => {
                var vals = {};
                if (!order) return vals;
                var m = moment(order.start).hours(8);
                while (m.isBefore(moment(order.start))) {
                    vals[$rootScope.momentTime(m)] = new Date(m.toString());
                    m = m.add(5, 'minutes');
                };
                vals[$rootScope.momentTime(order.start)] = new Date(moment(order.start).toString());


                return vals;
            };
            $scope.__keysTimeFromSelectFirstItem = () => $scope.__keysTimeFromItems && Object.keys($scope.__keysTimeFromItems)[0] || appText.SELECT_LOADING_VALUES;
            $scope.__keysTimeFromSelectLabel = appText.SELECT_UNSELECTED_LABEL;
            $scope.__keysTimeFromSelect = (key, val) => {
                order.keysTimeFrom = val;
                if (moment(order.keysTimeFrom).isAfter(moment(order.keysTimeTo))) {
                    order.keysTimeTo = undefined;
                }
                $scope.__keysTimeFromSelectKey = key;
            };
            $scope.$watch('order.keysTimeFrom', function(val) {
                if (!val) {
                    $scope.__keysTimeFromSelectLabel = appText.SELECT_UNSELECTED_LABEL;
                }
                else {
                    $scope.__keysTimeFromSelectLabel = appText.SELECT_UNSELECTED_LABEL;
                    _.each($scope.__keysTimeFromItems, (v, k) => {
                        if (v == val) $scope.__keysTimeFromSelectLabel = k;
                    });
                    if ($scope.__keysTimeFromSelectLabel == appText.SELECT_UNSELECTED_LABEL && $scope.__keysTimeFromSelectKey) {
                        $scope.__keysTimeFromSelectLabel = $scope.__keysTimeFromSelectKey;
                    }
                }

            });
            $scope.$watch('order.start', function(val) {
                $scope.__keysTimeFromItems = $scope.__keysTimeFromGetItems();
            });

            //KEYS TIME TO ------------------------------------------------------------------------------------------------
            $scope.__keysTimeToItems = {};
            $scope.__keysTimeToGetItems = () => {
                var vals = {};
                if (!order) return vals;
                var m = moment(order.start).hours(8).minutes(0);
                if (
                    moment(order.keysTimeFrom).isAfter(m) &&
                    moment(order.keysTimeFrom).isBefore(moment(order.start))
                ) {
                    m = m.hours(moment(order.keysTimeFrom).hours())
                    m = m.minutes(moment(order.keysTimeFrom).minutes())
                }

                while (m.isBefore(moment(order.start))) {
                    vals[$rootScope.momentTime(m)] = new Date(m.toString());
                    m = m.add(5, 'minutes');
                };
                vals[$rootScope.momentTime(order.start)] = new Date(moment(order.start).toString());



                return vals;
            };
            $scope.__keysTimeToSelectFirstItem = () => $scope.__keysTimeToItems && Object.keys($scope.__keysTimeToItems)[0] || appText.SELECT_LOADING_VALUES;
            $scope.__keysTimeToSelectLabel = appText.SELECT_UNSELECTED_LABEL;
            $scope.__keysTimeToSelect = (key, val) => {
                order.keysTimeTo = val;
                $scope.__keysTimeToSelectKey = key;
            };
            $scope.$watch('order.keysTimeTo', function(val) {
                if (!val) {
                    $scope.__keysTimeToSelectLabel = appText.SELECT_UNSELECTED_LABEL;
                }
                else {
                    $scope.__keysTimeToSelectLabel = appText.SELECT_UNSELECTED_LABEL;
                    _.each($scope.__keysTimeToItems, (v, k) => {
                        if (v == val) $scope.__keysTimeToSelectLabel = k;
                    });
                    if ($scope.__keysTimeToSelectLabel == appText.SELECT_UNSELECTED_LABEL && $scope.__keysTimeToSelectKey) {
                        $scope.__keysTimeToSelectLabel = $scope.__keysTimeToSelectKey;
                    }
                }

            });
            $scope.$watch('order.keysTimeFrom', function(val) {
                $scope.__keysTimeToItems = $scope.__keysTimeToGetItems();
            });
            $scope.$watch('order.start', function(val) {
                $scope.__keysTimeToItems = $scope.__keysTimeToGetItems();
            });
            //-------------------------------------------------------------------------


            //Workaround for modal directive
            $timeout(function() {
                $rootScope.openModal = $rootScope.openModal || $scope.openModal;
            }, 2000);

        }
    ]);
})();

(function() {
    /*global angular*/
    /*global _*/
    /*global $U*/
    /*global moment*/
    angular.module('app').controller('payment-controller', ['server',
        '$timeout', '$scope', '$rootScope', '$uibModal', 'orderPrice', '$log', 'orderPaymentForm', 'orderQuestion', 'appText', 'appRouter', 'localData', 'appSettings', 'orderHelper', 'localSession', 'backendApi', 'orderQuoteForm', 'apiError', 'orderBooking',
        function(db, $timeout, $scope, $rootScope, $uibModal, orderPrice, $log, orderPaymentForm, orderQuestion, appText, appRouter, localData, appSettings, orderHelper, localSession, backendApi, orderQuoteForm, apiError, orderBooking) {

            $U.exposeGlobal('ps', $scope);

            localData(); // requires local data

            var order = orderHelper.getFromSession();



            //BINDINGS
            $scope.order = order;
            $scope._user = localSession.getData();
            $scope.orderDateFormatted = () => orderHelper.getDateFormatted(order);
            $scope.orderDiagFormatted = () => orderHelper.getDiagAccountDescription(order);
            $scope.quote = () => {
                orderQuoteForm.open(order).then((res) => {
                    $log.info("Devis envoyé par mail");
                    orderHelper.clearCache();
                    appRouter.to(appRouter.URL().HOME);
                }).on('validate', (msg) => {

                }).on('validate:error', (error) => {
                    if (error.isEqual.DATABASE_OBJECT_MISMATCH_ERROR) {
                        $rootScope.infoMessage("Mise à jour des données de réservation, réessayer après la recharge");
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    }
                    else {
                        $rootScope.warningMessage(error.genericMessage);
                    }
                }).error((err) => {
                    $log.error(err);
                });
            };
            $scope.pay = (success) => {
                if (orderHelper.status(order).isPaid()) {
                    return showOrderResume();
                }
                $scope.validateForm(() => {
                    db.ctrl('Order', 'update', order);
                    orderPaymentForm.pay(order).then(function() {
                        $rootScope.infoMessage(appText.ORDER_PAID_SUCCESS, 10000);
                        showOrderResume();
                    }).error(function(res) {
                        return $rootScope.errorMessage('', 10000);
                    }).on('validate', function(msg) {
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
                                return $rootScope.warningMessage(appText.ORDER_DELEGATED_EMAIL_FAIL, 10000);
                            }
                            $rootScope.infoMessage(appText.ORDER_DELEGATED_SUCCESS, 10000);
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

            function createFromCache() {
                $log.debug('Creating from cache data');

                //$log.debug('order', order);

                orderHelper.createFromBookingData().then(result => {
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
                $rootScope.routeParams({
                    _order: order,
                    _client: localSession.getData()
                });
                $rootScope.route('order-confirm');
            };





            //KEYS WHERE Version2 --------------------------------
            $scope.__keysWhereItems = {};
            $scope.__keysWhereGetItems = () => {
                if (!$scope._user || !$scope._user.clientType) return {
                    'Ou ?': () => '',
                    'Sur Place': () => order.address,
                    'Other': () => 'other'
                };
                if (orderHelper.isLandLord(order)) {
                    return {
                        'Ou ?': () => '',
                        'Sur Place': () => order.address,
                        'Votre adresse': () => $scope._user.address, //when landlord
                        'Other': () => 'other'
                    };
                }
                else {
                    return {
                        'Ou ?': () => '',
                        'Sur Place': () => order.address,
                        'Votre adresse': () => $scope._user.address, //when not-landlord
                        'Résidence Principal': () => order.landLordAddress, //when not-landlord 
                        'Other': () => 'other'
                    };
                }
            };
            $scope.$watch('_user', function(val) {
                $scope.__keysWhereItems = $scope.__keysWhereGetItems();
            }, true);
            $scope.__keysWhereSelectFirstItem = () => $scope.__keysWhereItems && Object.keys($scope.__keysWhereItems)[0] || "Loading";
            $scope.__keysWhereSelectLabel = () => $scope.__keysWhereSelectLabelVal || $scope.__keysWhereSelectFirstItem();
            $scope.__keysWhereSelect = (key, val) => {
                order.keysWhere = val && val() || undefined;
            };
            $scope.$watch('order.keysWhere', function(val) {
                if (val == undefined) {
                    $rootScope.dom(() => {
                        order.keysAddress = 'non disponible';
                    });
                    $rootScope.dom(() => {
                        order.keysAddress = undefined;
                    }, 2000);
                    //
                    return $scope.__keysWhereSelectLabelVal = 'Ou ?';
                }
                Object.keys($scope.__keysWhereItems).forEach(k => {
                    if ($scope.__keysWhereItems[k]() == val) {
                        $scope.__keysWhereSelectLabelVal = k;
                    }
                });
                order.keysAddress = (val == 'other') ? '' : val;


                $rootScope.dom(() => {
                    //auto set from
                    if ($scope.__keysWhereSelectLabel() == "Sur Place") {
                        $scope.__keysTimeFromSelect($rootScope.momentTime(order.start), new Date(moment(order.start).toString()));
                    }
                    else {
                        var m = moment(order.start).hours(8);
                        $scope.__keysTimeFromSelect($rootScope.momentTime(m), new Date(m.toString()));
                    }
                    //auto set to
                    if ($scope.__keysWhereSelectLabel() == "Sur Place") {
                        $scope.__keysTimeToSelect($rootScope.momentTime(order.start), new Date(moment(order.start).toString()));
                    }
                    else {
                        var m = moment(order.start).subtract(30, 'minutes');
                        $scope.__keysTimeToSelect($rootScope.momentTime(m), new Date(m.toString()));
                    }
                }, 200);

            });

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

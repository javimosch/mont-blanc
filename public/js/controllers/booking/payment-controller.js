(function() {
    /*global angular*/
    /*global _*/
    /*global $U*/
    /*global moment*/
    angular.module('app').controller('payment-controller', ['server',
        '$timeout', '$scope', '$rootScope', '$uibModal', 'diagSlots', 'orderPrice', '$log', 'orderPaymentForm', 'orderQuestion', 'appText', 'appRouter', 'localData', 'appSettings', 'orderHelper', 'localSession', 'backendApi',
        function(db, $timeout, s, r, $uibModal, diagSlots, orderPrice, $log, orderPaymentForm, orderQuestion, appText, appRouter, localData, appSettings, orderHelper, localSession, backendApi) {

            $U.exposeGlobal('ps', s);

            localData(); // requires local data

            var order = orderHelper.getFromSession();

            //BINDINGS
            s.order = order;
            s._user = localSession.getData();
            s.orderDateFormatted = () => orderHelper.getDateFormatted(order);
            s.orderDiagFormatted = () => orderHelper.getDiagAccountDescription(order);
            s.pay = (success) => {
                if (orderHelper.status(order).isPaid()) {
                    return showOrderResume();
                }
                s.validateForm(() => {
                    db.ctrl('Order', 'update', order);
                    orderPaymentForm.pay(order).then(function() {
                        r.infoMessage(appText.ORDER_PAID_SUCCESS, 10000);
                        showOrderResume();
                    }).error(function(res) {
                        return r.errorMessage('', 10000);
                    }).on('validate', function(msg) {
                        return r.warningMessage(msg, 10000);
                    });
                });
            };
            s.validateForm = function(cb) {
                $U.ifThenMessage([
                    [orderHelper.isAgency(order) && !order.landLordEmail, '==', true, appText.VALIDATE_DELEGATED_LANDLORD_EMAIL],
                    [orderHelper.isAgency(order) && !order.landLordFullName, '==', true, appText.VALIDATE_DELEGATED_LANDLORD_NOM],
                    [!order.keysAddress, '==', true, appText.VALIDATE_ORDER_KEYS_ADDRESS],
                    [!order.keysTimeFrom, '==', true, appText.VALIDATE_ORDER_KEYS_ADDRESS_DATE_FROM],
                    [!order.keysTimeTo, '==', true, appText.VALIDATE_ORDER_KEYS_ADDRESS_DATE_TO],
                ], (m) => {
                    if (typeof m[0] !== 'string') {
                        r.warningMessage(m[0]());
                    }
                    else {
                        r.warningMessage(m[0]);
                    }
                }, cb);
            }
            s.delegate = () => {
                s.validateForm(() => {
                    backendApi.Order.update(order);
                    s.openConfirm({
                        templateUrl: "views/diags/booking/partials/booking-delegate-popup.html",
                        data: {
                            email: order.landLordFullName,
                            title: appText.DELEGATION_POPUP_TITLE,
                        }
                    }, () => {
                        db.ctrl('Notification', 'LANDLORD_ORDER_PAYMENT_DELEGATED', {
                            _user: s._user,
                            _order: order,
                            //attachmentPDFHTML: html
                        }).then(data => {
                            if (!data.ok) {
                                return r.warningMessage(appText.ORDER_DELEGATED_EMAIL_FAIL, 10000);
                            }
                            r.infoMessage(appText.ORDER_DELEGATED_SUCCESS, 10000);
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
            s.showDelegateOrderElements = () => !orderHelper.isLandLord(order);


            if (order._id) {
                $log.debug('Populating order from cache');

                $log.debug('order', order);

                orderHelper.populate(order).then((result) => {
                    copyValues(result);
                    var status = orderHelper.status(order);
                    if (status.isPaid() || status.isOrdered() || status.isNotCreated()) {
                        return showOrderResume();
                    }
                }).error((err)=>{
                    $log.error('Payment screen population fail',err);
                    appRouter.to(appRouter.URL().HOME);
                }).on('validate',(m)=>{
                    $log.warn('Payment screen population fail',m);
                    appRouter.to(appRouter.URL().HOME);
                });
            }
            else {
                $log.debug('Creating from cache data');

                $log.debug('order', order);

                orderHelper.createFromBookingData().then(result => {
                    $log.debug('saved to server', result);
                    order._id = result._id;
                }).error((err) => {
                    $log.error("Payment screen create order from booking data", err);
                    appRouter.to(appRouter.URL().HOME);
                }).on('available', (o) => {
                    $log.debug('Available for saving', o);
                    copyValues(o);
                });
            }

            function copyValues(o) {
                for (var x in o) {
                    order[x] = o[x];
                }
            }

            function showOrderResume() {
                r.sessionMetadata({
                    booking: {}
                });
                r.routeParams({
                    _order: order,
                    _client: localSession.getData()
                });
                r.route('order-confirm');
            };





            //KEYS WHERE Version2 --------------------------------
            s.__keysWhereItems = {};
            s.__keysWhereGetItems = () => {
                if (!s._user || !s._user.clientType) return {
                    'Ou ?': () => '',
                    'Sur Place': () => order.address,
                    'Other': () => 'other'
                };
                if (orderHelper.isLandLord(order)) {
                    return {
                        'Ou ?': () => '',
                        'Sur Place': () => order.address,
                        'Votre adresse': () => s._user.address, //when landlord
                        'Other': () => 'other'
                    };
                }
                else {
                    return {
                        'Ou ?': () => '',
                        'Sur Place': () => order.address,
                        'Votre adresse': () => s._user.address, //when not-landlord
                        'Résidence Principal': () => order.landLordAddress, //when not-landlord 
                        'Other': () => 'other'
                    };
                }
            };
            s.$watch('_user', function(val) {
                s.__keysWhereItems = s.__keysWhereGetItems();
            }, true);
            s.__keysWhereSelectFirstItem = () => s.__keysWhereItems && Object.keys(s.__keysWhereItems)[0] || "Loading";
            s.__keysWhereSelectLabel = () => s.__keysWhereSelectLabelVal || s.__keysWhereSelectFirstItem();
            s.__keysWhereSelect = (key, val) => {
                order.keysWhere = val && val() || undefined;
            };
            s.$watch('order.keysWhere', function(val) {
                if (val == undefined) {
                    r.dom(() => {
                        order.keysAddress = 'non disponible';
                    });
                    r.dom(() => {
                        order.keysAddress = undefined;
                    }, 2000);
                    //
                    return s.__keysWhereSelectLabelVal = 'Ou ?';
                }
                Object.keys(s.__keysWhereItems).forEach(k => {
                    if (s.__keysWhereItems[k]() == val) {
                        s.__keysWhereSelectLabelVal = k;
                    }
                });
                order.keysAddress = (val == 'other') ? '' : val;


                r.dom(() => {
                    //auto set from
                    if (s.__keysWhereSelectLabel() == "Sur Place") {
                        s.__keysTimeFromSelect(r.momentTime(order.start), new Date(moment(order.start).toString()));
                    }
                    else {
                        var m = moment(order.start).hours(8);
                        s.__keysTimeFromSelect(r.momentTime(m), new Date(m.toString()));
                    }
                    //auto set to
                    if (s.__keysWhereSelectLabel() == "Sur Place") {
                        s.__keysTimeToSelect(r.momentTime(order.start), new Date(moment(order.start).toString()));
                    }
                    else {
                        var m = moment(order.start).subtract(30, 'minutes');
                        s.__keysTimeToSelect(r.momentTime(m), new Date(m.toString()));
                    }
                }, 200);

            });

            //KEYS TIME FROM ------------------------------------------------------------------------------------------------
            s.__keysTimeFromItems = {};
            s.__keysTimeFromGetItems = () => {
                var vals = {};
                if (!order) return vals;
                var m = moment(order.start).hours(8);
                while (m.isBefore(moment(order.start))) {
                    vals[r.momentTime(m)] = new Date(m.toString());
                    m = m.add(5, 'minutes');
                };
                vals[r.momentTime(order.start)] = new Date(moment(order.start).toString());


                return vals;
            };
            s.__keysTimeFromSelectFirstItem = () => s.__keysTimeFromItems && Object.keys(s.__keysTimeFromItems)[0] || appText.SELECT_LOADING_VALUES;
            s.__keysTimeFromSelectLabel = appText.SELECT_UNSELECTED_LABEL;
            s.__keysTimeFromSelect = (key, val) => {
                order.keysTimeFrom = val;
                if (moment(order.keysTimeFrom).isAfter(moment(order.keysTimeTo))) {
                    order.keysTimeTo = undefined;
                }
                s.__keysTimeFromSelectKey = key;
            };
            s.$watch('order.keysTimeFrom', function(val) {
                if (!val) {
                    s.__keysTimeFromSelectLabel = appText.SELECT_UNSELECTED_LABEL;
                }
                else {
                    s.__keysTimeFromSelectLabel = appText.SELECT_UNSELECTED_LABEL;
                    _.each(s.__keysTimeFromItems, (v, k) => {
                        if (v == val) s.__keysTimeFromSelectLabel = k;
                    });
                    if (s.__keysTimeFromSelectLabel == appText.SELECT_UNSELECTED_LABEL && s.__keysTimeFromSelectKey) {
                        s.__keysTimeFromSelectLabel = s.__keysTimeFromSelectKey;
                    }
                }

            });
            s.$watch('order.start', function(val) {
                s.__keysTimeFromItems = s.__keysTimeFromGetItems();
            });

            //KEYS TIME TO ------------------------------------------------------------------------------------------------
            s.__keysTimeToItems = {};
            s.__keysTimeToGetItems = () => {
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
                    vals[r.momentTime(m)] = new Date(m.toString());
                    m = m.add(5, 'minutes');
                };
                vals[r.momentTime(order.start)] = new Date(moment(order.start).toString());



                return vals;
            };
            s.__keysTimeToSelectFirstItem = () => s.__keysTimeToItems && Object.keys(s.__keysTimeToItems)[0] || appText.SELECT_LOADING_VALUES;
            s.__keysTimeToSelectLabel = appText.SELECT_UNSELECTED_LABEL;
            s.__keysTimeToSelect = (key, val) => {
                order.keysTimeTo = val;
                s.__keysTimeToSelectKey = key;
            };
            s.$watch('order.keysTimeTo', function(val) {
                if (!val) {
                    s.__keysTimeToSelectLabel = appText.SELECT_UNSELECTED_LABEL;
                }
                else {
                    s.__keysTimeToSelectLabel = appText.SELECT_UNSELECTED_LABEL;
                    _.each(s.__keysTimeToItems, (v, k) => {
                        if (v == val) s.__keysTimeToSelectLabel = k;
                    });
                    if (s.__keysTimeToSelectLabel == appText.SELECT_UNSELECTED_LABEL && s.__keysTimeToSelectKey) {
                        s.__keysTimeToSelectLabel = s.__keysTimeToSelectKey;
                    }
                }

            });
            s.$watch('order.keysTimeFrom', function(val) {
                s.__keysTimeToItems = s.__keysTimeToGetItems();
            });
            s.$watch('order.start', function(val) {
                s.__keysTimeToItems = s.__keysTimeToGetItems();
            });
            //-------------------------------------------------------------------------


        }
    ]);
})();

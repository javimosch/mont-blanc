/*global val*/
/*global angular*/
/*global _*/
/*global moment*/
/*global $*/
/*global getParameterByName*/
/*global ifThenMessage*/
/*global subTotal*/
/*global openStripeModalPayOrder*/
/*global $U*/
/*global sizePrice*/
/*global totalPrice*/
/*global $D*/
var app = angular.module('app');
app.controller('ctrl.booking', ['server',
    '$timeout', '$scope', '$rootScope', '$uibModal', 'diagSlots', 'orderPrice', '$log', 'orderPaymentForm', 'orderQuestion', 'appText', 'appRouter', 'localData', 'appSettings', 'orderHelper',
    function(db, $timeout, s, r, $uibModal, diagSlots, orderPrice, $log, orderPaymentForm, orderQuestion, appText, appRouter, localData, appSettings, orderHelper) {


        /*BOOKING METADATA*/
        s.item = {
            date: undefined,
            diags: {},
            clientType: 'landlord',
            info: {}
        };
        s._user = {
            address: null
        }; //user (when auth success)
        s._order = {}; //order (when saved)
        s.booking = {
            order: {
                saved: false,
                exists: false,
                taken: false
            },
            complete: false,
            payment: {
                complete: false
            },
            autoSelectDiagsCards: (appRouter.currentPath === "" || appRouter.currentPath === "home") || cameFromIframe()
        };

        function cameFromIframe() {
            var queryStringIfParameterValue = getParameterByName('if');
            if (!queryStringIfParameterValue) return false;
            return queryStringIfParameterValue.toString() === "1";
        }

        /*INIT*/
        localData().then(function(data) {
            Object.assign(s, data);
            s.diags = _.sortBy(s.diags, function(o) {
                return o.sort;
            });
            //accessors for diags
            s.diag = s.diag || {};
            s.diags.forEach(diag => {
                s.diag[diag.name] = diag;
            });
            s.diagSelected = s.diag.dpe;

            if (s.booking.autoSelectDiagsCards) {
                $log.debug('autoSelectDiagCards enabled');
                orderQuestion.bindAnswersToDefaultDiags(s);
            }
            else {
                $log.debug('autoSelectDiagCards disabled');
            }

            //updateChecksVisibilityOnDemand();
            waitForProperties([loadDefaults, loadMetadata, validateMetadata, r.dom], ['notify']);
        });

        function validateMetadata() {
            if (appRouter.currentPath == 'payment') {
                var meta = r.sessionMetadata();
                if (!meta.booking || !meta.booking._order) {
                    //$log.debug('DEBUG INVALID-METADATA ROUTING-TO-HOME ORDER-EXPECTED', r.sessionMetadata());
                    return changeRoute(r.URL.HOME);
                }
            }
            if (appRouter.currentPath == '') {
                r.sessionMetadata({
                    booking: {
                        _order: {}
                    }
                });
                return;
            }
            validateQuestions(() => {}, () => {
                //$log.debug('DEBUG INVALID-METADATA ROUTING-TO-HOME', r.sessionMetadata());
                r.sessionMetadata({
                    booking: {}
                });
                loadDefaults();
                changeRoute(r.URL.HOME);
            });
        }


        function loadMetadata() {

            var meta = r.sessionMetadata();
            if (meta.booking && meta.booking.item) s.item = meta.booking.item;
            if (meta.booking && meta.booking._order) s._order = meta.booking._order;
            if (meta.booking && meta.booking._user) s._user = meta.booking._user;
            if (meta.booking && meta.booking._booking) s.booking = meta.booking._booking;
            if (meta.booking && meta.booking.diags) s.diags = meta.booking.diags;
        }

        function changeRoute(url, delay) {
            //$log.debug('VIRTUAL-ROUTE-TO ', url,Object.assign({},s.item));
            r.sessionMetadata({
                booking: {
                    item: s.item,
                    _order: s._order,
                    _user: s._user
                }
            });
            r.route(url, delay);
        }





        $timeout(function() {
            r.openModal = s.openModal;
        }, 2000);



        r.dom(); //compile directives

        $U.expose('r', r);
        $U.expose('s', s);

        moment.locale('fr')

        function creatediagSlots() {
            s.diagSlots = diagSlots(s, s.item);
        }





        var MESSAGES = {
            ANSWER_SELL_OR_RENT: appText.BOOKING_VALIDATE_OPERATION,
            ANSWER_APPARTAMENT_OR_MAISON: appText.BOOKING_VALIDATE_BUILDING_TYPE,
            FRENCH_ADDRESS_REQUIRED: appText.VALIDATE_FRENCH_ADDRESS,
        };

        r.__textSTATIC = {
            BOOKING_STRIPE_TEXT: appText.PAYMENT_FRAMEWORK_TEXT,
            BOOKING_HOME_BG_TEXT_1: appText.WELCOME_MAIN_TEXT,
            BOOKING_HOME_BG_TEXT_2: appText.WELCOME_PHONE_LEFT_TEXT
        };



        function onRouteChange(pathFrom, pathTo) {
            //$log.log('booking.onRouteChange scrollTop');
            r.dom($U.scrollToTop);
            if (!pathTo || pathTo == r.URL.HOME) {
                //s._order = {}; //reset

            }
            else {

            }

            if (pathTo == r.URL.RDV) {
                var wait = setInterval(() => {
                    if (!s.diagSlots) return;
                    clearInterval(wait);
                    s.diagSlots.init(undefined, {
                        daysPerPage: 8, //$(window).width()>1200?8:4,
                        department: s.item && s.item.postCode && s.item.postCode.substring(0, 2)
                    });
                }, 100)
            }

            if (pathTo == r.URL.ACCOUNT_DETAILS) {
                return true; //deprecated, this route belongs to another controller
                /*
                if (!s._user || !s._user.__subscribeMode) {
                    console.warn('current _user is not in _subscribeMode');
                    changeRoute(r.URL.HOME);
                    return false;
                }
                else {
                    delete s._user.__subscribeMode;
                }
                */
            }

            if (pathTo == r.URL.PAYMENT) {
                //if ((s.__manualUrlChange || 0) + 5000 < new Date().getTime()) {
                //resolvePaymentScreenAuth().then(resolvePaymentScreenOrder);
                //}
            }
            else {
                //$U.url.clear();
            }

            return true;
        }

        appRouter.onChange(function(pathFrom, pathTo) {
            return onRouteChange(pathFrom, pathTo);
        });
        onRouteChange(appRouter.currentPath, appRouter.currentPath);





        s.checks = {
            selectAll: false
        };


        function atLeastOneDiagSelected() {
            for (var x in s.item.diags) {
                if (s.item.diags[x] == true) return true;
            }
            return false;
        }


        //MAIN BUTTONS
        s.proceedToDiagsSelection = function() {



            validateQuestions(function() {
                changeRoute('choix-diagnostics');
            }, () => {
                // changeRoute('home');

                if (!s.addressDepartmentCovered) {

                    var msg = "Votre département n'est pas encore couvert par Diagnostical.<br>";
                    msg += "Laissez-nous votre adresse e-mail pour être informé de l'ouverture du service dans votre département."
                    msg += "<div class='row margin-top-one' >";
                    msg += "   <div class='col-sm-12'>";
                    msg += "      <input class='diags-input' ng-model=\"data.email\" placeholder='adresse e-mail'>";
                    msg += "   </div>";
                    msg += "</div>";

                    db.ctrl('Notification', 'ADMIN_BOOKING_MISSING_DEPARTMENT', {
                        department: s.item.postCode.substring(0, 2),
                    });

                    var modal = s.openConfirm({
                        message: msg,
                        data: {
                            title: appText.VALIDATE_FRENCH_ADDRESS,
                            hideYesButton: true,
                            email: r.session() && r.session().email || '',
                            customButton: true,
                            customButtonLabel: appText.DEPARTEMENT_COVERED_SEND_BUTTON,
                            customButtonClick: () => {
                                if (!modal.scope.data.email) {
                                    return r.infoMessage(appText.VALIDATE_DEPARTEMENT_COVERED_SENDER_EMAIL);
                                }
                                else {

                                    db.ctrl('Notification', 'ADMIN_BOOKING_MISSING_DEPARTMENT_REQUEST', {
                                        department: s.item.postCode.substring(0, 2),
                                        email: modal.scope.data.email,
                                        metadata: JSON.stringify(s.item),
                                    });
                                    modal.close();
                                    return r.infoMessage(appText.DEPARTEMENT_COVERED_EMAIL_SENDED)
                                }

                            }
                        }
                    });

                }

            });
        }
        s.proceedToDateSelection = function() {
            validateQuestions(function() {
                //at least one diag selected
                if (atLeastOneDiagSelected()) {
                    return changeRoute('rendez-vous');
                }
                else {
                    return r.warningMessage(appText.BOOKING_PROCEED_TO_DATE_SELECTION_FLASH_MESSAGE);
                }
            }, () => {
                changeRoute('/');
            });
        }
        s.proceedToConnect = function(range) {


            s.item.range = range.id;
            //var data = JSON.parse(window.atob(range));
            s.item._diag = range._diag;
            s.item.start = range.start;
            s.item.end = range.end;

            if (s.item._diag) {
                //$log.debug('fetch _diag',s.item._diag);
                db.ctrl('User', 'get', {
                    _id: s.item._diag,
                    __select: "firstName lastName email"
                }).then(res => {
                    //    $log.debug('fetch _diag',res.result);
                    s.item.__diag = res.result;
                });
            }
            else {
                $log.warn('item._diag should exists prior to route booking connexion view');
            }

            //this is fire from the date checkbox and they need a time to change the state.
            //lets execute this with a delay.
            setTimeout(function() {
                s.validateDate(function() {
                    changeRoute(r.URL.PAYMENT);
                }, () => {
                    //already in rdv view 
                });
            }, 500);

        }






        s.validateDate = function(cb, err) {
            ifThenMessage([
                [s.item.start, '==', undefined, ""],
                [s.item.end, '==', undefined, ""],
                [s.item._diag, '==', undefined, ""],
            ], (m) => {
                r.warningMessage(appText.BOOKING_VALIDATE_ORDER_DATE);
                if (err) err();
            }, cb);
        }


        s.addressDepartmentCovered = true;


        s.validateAddressDepartment = (cb, err) => {
            var code = s.item.postCode.substring(0, 2);
            db.ctrl('User', 'departmentCoveredBy', {
                department: code.toString()
            }).then(res => {
                if (!res.ok) {
                    return cb && cb(); //ignores validation
                }
                s.addressDepartmentCovered = res.result;
                if (res.result == true) {
                    cb && cb();
                }
                else {
                    err && err();
                }
            })
        };





        function validateQuestions(cb, err) {
            ifThenMessage([
                [s.item.info.buildingState, '==', undefined, MESSAGES.ANSWER_SELL_OR_RENT],
                [s.item.info.buildingType, '==', undefined, MESSAGES.ANSWER_APPARTAMENT_OR_MAISON],
                [s.item.info.squareMeters, '==', undefined, appText.BOOKING_VALIDATE_BUILDING_SIZE],
                [s.item.info.constructionPermissionDate, '==', undefined, appText.BOOKING_VALIDATE_CONSTRUCTION_DATE],
                [s.item.info.gasInstallation, '==', undefined, appText.BOOKING_VALIDATE_GAZ],
                [s.item.info.electricityInstallation, '==', undefined, appText.BOOKING_VALIDATE_ELECTRICITY],
                [s.item.address, '==', undefined, appText.BOOKING_VALIDATE_ADDRESS],
                [s.item.postCode, '==', 'France', appText.BOOKING_VALIDATE_ADDRESS_PRECISION],
                [s.item.postCode, '==', 'Francia', appText.BOOKING_VALIDATE_ADDRESS_PRECISION]

            ], (m) => {
                r.warningMessage(m[0], 6000);
                if (err) err();
            }, () => {
                s.validateAddressDepartment(cb, err);
            });
        }





        /*BOOKING / CHOICE DIAG CARDS / VIEW-HELPER*/
        s.$watch('checks.selectAll', function() {
            if (!s.diags) return;
            s.diags.forEach(d => {
                s.item.diags[d.name] = s.checks.selectAll;
            });
        }, true);


        /*BOOKING / CHOICE RDV SLOT / VIEW-HELPER*/
        s.dateSlotSelected = function(rng) {
            return (s.item.range && (s.item.range == rng.id));
        }







        appSettings.fetchFromRemote().then((remoteSettings) => {
            s.settings = remoteSettings;
        });



        function orderPaid() {
            return _.includes($D.ORDER_STATUS_PAID, s._order.status);
        }

        s.departmentHasTermites = () => {
            if (s.item.department) {
                var code = s.item.postCode.substring(0, 2);
                return _.includes(s.termitesDepartments.map(v => (v.toString())), code);
            }
        };









        //
        r.logger.addControlledErrors([
            "ORDER_EXISTS", "ORDER_TAKEN"
        ]);






        s.isLandLord = () => {
            return orderHelper.isLandLord(s._user.clientType);
        }
        s.isAgency = () => {
            return !s.isLandLord();
        };





        function waitForProperties(cbArray, props) {
            var i = setInterval(function() {
                var rta = true;
                props.forEach((v) => {
                    if (_.isUndefined(s[v])) {
                        rta = false;
                    }
                });
                if (rta) {
                    clearInterval(i);
                    cbArray.forEach((cb) => {
                        cb();
                    });
                }
            }, 200);
        }

        s.__constructionPermissionDateSelectLabel = appText.SELECT_UNSELECTED_LABEL;
        s.__constructionPermissionDateSelect = (key, val) => {
            s.item.info.constructionPermissionDate = val;

        };
        s.$watch('item.info.constructionPermissionDate', function(val) {
            s.__constructionPermissionDateSelectLabel = val ? val : appText.SELECT_UNSELECTED_LABEL;
            r.dom();
        });

        s.__gazSelectLabel = appText.SELECT_UNSELECTED_LABEL;
        s.__gazSelect = (key, val) => {
            s.item.info.gasInstallation = val;
        };
        s.$watch('item.info.gasInstallation', function(val) {
            s.__gazSelectLabel = val ? val : appText.SELECT_UNSELECTED_LABEL;
            r.dom();
        });




        var diagDescription = (n) => {
            var rta = n;
            s.diags.forEach((diag) => {
                if ((n && diag.name == n)) {
                    rta = diag.label;
                }
            });
            if (n === 'cpd') rta = 'constructionPermissionDate';
            return rta;
        }






        var param = (n, validate) => {
            var val = getParameterByName(n);
            if (!val) return undefined;
            if (!validate) {
                return val;
            }
            else {
                var vals = Object.keys(validate).map((v) => {
                    return validate[v]
                }); //valid vals
                if (vals.length > 0 && !_.includes(vals, val)) {
                    var msg = 'Parameter ' + diagDescription(n) + ' has the follow valid values:' + JSON.stringify(vals);
                    console.warn(msg);
                    s.notify(msg, 'warning', 0, true, {
                        duration: 99999
                    })
                    return undefined;
                }
                else {
                    return val;
                }
            }
        };
        var paramDate = s.paramDate = (n) => {
            var v = (getParameterByName(n) || '').toString()
            var d = new Date(v);
            if (isFinite(d)) {
                var fail = false;
                if (moment(d).isBefore(s.datepicker.minDate, 'day')) {
                    fail = true;
                }
                if (moment(d).isAfter(s.datepicker.maxDate, 'day')) {
                    fail = true;
                }
                if (fail) {
                    s.notify('Parameter ' + n + ' needs to be a valid date between ' + s.datepicker.minDate.format("DD/MM/YY") + ' and ' + s.datepicker.maxDate.format('DD/MM/YY'), 'warning', 0, true, {
                        duration: 99999
                    })
                    return undefined;
                }
                return d;
            }
            else {
                if (getParameterByName(n) !== null) {
                    s.notify('Parameter ' + n + ' needs to be a valid date', 'warning', 0, true, {
                        duration: 99999
                    })
                }
            }
            return undefined;
        }
        var paramBool = (n) => {
            var v = (getParameterByName(n) || '').toString()
            if (_.includes(['1', '0'], v)) {
                return v === '1';
            }
            else {
                if (getParameterByName(n) !== null) {
                    s.notify('Parameter ' + n + ' needs to be a 1/0', 'warning', 0, true, {
                        duration: 99999
                    })
                }
                return undefined;
            }
        }




        function loadDefaults() {
            s.item.info = s.item.info || {};
            s.item = Object.assign(s.item, {
                info: {
                    buildingState: param('buildingState', {
                        '0': '0',
                        '1': '1'
                    }) || '1',
                    buildingType: param('buildingType', {
                        '0': '0',
                        '1': '1',
                        '2': '2'
                    }) || undefined,
                    squareMeters: param('squareMeters', s.squareMeters) || '90 - 110m²', // '- de 20m²',
                    // apartamentType: param('apartamentType', s.apartamentType) || undefined,
                    constructionPermissionDate: param('cpd', s.constructionPermissionDate) || 'Entre 1949 et le 01/07/1997', // 'Entre 1949 et le 01/07/1997',
                    gasInstallation: param('gasInstallation', s.gasInstallation) || 'Oui, Plus de 15 ans', // 'Oui, Moins de 15 ans',
                    electricityInstallation: param('electricityInstallation', s.electricityInstallation) || s.item.info.electricityInstallation || 'Plus de 15 ans' // 'Plus de 15 ans',
                },
                address: param('address') || undefined,
                postCode: param('postCode') || undefined,
                date: paramDate('date'),
                time: param('time', ['any']),
                clientType: param('clientType', orderHelper.CLIENT_TYPES)
            });

            creatediagSlots();

            r.dom(function() {

                //Building size slider !?
                try {
                    var x = 0;
                    for (var pos in s.squareMeters) {
                        if (s.item.info.squareMeters == s.squareMeters[pos]) {
                            break;
                        }
                        else {
                            x++;
                        }
                    }
                    $("input[type=range]").val(x);
                    // //$log.debug('range-set-at-', x);
                }
                catch (e) {}
            });

            $U.emitPreserve('booking-defaults-change');

            s.diags.forEach((diag) => {
                var val = paramBool(diag.name);
                if (!_.isUndefined(val) && !_.isNull(val)) {
                    s.item.diags[diag.name] = val;
                }
            });
        }





        function gotoOrderConfirmationScreen() {
            r.sessionMetadata({
                booking: {}
            });
            r.routeParams({
                _order: s._order,
                _client: s._user
            });
            changeRoute('order-confirm');
        };


        s.drawRange = function(rng) {
            var rta = moment(rng.start).format("HH[h]mm");
            rta += ' - ' + Math.floor(rng.price) + ' €';
            return rta;
        };


        s.orderSaved = () => {
            return s._order && s._order._id;
        };
        s.paymentDelegated = () => {
            return s._order.landLordPaymentEmailSended == true;
        };


        s.bookingDescriptionTitle = function(item) {
            return orderHelper.getDescription.title();
        };
        s.bookingDescriptionBody = function(item) {
            return orderHelper.getDescription.body();
        };
    }

]);

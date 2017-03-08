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
    '$timeout', '$scope', '$rootScope', '$uibModal', 'diagSlots', 'orderPrice', '$log', 'orderPaymentForm', 'orderQuestion', 'appText', 'appRouter',
    function(db, $timeout, s, r, $uibModal, diagSlots, orderPrice, $log, orderPaymentForm, orderQuestion, appText, appRouter) {


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
            autoSelectDiagsCards: (appRouter.currentPath === "" || appRouter.currentPath === "home")
        };

        /*INIT*/
        db.localData().then(function(data) {
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
            ANSWER_SELL_OR_RENT: 'Répondre Vendez / Louer',
            ANSWER_APPARTAMENT_OR_MAISON: appText.VALIDATE_BUILDING_TYPE,
            FRENCH_ADDRESS_REQUIRED: 'Adresse besoin d&#39;appartenir à France',
        };

        r.__textSTATIC = {
            BOOKING_STRIPE_TEXT: "Paiement simplifié et sécurisé avec Lemon Way accrédité ACPR",
            BOOKING_HOME_BG_TEXT_1: "Accédez aux calendriers en live des diagnostiqueurs immobiliers certifiés, disponibles, au bon prix*",
            BOOKING_HOME_BG_TEXT_2: "Nous joindre au",
            BOOKING_HOME_BG_TEXT_PHONE: "0899 399 039"
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

        function resolvePaymentScreenAuth() {
            return $U.MyPromise(function(resolve, err, emit) {
                return resolve();
                //
                if (s._user && s._user._id) {
                    if (!$U.url.get('auth')) {
                        $U.url.set('auth', s._user._id);
                        s.__manualUrlChange = new Date().getTime();
                    }
                    resolve();
                    return;
                }
                if ($U.url.get('auth')) {
                    db.ctrl('User', 'get', {
                        _id: $U.url.get('auth')
                    }).then(_user => {
                        _user = _user.ok && _user.result || null;
                        if (_user) {
                            s._user = _user;
                            $U.url.set('auth', s._user._id);
                            s.__manualUrlChange = new Date().getTime();
                            resolve();
                        }
                        else {
                            return moveToLogin();
                        }
                    });
                }
                else {
                    return moveToLogin();
                }
            });
        }

        function resolvePaymentScreenOrder() {
            if ($U.url.get('order')) {
                if (!s._order._id) s.fetchOrder($U.url.get('order'));
            }
            else {
                if (!s._order._id) {
                    s.saveAsync().on('success', function() {
                        s.__manualUrlChange = new Date().getTime();
                        if (!s._order._id) throw Error('ORDER-ID-NULL');
                        $U.url.set('order', s._order._id);
                    })
                }
                else {
                    if (!s._order._id) throw Error('ORDER-ID-NULL');
                    s.__manualUrlChange = new Date().getTime();
                    $U.url.set('order', s._order._id);
                }
            }

        }

        //


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

            //s.validateBeforePayment(()=changeRoute(r.URL.PAYMENT));

            s.validateQuestions(function() {
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
                            title: "Département en cours d'ouverture",
                            hideYesButton: true,
                            email: r.session() && r.session().email || '',
                            customButton: true,
                            customButtonLabel: "Envoyer",
                            customButtonClick: () => {
                                if (!modal.scope.data.email) {
                                    return r.infoMessage('Email est nécessaire.');
                                }
                                else {

                                    db.ctrl('Notification', 'ADMIN_BOOKING_MISSING_DEPARTMENT_REQUEST', {
                                        department: s.item.postCode.substring(0, 2),
                                        email: modal.scope.data.email,
                                        metadata: JSON.stringify(s.item),
                                    });
                                    modal.close();
                                    return r.infoMessage('Nous avons été informés. Merci beaucoup.')
                                }

                            }
                        }
                    });

                }

            });
        }
        s.proceedToDateSelection = function() {
            s.validateQuestions(function() {
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
                //
                s.validateDate(function() {
                    if (s._user && s._user._id) {
                        changeRoute(r.URL.PAYMENT);
                    }
                    else {
                        moveToLogin();
                    }

                });
                //
            }, 500);

        }

        function moveToLogin() {
            if (true && r.logged() && r.session().userType && r.session().clientType && r.session().userType == 'client') {
                s.auth.email = r.session().email;
                s.auth.pass = r.session().password;
                s.login();
            }
            else {
                changeRoute(r.URL.LOGIN);
            }
        }

        s.dateSlot = {
            proceedToConnect: s.proceedToConnect
        };

        s.validateBooking = function(cb) {
            ifThenMessage([
                [s.isAgency() && !s._order.landLordEmail, '==', true, "E-mail du propriétaire requis"],
                [s.isAgency() && !s._order.landLordFullName, '==', true, "Nom du propriétaire requis"],
                [!s._order.keysAddress, '==', true, 'Clés Adresse requise'],
                [!s._order.keysTimeFrom, '==', true, 'Clés Temps "De" requis'],
                [!s._order.keysTimeTo, '==', true, 'Clés Temps "To" requis'],

                // [s.keysWhereTime.invalidKeysTime(), '==', true, s.keysWhereTime.invalidKeysTimeMessage],

            ], (m) => {
                if (typeof m[0] !== 'string') {
                    s.warningMsg(m[0]());
                }
                else {
                    s.warningMsg(m[0]);
                }
            }, cb);
        }
        s.validateAuthInput = function(cb) {

            ifThenMessage([
                [!s.auth.email, '==', true, "Email required."],
                [!s.auth.pass, '==', true, "Password required."],
            ], (m) => {
                if (typeof m[0] !== 'string') {
                    s.warningMsg(m[0]())
                }
                else {
                    s.warningMsg(m[0]);
                }
            }, cb);

        }
        s.validateClientDetails = function(cb) {

            if (!s._user.email) return s.warningMsg('Email c&#39;est obligatoire.');

            if (s._user.clientType !== 'landlord' && !s._user.siret) return s.warningMsg('Siret c&#39;est obligatoire.');

            db.ctrl('User', 'exists', {
                email: s._user.email,
                userType: 'client',
            }).then(exists => {
                exists = exists.ok && exists.result == true;
                if (exists) {
                    s.warningMsg('This email address belongs to an existing member.');
                }
                else {
                    //validate fields
                    ifThenMessage([
                        [!s._user.email, '==', true, "Email c&#39;est obligatoire."],
                        [!s._user.password, '==', true, "Password c&#39;est obligatoire."],
                        [!s._user.cellPhone, '==', true, "Mobile c&#39;est obligatoire"],
                    ], (m) => {
                        if (typeof m[0] !== 'string') {
                            s.warningMsg(m[0]())
                        }
                        else {
                            s.warningMsg(m[0]);
                        }
                    }, cb);
                }
            });
        }
        s.validateBeforePayment = function(cb, shouldValidateLoginAsWell) {
            //$log.debug('DEBUG-VALIDATING-LOGIN');
            if (shouldValidateLoginAsWell && (!s._user || !s._user._id)) {
                //$log.debug('DEBUG-INVALID-LOGIN', s._user);
                return r.moveToLogin();
            }
            //$log.debug('DEBUG-VALIDATING-QUESTIONS');
            s.validateQuestions(function() {
                //$log.debug('DEBUG-VALIDATING-DATE');
                s.validateDate(cb, () => {
                    //$log.debug('DEBUG-INVALID-DATE ROUTING-TO-RDV');
                    changeRoute(r.URL.RDV)
                });
            }, () => {
                //$log.debug('DEBUG-INVALID-QUESTIONS ROUTING-TO-HOME');
                changeRoute(r.URL.HOME)
            });
        }
        s.validateDate = function(cb, err) {
            ifThenMessage([
                [s.item.start, '==', undefined, ""],
                [s.item.end, '==', undefined, ""],
                [s.item._diag, '==', undefined, ""],
            ], (m) => {
                s.warningMsg("Sélectionner une date");
                if (err) err();
            }, cb);
        }


        s.addressDepartmentCovered = true;
        s.validateAddressDepartment = (cb, err) => {
            var code = s.item.postCode.substring(0, 2);
            //console.info('debug validating address department', code);
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


        s.validateQuestions = validateQuestions;

        function validateQuestions(cb, err) {
            ifThenMessage([
                [s.item.info.buildingState, '==', undefined, MESSAGES.ANSWER_SELL_OR_RENT],
                [s.item.info.buildingType, '==', undefined, MESSAGES.ANSWER_APPARTAMENT_OR_MAISON],
                [s.item.info.squareMeters, '==', undefined, "Répondre Superficie"],
                [s.item.info.constructionPermissionDate, '==', undefined, appText.VALIDATE_CONSTRUCTION_DATE],
                [s.item.info.gasInstallation, '==', undefined, "Répondre Gaz"],
                [s.item.info.electricityInstallation, '==', undefined, "Répondre Electricité"],
                [s.item.address, '==', undefined, appText.VALIDATE_ADDRESS],

                /*
                removed: autocomplete is now limited to france
                [_.includes(['France', 'Francia', 'Frankrig', 'Frankrijk',
                    'Frankreich', 'Frankrike', 'Francja'
                ], s.item.country), '==', false, MESSAGES.FRENCH_ADDRESS_REQUIRED]
                */

            ], (m) => {
                s.warningMsg(m[0], 6000);
                if (err) err();
            }, () => {
                s.validateAddressDepartment(cb, err);
            });
        }



        //DOM CLASS
        s.dateSlotSelected = function(rng) {
            return (s.item.range && (s.item.range == rng.id));
        }


        //DOM HELPERS

        s.orderDateFormattedFromITEM = function() {
            if (!s.item) console.warn('invalid-order');
            var _date = s.item && s.item.start;
            var m = moment(_date).format('dddd D MMMM YYYY');
            m += ' à ' + r.momentTime(_date);
            return m.substring(0, 1).toUpperCase() + m.slice(1);
        };








        s.orderDiagFormattedFromITEM = function() {
            if (!s.item || !s.item.__diag) return '';
            var diag = s.item.__diag;
            return 'Avec ' +
                (((diag && diag.firstName) && diag.firstName + ' ') || '') +
                (((diag && diag.lastName) && diag.lastName.substring(0, 1).toUpperCase() + ' ') || '');
        };

        s.orderDateFormatted = function() {
            if (!s._order) console.warn('invalid-order');
            var _date = s._order && s._order.start;
            var m = moment(_date).format('dddd D MMMM YYYY');
            m += ' à ' + r.momentTime(_date);
            return m.substring(0, 1).toUpperCase() + m.slice(1);
        };
        s.orderDiagFormatted = function() {
            return 'Avec ' +
                (((s._order && s._order._diag && s._order._diag.firstName) && s._order._diag.firstName + ' ') || 'Pepe ') +
                (((s._order && s._order._diag && s._order._diag.lastName) && s._order._diag.lastName.substring(0, 1).toUpperCase() + ' ') || 'G');
        };

        s.$watch('checks.selectAll', function() {
            if (!s.diags) return;
            s.diags.forEach(d => {
                s.item.diags[d.name] = s.checks.selectAll;
            });
        }, true);


        db.ctrl('Settings', 'getAll', {}).then(d => {
            if (d.ok && d.result.length > 0) s.settings = d.result[0];
        });


        /*
                s.htmlReplaceDiagName = function(str) {
                    var code = str.replace('$NAME', s.diagSelected.label2).toUpperCase();
                    return r.html(code);
                }
        */

        function orderPaid() {
            return _.includes($D.ORDER_STATUS_PAID, s._order.status);
        }

        s.orderPaid = orderPaid;

        s.departmentHasTermites = () => {
            if (s.item.department) {
                var code = s.item.postCode.substring(0, 2);
                return _.includes(s.termitesDepartments.map(v => (v.toString())), code);
            }
        };

        s.orderExistsNote = () => {
            if (!s.booking.order.exists) return;
            if (!s.booking.order.saved) return;

            if (s._user.clientType !== 'landlord') {
                if (s._order.landLordPaymentEmailSended == true) {
                    if (!s.booking.order.delegatedTo) {
                        s.booking.order.delegatedTo = s._order.landLordEmail;
                    }
                }
                else {
                    return "The payment of this order is pending.";
                }
            }


            var delegated = 'The payment of this order was delegated to ' + s.booking.order.delegatedTo;
            if (orderPaid()) {
                if (s._order.landLordPaymentEmailSended == true) {
                    return "This order was delegated to " + s.booking.order.delegatedTo + ' and is already paid.';
                }
                else {
                    return "This order is already paid"
                }
            }
            else {
                return delegated;
            }
        };


        //Auto-save Every 5sec, only if _order change.
        function updateAutoSave(enabled) {
            enabled = enabled || true;
            var saving = false;
            if (s.__autoSaveInterval) window.clearInterval(s.__autoSaveInterval);
            if (!enabled) return console.info('auto-save: disabled');
            if (!s._order) return console.info('auto-save: call updateAutoSave _order exists');
            cloneOrder();
            s.__autoSaveInterval = window.setInterval(function() {
                if (saving) return;
                if (!s._order) return; //no order to save;
                var hasChanged = !_.isEqual(s.__clonedOrder, s._order);
                if (hasChanged) {
                    saving = true;
                    cloneOrder();

                    if (s.booking.payment.complete) {
                        //s._order.status = 'prepaid'; //this is done in backend
                    }

                    var o = s._order;
                    db.ctrl('Order', 'update', {
                        _id: o._id,
                        obs: o.obs,
                        landLordFullName: o.landLordFullName,
                        landLordEmail: o.landLordEmail,
                        landLordPhone: o.landLordPhone,
                        landLordAddress: o.landLordAddress,
                        keysAddress: o.keysAddress,
                        keysTimeFrom: o.keysTimeFrom,
                        keysTimeTo: o.keysTimeTo
                    }).then(function() {
                        saving = false;
                        //console.info('auto-save: saved');
                    })
                }
            }, 10000);

            function cloneOrder() {
                s.__clonedOrder = _.cloneDeep(s._order);
            }
        }


        //KEYS WHERE Version2 --------------------------------
        s.__keysWhereItems = {};
        s.__keysWhereGetItems = () => {
            if (!s._user || !s._user.clientType) return {
                'Ou ?': () => '',
            };
            if (s.isLandLord()) {
                return {
                    'Ou ?': () => '',
                    'Sur Place': () => s._order.address,
                    'Votre adresse': () => s._user.address, //when landlord
                    'Other': () => 'other'
                };
            }
            else {
                return {
                    'Ou ?': () => '',
                    'Sur Place': () => s._order.address,
                    'Votre adresse': () => s._user.address, //when not-landlord
                    'Résidence Principal': () => s._order.landLordAddress, //when not-landlord 
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
            s._order.keysWhere = val && val() || undefined;
        };
        s.$watch('_order.keysWhere', function(val) {
            if (val == undefined) {
                r.dom(() => {
                    s._order.keysAddress = 'non disponible';
                });
                r.dom(() => {
                    s._order.keysAddress = undefined;
                }, 2000);
                //
                return s.__keysWhereSelectLabelVal = 'Ou ?';
            }
            Object.keys(s.__keysWhereItems).forEach(k => {
                if (s.__keysWhereItems[k]() == val) {
                    s.__keysWhereSelectLabelVal = k;
                }
            });
            s._order.keysAddress = (val == 'other') ? '' : val;


            r.dom(() => {
                //auto set from
                if (s.__keysWhereSelectLabel() == "Sur Place") {
                    s.__keysTimeFromSelect(r.momentTime(s._order.start), new Date(moment(s._order.start).toString()));
                }
                else {
                    var m = moment(s._order.start).hours(8);
                    s.__keysTimeFromSelect(r.momentTime(m), new Date(m.toString()));
                }
                //auto set to
                if (s.__keysWhereSelectLabel() == "Sur Place") {
                    s.__keysTimeToSelect(r.momentTime(s._order.start), new Date(moment(s._order.start).toString()));
                }
                else {
                    var m = moment(s._order.start).subtract(30, 'minutes');
                    s.__keysTimeToSelect(r.momentTime(m), new Date(m.toString()));
                }
            }, 200);

        });

        //KEYS TIME FROM ------------------------------------------------------------------------------------------------
        s.__keysTimeFromItems = {};
        s.__keysTimeFromGetItems = () => {
            var vals = {};
            if (!s._order) return vals;
            var m = moment(s._order.start).hours(8);
            while (m.isBefore(moment(s._order.start))) {
                vals[r.momentTime(m)] = new Date(m.toString());
                m = m.add(5, 'minutes');
            };
            vals[r.momentTime(s._order.start)] = new Date(moment(s._order.start).toString());


            return vals;
        };
        s.__keysTimeFromSelectFirstItem = () => s.__keysTimeFromItems && Object.keys(s.__keysTimeFromItems)[0] || "Loading";
        s.__keysTimeFromSelectLabel = 'choisir';
        s.__keysTimeFromSelect = (key, val) => {
            s._order.keysTimeFrom = val;
            if (dtAfter(s._order.keysTimeFrom, s._order.keysTimeTo)) {
                s._order.keysTimeTo = undefined;
            }
            s.__keysTimeFromSelectKey = key;
        };
        s.$watch('_order.keysTimeFrom', function(val) {
            if (!val) {
                s.__keysTimeFromSelectLabel = 'choisir';
            }
            else {
                s.__keysTimeFromSelectLabel = 'choisir';
                _.each(s.__keysTimeFromItems, (v, k) => {
                    if (v == val) s.__keysTimeFromSelectLabel = k;
                });
                if (s.__keysTimeFromSelectLabel == 'choisir' && s.__keysTimeFromSelectKey) {
                    s.__keysTimeFromSelectLabel = s.__keysTimeFromSelectKey;
                }
            }

        });
        s.$watch('_order.start', function(val) {
            s.__keysTimeFromItems = s.__keysTimeFromGetItems();
        });


        function dtAfter(d1, d2, unit) {
            return moment(d1).isAfter(moment(d2), unit);
        }

        function dtBefore(d1, d2, unit) {
            return moment(d1).isAfter(moment(d2), unit);
        }


        //KEYS TIME TO ------------------------------------------------------------------------------------------------
        s.__keysTimeToItems = {};
        s.__keysTimeToGetItems = () => {
            var vals = {};
            if (!s._order) return vals;
            var m = moment(s._order.start).hours(8).minutes(0);
            if (
                moment(s._order.keysTimeFrom).isAfter(m) &&
                moment(s._order.keysTimeFrom).isBefore(moment(s._order.start))
            ) {
                m = m.hours(moment(s._order.keysTimeFrom).hours())
                m = m.minutes(moment(s._order.keysTimeFrom).minutes())
            }

            while (m.isBefore(moment(s._order.start))) {
                vals[r.momentTime(m)] = new Date(m.toString());
                m = m.add(5, 'minutes');
            };
            vals[r.momentTime(s._order.start)] = new Date(moment(s._order.start).toString());



            return vals;
        };
        s.__keysTimeToSelectFirstItem = () => s.__keysTimeToItems && Object.keys(s.__keysTimeToItems)[0] || "Loading";
        s.__keysTimeToSelectLabel = 'choisir';
        s.__keysTimeToSelect = (key, val) => {
            s._order.keysTimeTo = val;
            s.__keysTimeToSelectKey = key;
        };
        s.$watch('_order.keysTimeTo', function(val) {
            if (!val) {
                s.__keysTimeToSelectLabel = 'choisir';
            }
            else {
                s.__keysTimeToSelectLabel = 'choisir';
                _.each(s.__keysTimeToItems, (v, k) => {
                    if (v == val) s.__keysTimeToSelectLabel = k;
                });
                if (s.__keysTimeToSelectLabel == 'choisir' && s.__keysTimeToSelectKey) {
                    s.__keysTimeToSelectLabel = s.__keysTimeToSelectKey;
                }
            }

        });
        s.$watch('_order.keysTimeFrom', function(val) {
            s.__keysTimeToItems = s.__keysTimeToGetItems();
        });
        s.$watch('_order.start', function(val) {
            s.__keysTimeToItems = s.__keysTimeToGetItems();
        });
        //-------------------------------------------------------------------------



        //
        r.logger.addControlledErrors([
            "ORDER_EXISTS", "ORDER_TAKEN"
        ]);

        s.datepicker = {
            minDate: moment(), //.add(1, 'day'), //today is available with an increase in price.
            maxDate: moment().add(60, 'day'),
            initDate: new Date()
        };


        s.CLIENT_TYPES = ['agency', 'enterprise', 'landlord', 'other'];
        s.CLIENT_TYPES_COMPANY = ['agency', 'enterprise', 'other'];

        s.isLandLord = () => {
            return !_.includes(s.CLIENT_TYPES_COMPANY, s._user.clientType);
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

        s.__constructionPermissionDateSelectLabel = 'choisir';
        s.__constructionPermissionDateSelect = (key, val) => {
            s.item.info.constructionPermissionDate = val;

        };
        s.$watch('item.info.constructionPermissionDate', function(val) {
            s.__constructionPermissionDateSelectLabel = val ? val : 'choisir';
            r.dom();
        });

        s.__gazSelectLabel = 'choisir';
        s.__gazSelect = (key, val) => {
            s.item.info.gasInstallation = val;
        };
        s.$watch('item.info.gasInstallation', function(val) {
            s.__gazSelectLabel = val ? val : 'choisir';
            r.dom();
        });


        s.diagRightClass = function() {
            var cls = {
                'diag-dialog-right': true,
                //'margin-top-three': true,
                'padding-two': true
            };
            cls['bg-' + s.diagSelected.name] = true;
            return cls;
        };

        s.diagSelected = {};
        s.selectDiag = (d) => s.diagSelected = (typeof d == 'string') ? s.diag[d] : d;
        s.homeOneTitle = () => decodeURI(val(s.diagSelected, 'dialogs.one.title'));
        s.homeOneContent = () => decodeURI(val(s.diagSelected, 'dialogs.one.content'));
        s.homeTwoTitle = () => decodeURI(val(s.diagSelected, 'dialogs.two.title'));
        s.homeTwoContent = () => decodeURI(val(s.diagSelected, 'dialogs.one.content'));
        s.homeThreeTitle = () => decodeURI(val(s.diagSelected, 'dialogs.two.title'));
        s.homeThreeContent = () => decodeURI(val(s.diagSelected, 'dialogs.three.content'));







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
        var diag = (n) => {
            var rta = null;
            s.diags.forEach((diag) => {
                if ((n && diag.name == n)) {
                    rta = diag;
                }
            });
            return rta;
        }
        s.diagLabel = (n, v) => {
            if (!v) return;
            return diag(n).label;
        };



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



        s.lineThrough = (item) => (item.show == false);



        function loadDefaults() {
            ////$log.debug('loadDefaults');
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
                    constructionPermissionDate: param('cpd', s.constructionPermissionDate) || undefined, // 'Entre 1949 et le 01/07/1997',
                    gasInstallation: param('gasInstallation', s.gasInstallation) || 'Oui, Plus de 15 ans', // 'Oui, Moins de 15 ans',
                    electricityInstallation: param('electricityInstallation', s.electricityInstallation) || s.item.info.electricityInstallation || 'Plus de 15 ans' // 'Plus de 15 ans',
                },
                address: param('address') || undefined, // "15 rue L'Hopital Sain Louis",
                postCode: param('postCode') || undefined, // "15 rue L'Hopital Sain Louis",
                date: paramDate('date'),
                time: param('time', ['any']),
                clientType: param('clientType', s.CLIENT_TYPES)
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



        function getOrderPopupData() {
            var keysInfo = (s._order.keysAddress || '(No address)') + ' / ' + r.momentDateTimeWords(s._order.keysTimeFrom) +
                ' - ' + r.momentTime(s._order.keysTimeTo);
            return {
                diagNameConvertion: $D.diagNameConvertion,
                keysInfo: keysInfo,
                _order: s._order,
                _client: s._user
            }
        }



        s.gotoOrderConfirmationScreen = function() {

            r.sessionMetadata({
                booking: {}
            });

            r.routeParams({
                _order: s._order,
                _client: s._user
            });
            changeRoute('order-confirm');
        };

        s.selectedDate = function() {
            return moment(s.item.date).format('DD MMMM YYYY');
        };
        s.drawRange = function(rng) {
            var rta = moment(rng.start).format("HH[h]mm");
            //rta += ' - ' + s.totalPrice(true) + ' €';
            rta += ' - ' + Math.floor(rng.price) + ' €';
            // + ' - ' + moment(rng.end).format("HH[h]mm");
            return rta;
        };



        //----------------------------------------------------------
        s.infoMsg = (msg) => {
            s.notify(msg, {
                type: 'info',
                duration: 5000
            });
        };
        s.warningMsg = (msg) => {
            s.notify(msg, {
                type: 'warning',
                duration: 5000
            });
        };
        s.successMsg = (msg) => {
            s.notify(msg, {
                type: 'success',
                duration: 2000
            });
        };



        s.auth = {
            email: undefined,
            pass: undefined
        };


        s.orderSaved = () => {
            return s._order && s._order._id;
        };
        s.paymentDelegated = () => {
            return s._order.landLordPaymentEmailSended == true;
        };

        s.login = () => {
            s.validateAuthInput(() => {
                db.ctrl('User', 'get', {
                    email: s.auth.email,
                    password: s.auth.pass,
                    userType: 'client'
                }).then(_user => {
                    _user = _user.ok && _user.result || null;
                    if (_user) {
                        s.item.clientType = _user.clientType;
                        s._user = _user;

                        s.validateBeforePayment(function() {
                            //$log.debug('DEBUG-SAVING');
                            s.saveAsync().on('success', function() {
                                //$log.debug('DEBUG-ROUTING-TO-PAYMENT');
                                changeRoute(r.URL.PAYMENT);
                            });
                        }, true);

                        //s.subscribeMode = true;
                        //s.right();

                    }
                    else {
                        s.warningMsg('Invalid credentials');
                    }
                });
            });
        }



        s.invoiceEndOfTheMonth = () => {
            s.validateBooking(() => {
                db.ctrl('Order', 'confirm', s._order).then((d) => {
                    if (d.ok) {
                        s.booking.complete = true;
                        db.ctrl('Order', 'update', s._order); //async
                    }
                });
            });
        };


        s.bookingDescriptionTitle = function(item) {
            item = item || s.item;
            if (!item || !item.info) return '';
            if (item.info.buildingState == '1') return "Pack Vente: ";
            else return "Pack Location: ";
        };
        s.bookingDescriptionBody = function(item) {
            item = item || s.item;
            if (!item || !item.info) return '';
            var rta = "";
            if (item.info.buildingType == '0') {
                rta += "Maison";
            }
            else {
                if (item.info.buildingType == '2') {
                    rta += "Local commercial";
                }
                else {
                    rta += "Appartement";
                }
            }
            if (item.city) {
                rta += " à " + s.item.city;
            }
            if (item.info.constructionPermissionDate) {
                rta += " " + item.info.constructionPermissionDate;
            }
            rta += ', ' + item.info.squareMeters;
            if (!_.includes(['Non', 'Oui, Moins de 15 ans'], item.info.gasInstallation)) {
                rta += ', Gaz';
            }
            if (item.info.electricityInstallation != 'Moins de 15 ans') {
                rta += ", Électricité";
            }
            rta += '.';
            return rta;
        };
        s.bookingDescription = function(item) {
            item = item || s.item;
            return s.bookingDescriptionTitle(item) + s.bookingDescriptionBody(item);
        };


        s.sendPaymentLink = () => {
            s.validateBooking(_sendPaymentLink);

            function _sendPaymentLink() {
                db.ctrl('Order', 'update', s._order); //async
                s.openConfirm({
                    templateUrl: "views/diags/booking/partials/booking-delegate-popup.html",
                    data: {
                        email: s._order.landLordFullName,
                        title: "Confirmer la délégation",

                    }
                }, () => {



                    $D.getInvoiceHTMLContent(db, s._order, r, html => {
                        ////LANDLORD//#1 OK app.booking
                        db.ctrl('Notification', 'LANDLORD_ORDER_PAYMENT_DELEGATED', {
                            _user: s._user,
                            _order: s._order,
                            attachmentPDFHTML: html
                        }).then(data => {
                            //
                            if (!data.ok) {
                                return r.warningMessage("Le courriel ne peut être envoyé à ce moment , d'essayer de nouveau de backoffice", 10000);
                            }
                            s.infoMsg("Commande confirmée", 10000);
                            s._order.notifications = s._order.notifications || {};
                            s._order.notifications.LANDLORD_ORDER_PAYMENT_DELEGATED = true;
                            s._order.status = 'ordered';
                            db.ctrl('Order', 'update', {
                                _id: s._order._id,
                                notifications: s._order.notifications,
                                status: s._order.status
                            });
                            s.booking.complete = true;
                            s.gotoOrderConfirmationScreen();
                        });
                    });

                });
            }
        };



        s.subscribeClientStandAlone = function() {
            s.createClient(function() {
                s.infoMsg('Le compte a été créé . Vérifiez votre email .');
                changeRoute(r.URL.HOME);
            });
        };

        s.subscribeClient = function() {
            s.createClient(function() {
                //s.infoMsg('Le compte a été créé . Vérifiez votre email .');
                s.validateBeforePayment(function() {
                    s.saveAsync().on('success', function() {
                        changeRoute(r.URL.PAYMENT);
                    });
                }, true);
            });
        };

        s.createClient = function(cb) {
            s.validateClientDetails(function() {
                db.ctrl('User', 'createClient', s._user).then(data => {
                    if (data.ok) {
                        s._user = data.result;
                        cb();
                    }
                    else {
                        s.warningMsg(data.err);
                    }
                });
            });
        };

        s.subscribeModeBooking = (clientType) => s.subscribe(clientType, r.URL.ACCOUNT_DETAILS_BOOKING, false);
        s.subscribeMode = (clientType) => s.subscribe(clientType, r.URL.ACCOUNT_DETAILS);

        s.subscribe = (clientType, nextRoute, useAuthCredentials) => {
            useAuthCredentials = useAuthCredentials == undefined ? true : useAuthCredentials;
            if (useAuthCredentials) {
                s.validateAuthInput(_validateEmail);
            }
            else {
                _setAndGo();
            }


            function _validateEmail() {
                db.ctrl('User', 'exists', {
                    email: s.auth.email,
                    userType: 'client',
                }).then(exists => {
                    exists = exists.ok && exists.result == true;
                    if (exists) {
                        s.warningMsg('This email address belongs to an existing member.');
                    }
                    else {
                        _setAndGo();
                    }
                });
            }

            function _setAndGo() {
                if (useAuthCredentials) {
                    s._user.email = s.auth.email;
                    s._user.password = s.auth.pass;
                }
                s._user.clientType = clientType;
                s._user.__subscribeMode = true;
                changeRoute(nextRoute);
            }
        };



        function fetchOrder(_order_id) {
            return $U.MyPromise(function(resolve, err, emit) {
                var payload = Object.assign(s._order, {
                    __populate: {
                        _client: '_id email clientType address discount companyName siret wallet',
                        _diag: '_id email clientType address firstName lastName commission siret wallet'
                    }
                });
                if (_order_id) {
                    payload._id = _order_id;
                }
                db.ctrl('Order', 'getById', payload)
                    .then(d => {
                        if (d.ok) {
                            console.info('fetch-order', payload._id, r.momentDateTime(d.result.start));
                            r.dom(function() {
                                setOrder(d.result);
                            });
                            resolve(s._order);
                        }
                        else {
                            err(d);
                        }
                    });
            });
        }
        s.fetchOrder = fetchOrder;

        function updateOrderPrices(_order) {
            _order = _order || s._order;
            orderPrice.set({
                date: _order.start,
                diagCommissionRate: _order._diag && _order._diag.commission,
                diagIsAutoentrepreneur: s._order._diag && s._order._diag.isAutoentrepreneur
            });
            orderPrice.assignPrices(_order);
        }

        function setOrder(_order) {
            s._order = _order;
            updateOrderPrices(s._order);
            commitOrderInfo();

            r.sessionMetadata({
                booking: {
                    _order: s._order,
                    _user: s._user,
                    item: s.item
                }
            });

            updateAutoSave();
        }

        function commitOrderInfo() {
            if (!s._order) return;
            if (s._order.info.addressBatiment === undefined) {
                s._order.info.addressBatiment = 'Sur rue';
            }
            if (s._order.info.electricityInstallation === undefined && s.item.electricityInstallation !== undefined) {
                s._order.info.electricityInstallation = s.item.electricityInstallation;
            }

            if (!s._order.info.description && s.item) {
                s._order.info.description = s.bookingDescriptionTitle() + s.bookingDescriptionBody();
            }
        }

        function hasDescription(item) {
            return item.info.description;
        }

        function insertDescription(item) {
            item.info.description = s.bookingDescription(item);
            return item;
        }

        //SAVEASYNC
        s.saveAsync = () => {
            return $U.MyPromise(function(resolve, err, evt) {


                if (s._user) {
                    //s.item._client = s._user._id;
                    s.item._client = s._user; //we need the full user ref for price discount calcs.
                    s.item.email = s._user.email;
                    s.item.clientType = s._user.clientType;
                }

                if (s._diag) {
                    s.item._diag = s._diag;
                }
                else {
                    return db.ctrl('User', 'get', {
                        _id: s.item._diag
                    }).then(function(res) {
                        if (res.ok && res.result) {
                            s._diag = res.result;
                            return s.saveAsync().then(resolve).on('success', () => evt('success'));
                        }
                        else {
                            $log.error("Can't fetch the diag guy.");
                        }
                    });
                }

                if (!hasDescription(s.item)) {
                    s.item = insertDescription(s.item);
                }

                //defaults for keysTime
                if (!s.item.keysTimeFrom && s.item.start) {
                    s.item.keysTimeFrom = moment(s.item.start).subtract(2, 'hour');
                }
                if (!s.item.keysTimeTo && s.item.start) {
                    s.item.keysTimeTo = moment(s.item.start);
                }

                //update price
                //s.item.price = s.totalPrice(true);
                updateOrderPrices(s.item);

                if ($U.hasUndefinedProps(s.item, ['_diag', 'start', 'end'])) {
                    s.warningMsg('Select one available date');
                    return changeRoute(r.URL.RDV);
                }

                $log.debug('first-time-saving', _.clone(s.item));

                db.ctrl('Order', 'saveWithEmail', s.item).then(data => {
                    var saved = data.ok;

                    console.info('save-order', data.err);

                    var exists = (data.err === 'ORDER_EXISTS');
                    var taken = (data.err === 'ORDER_TAKEN');
                    if (exists || taken) saved = true;
                    //
                    r.dom(function() {
                        //setOrder(data.result);

                        s._order = data.result;

                        updateAutoSave();
                        if (saved) {
                            evt('success');
                        }
                        if (!saved) {
                            console.warn('save-error', data);
                            return s.warningMsg('An error occured, please try again later');
                        }

                        db.ctrl('Order', 'getById', Object.assign(s._order, {
                                __populate: {
                                    _client: '_id email clientType address discount companyName siret wallet',
                                    _diag: '_id email clientType address firstName lastName commission siret wallet'
                                }
                            }))
                            .then(d => {
                                if (d.ok) {
                                    setOrder(d.result);

                                    // s.keysWhereTime.emit('onItem');
                                }

                            });



                        //
                        if (saved) {
                            //s.successMsg('Order created');
                        }
                        if (exists) {
                            //s.warningMsg('Order already exists.');
                            //s.successMsg('Order retaken');
                        }
                        if (taken) {
                            //s.successMsg("An order with the same address and time is taken by another client. You can't proceed until you change order time or address.");
                        }



                        s._orderSAVED = saved || exists;
                        s.booking.order.saved = saved || exists || taken;
                        s.booking.order.exists = exists;



                        s.booking.order.taken = (taken == true);
                    });
                    //
                }).err(_err => {
                    s.notify('There was a server issue during the order saving proccess. Retrying in 10 seconds. Wait.', {
                        type: 'warning',
                        duration: 100000
                    });
                    setTimeout(s.saveAsync, 10000);
                });
            });
        };

        s.testPayForm = () => {
            db.ctrl('Order', 'get', {
                //status: 'ordered',
                __populate: {
                    _client: '_id email clientType address discount companyName siret wallet',
                    _diag: '_id email clientType address firstName lastName commission siret wallet'
                }
            }).then(function(res) {
                s._order = res.result;
                s._order.status = 'created';
                s.payNOW();
            });
        };

        //require an order to be saved (s._order)
        s.payNOW = (success) => {

            if (orderPaid()) {
                //s.infoMsg('Son ordre de travail a déjà été payée');
                return s.gotoOrderConfirmationScreen();
            }

            s.validateBooking(() => {
                db.ctrl('Order', 'update', s._order); //async
                db.ctrl('User', 'update', s._user); //async
                var order = s._order;
                orderPaymentForm.pay(order).then(function() {
                    s.infoMsg("Commande confirmée", 10000);
                    s._order.status = 'prepaid';
                    s.booking.complete = true;
                    s.booking.payment.complete = true;
                    r.dom(() => {
                        updateAutoSave(false);
                        //$U.url.clear();
                        s.gotoOrderConfirmationScreen();
                    });
                }).error(function(res) {
                    return r.errorMessage('', 10000);
                }).on('validate', function(msg) {
                    return r.warningMessage(msg, 10000);
                });
            });
            //------
        };




        s.getDate = () => {
            return {
                date: moment(s.item.start).format('DD-MM-YY'),
                start: moment(s.item.start).format('HH[h]mm'),
                end: moment(s.item.end).format('HH[h]mm')
            };
        };

        s.subTotal = () => subTotal(s._order, s.diags, s.basePrice);
        s.sizePrice = () => sizePrice(s._order, s.diags, s.squareMetersPrice, s.basePrice);
        s.totalPrice = (showRounded, opt) => totalPrice(showRounded, s._order, s.diags, s.squareMetersPrice, s.basePrice, Object.assign({
            s: s,
            r: r,
            department: s.item.postCode.substring(0, 2)
        }, opt || {}));

        s.totalPriceRange = (dt) => totalPrice(true, s.item, s.diags, s.squareMetersPrice, s.basePrice, Object.assign({
            s: s,
            r: r,
            dt
        }, {}));

        s.pickTimeRange = function(timeRange) {
            s.item.start = timeRange.start;
            s.item._diag = timeRange._diag;
            s.item.end = timeRange.end;
            s.item.price = timeRange.price;
            if (!timeRange.price) {
                console.warn('time-range invalid price attribute', timeRange);
            }
        };

        s.totalTime = function() {
            var total = 0;
            s.item.diags = s.item.diags || {};
            Object.keys(s.item.diags).forEach(function(mkey) {
                if (!s.item.diags[mkey]) return;
                s.diags.forEach(function(dval, dkey) {
                    if (dval.name == mkey) {
                        dval.time = dval.price / 4;
                        total += dval.time || 0;
                        return false;
                    }
                });
            });
            total = parseInt(parseInt(total) / 10, 10) * 10 + 10;
            var hours = Math.floor(total / 60);
            var minutes = total % 60;
            var t = {
                hours: hours,
                minutes: minutes
            };
            //return normalizeOrderTime(t);
            return t;
        };
        s.totalTime.formatted = () => {
            var time = s.totalTime();
            var hours = time.hours,
                minutes = time.minutes;
            minutes = (minutes < 10) ? '0' + minutes : minutes;
            if (hours > 0) {
                return hours + ':' + minutes + ' hours';
            }
            else {
                return minutes + ' minutes';
            }
        };

    }

]);

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
var app = angular.module('app', [
    'app.run',
    'app.services',
    'app.directives',
    'app.static.calendar',
    'ngRoute',
    'ui.bootstrap'
]);
var URL = {
    HOME: 'home',
    DIAGS: 'choix-diagnostics',
    RDV: 'rendez-vous',
    LOGIN: 'connexion',
    NEW_ACCOUNT: 'new-inscription',
    ACCOUNT_DETAILS: 'account-details',
    ACCOUNT_DETAILS_BOOKING: 'inscription-details',
    PAYMENT: 'payment'
};
app.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
        when('/', {
            templateUrl: 'views/booking/booking-1-home.html'
        }).
        when('/home', {
            templateUrl: 'views/booking/booking-1-home.html'
        }).
        when('/choix-diagnostics', {
            templateUrl: 'views/booking/booking-2-diags-selection.html'
        }).
        when('/rendez-vous', {
            templateUrl: 'views/booking/booking-3-date-selection.html'
        }).
        when('/connexion', {
            templateUrl: 'views/booking/booking-4-connection.html'
        }).
        when('/new-inscription', {
            templateUrl: 'views/booking/booking-new-inscription.html'
        }).
        when('/account-details', {
            templateUrl: 'views/booking/booking-inscription-details.html'
        }).
        when('/inscription-details', {
            templateUrl: 'views/booking/booking-5-inscription.html'
        }).
        when('/payment', {
            templateUrl: 'views/booking/booking-6-payment.html'
        }).

        otherwise({
            redirectTo: '/'
        });
    }
]);


app.directive('rangeSlider', function($rootScope, $timeout) {
    return {
        restrict: 'A',
        link: function(scope, el, attrs) {
            //el.replaceWith(el.children());


        }
    };
});

app.controller('ctrl.booking', ['server',
    '$timeout', '$scope', '$rootScope', '$uibModal',
    function(db, $timeout, s, r, $uibModal) {
        r.URL = URL;
        window.r = r;
        window.s = s;
        window.booking = s;
        r.dom(); //compile directives

        moment.locale('fr')


        s.isDevEnv = () => window.location.hostname.indexOf('diags-javoche.c9users.io') !== -1;
        setTimeout(function() {
            if (s.isDevEnv()) {
                s.auth = {
                    email: 'javiermosch@gmail.com',
                    pass: 'agency'
                }
                r.dom();
            };
        }, 3000);


        $U.on('route-change', function(url) {
            console.info('route-change ',url);

            r.dom($U.scrollToTop);
            
            if ($U.indexOf(url, [URL.PAYMENT])) {
                if ((s.__manualUrlChange || 0) + 5000 < new Date().getTime()) {
                    resolvePaymentScreenAuth().then(resolvePaymentScreenOrder);
                }
            }else{
                $U.url.clear();
            }

            if ($U.indexOf(url, [URL.HOME]) || url == ''){
              s.__header = 1;  
            }
            else{
              s.__header = 2;  
            } 

            if (url.indexOf(URL.RDV) !== -1) {


                var cbHell = $U.cbHell(4, function() {
                    console.info('available-dates-retrived');
                    setSelectedRangeDateUsingOrder();
                });

                s.requestSlots(moment()._d).then((d) => {
                    s.slots1 = d;
                    cbHell.next();
                });
                s.requestSlots(moment().add(1, 'days')._d).then((d) => {
                    s.slots2 = d;
                    cbHell.next();
                });
                s.requestSlots(moment().add(2, 'days')._d).then((d) => {
                    s.slots3 = d;
                    cbHell.next();
                });
                s.requestSlots(moment().add(3, 'days')._d).then((d) => {
                    s.slots4 = d;
                    cbHell.next();
                });

                s.slots2Label = moment().add(1, 'days').format('dddd DD MMMM');
                s.slots3Label = moment().add(2, 'days').format('dddd DD MMMM');
                s.slots4Label = moment().add(3, 'days').format('dddd DD MMMM');

            }

            if ($U.indexOf(url, [URL.ACCOUNT_DETAILS])) {
                if (!s._user || !s._user.__subscribeMode) {
                    console.warn('current _user is not in _subscribeMode');
                    r.route(URL.HOME);
                }
                else {
                    delete s._user.__subscribeMode;
                }
            }

        });

        function resolvePaymentScreenAuth() {
            return $U.MyPromise(function(resolve, err, emit) {
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
                            return r.route(URL.LOGIN);
                        }
                    });
                }
                else {
                    return r.route(URL.LOGIN);
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
            }
        };

        s.checks = {
            selectAll: false
        };

        s.validateBeforePayment = function(cb, validateLoginAlso) {
            if (validateLoginAlso && (!s._user || !s._user._id)) return r.route(URL.LOGIN);
            s.validateQuestions(function() {
                s.validateDate(cb, () => r.route(URL.RDV));
            }, () => r.route(URL.HOME));
        }

        //MAIN BUTTONS
        s.proceedToDiagsSelection = function() {

            //s.validateBeforePayment(()=r.route(URL.PAYMENT));

            s.validateQuestions(function() {
                r.route('choix-diagnostics');
            }, () => {
                // r.route('home');
            });
        }
        s.proceedToDateSelection = function() {
            s.validateQuestions(function() {



                r.route('rendez-vous');
            }, () => {
                r.route('home');
            });
        }
        s.proceedToConnect = function() {
            s.validateDate(function() {
                if (s._user && s._user._id) {
                    r.route(URL.PAYMENT);
                }
                else {
                    r.route(URL.LOGIN);
                }

            });
        }

        s.validateDate = function(cb, err) {
            ifThenMessage([
                [s.model.diagStart, '==', undefined, ""],
                [s.model.diagEnd, '==', undefined, ""],
                [s.model._diag, '==', undefined, ""],
            ], (m) => {
                s.warningMsg("Sélectionner une date");
                if (err) err();
            }, cb);
        }

        s.validateQuestions = function(cb, err) {
            ifThenMessage([
                [s.model.sell, '==', undefined, "Vendez / Louer"],
                [s.model.house, '==', undefined, "Appartament / Maison"],
                [s.model.squareMeters, '==', undefined, "Superficie"],
                [s.model.constructionPermissionDate, '==', undefined, "Permis de construire"],
                [s.model.gasInstallation, '==', undefined, "Gaz"],
                [s.model.electricityInstallation, '==', undefined, "Electricité"],
                [s.model.address, '==', undefined, "Address"],
            ], (m) => {
                if (typeof m[0] !== 'string') {
                    s.warningMsg("Répondre " + m[0]())
                }
                else {
                    s.warningMsg("Répondre " + m[0]);
                }
                if (err) err();
            }, cb);
        };

        //DIAG DATE SELECTION -> Get the slot that the user had selected to the right place.
        s.$watch('model.range', function(id) {
            if (!id) return;
            var data = JSON.parse(window.atob(id));
            s.model._diag = data._diag;
            s.model.diagStart = data.start;
            s.model.diagEnd = data.end;
        });

        function setSelectedRangeIDUsingOrder(slots, rngId) {
            if (!$U.val(s._order, '_diag._id')) return;
            if (rngId) return null;
            slots.forEach(v => {
                var data = JSON.parse(window.atob(v.id));
                if (data._diag == s._order._diag || data._diag == s._order._diag._id) {
                    if (data.start == s._order.diagStart && data.end == s._order.diagEnd) {
                        r.dom(function() {
                            s.model.range = v.id;
                            return v.id;
                        });
                    }
                }
            })
        }

        function setSelectedRangeDateUsingOrder() {
            if (!$U.indexOf(r.__route, [URL.RDV])) return;
            var id = setSelectedRangeIDUsingOrder(s.slots1, null);
            id = setSelectedRangeIDUsingOrder(s.slots2, id);
            id = setSelectedRangeIDUsingOrder(s.slots3, id);
            id = setSelectedRangeIDUsingOrder(s.slots4, id);
        }


        //DOM CLASS
        s.dateSlotSelected = function(rng) {
            return (s.model.range && (s.model.range == rng.id));
        }


        //DOM HELPERS

        s.orderDateFormatted = function() {
            if (!s._order) console.warn('invalid-order');
            var _date = s._order && s._order.diagStart;
            var m = moment(_date).format('dddd D MMMM YYYY');
            m += 'à ' + r.momentTime(_date);
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
                s.model.diags[d.name] = s.checks.selectAll;
            });
        }, true);


        db.ctrl('Settings', 'getAll', {}).then(d => {
            if (d.ok && d.result.length > 0) s.settings = d.result[0];
        });


        function orderPaid() {
            return _.includes($D.ORDER_STATUS_PAID, s._order.status);
        }

        s.orderPaid = orderPaid;

        s.departmentHasTermites = () => {
            if (s.model.department) {
                var code = s.model.postCode.substring(0, 2);
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
            if(!enabled) return console.info('auto-save: disabled');
            if (!s._order) return console.info('auto-save: call updateAutoSave _order exists');
            cloneOrder();
            s.__autoSaveInterval = window.setInterval(function() {
                if (saving) return;
                if (!s._order) return; //no order to save;
                var hasChanged = !_.isEqual(s.__clonedOrder, s._order);
                if (hasChanged) {
                    saving = true;
                    cloneOrder();
                    db.ctrl('Order', 'update', s._order).then(function() {
                        saving = false;
                        console.info('auto-save: saved');
                    })
                }
            }, 5000);

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
                    'Diag Address': () => s._order.address,
                    'Client Address': () => s._user.address, //when landlord
                    'Other': () => 'other'
                };
            }
            else {
                return {
                    'Ou ?': () => '',
                    'Diag Address': () => s._order.address,
                    'Agency Address': () => s._user.address, //when not-landlord
                    'Landlord Address': () => s._order.landLordAddress, //when not-landlord 
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
        });

        //KEYS TIME FROM ------------------------------------------------------------------------------------------------
        s.__keysTimeFromItems = {};
        s.__keysTimeFromGetItems = () => {
            var vals = {};
            if (!s._order) return vals;
            var m = moment(s._order.diagStart).hours(8);
            while (m.isBefore(moment(s._order.diagStart))) {
                vals[r.momentTime(m)] = new Date(m.toString());
                m = m.add(5, 'minutes');
            };
            vals[r.momentTime(s._order.diagStart)] = new Date(moment(s._order.diagStart).toString());
            return vals;
        };
        s.__keysTimeFromSelectFirstItem = () => s.__keysTimeFromItems && Object.keys(s.__keysTimeFromItems)[0] || "Loading";
        s.__keysTimeFromSelectLabel = 'choisir';
        s.__keysTimeFromSelect = (key, val) => {
            s._order.keysTimeFrom = val;
            if (dtAfter(s._order.keysTimeFrom, s._order.keysTimeTo)) {
                s._order.keysTimeTo = undefined;
            }
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
            }

        });
        s.$watch('_order.diagStart', function(val) {
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
            var m = moment(s._order.diagStart).hours(8).minutes(0);
            if (
                moment(s._order.keysTimeFrom).isAfter(m) &&
                moment(s._order.keysTimeFrom).isBefore(moment(s._order.diagStart))
            ) {
                m = m.hours(moment(s._order.keysTimeFrom).hours())
                m = m.minutes(moment(s._order.keysTimeFrom).minutes())
            }

            while (m.isBefore(moment(s._order.diagStart))) {
                vals[r.momentTime(m)] = new Date(m.toString());
                m = m.add(5, 'minutes');
            };
            vals[r.momentTime(s._order.diagStart)] = new Date(moment(s._order.diagStart).toString());
            return vals;
        };
        s.__keysTimeToSelectFirstItem = () => s.__keysTimeToItems && Object.keys(s.__keysTimeToItems)[0] || "Loading";
        s.__keysTimeToSelectLabel = 'choisir';
        s.__keysTimeToSelect = (key, val) => {
            s._order.keysTimeTo = val;
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
            }

        });
        s.$watch('_order.keysTimeFrom', function(val) {
            s.__keysTimeToItems = s.__keysTimeToGetItems();
        });
        s.$watch('_order.diagStart', function(val) {
            s.__keysTimeToItems = s.__keysTimeToGetItems();
        });
        //-------------------------------------------------------------------------


        s.keysWhereTime = {
            invalidKeysTimeMessage: () => {
                var startTime = () => moment(s._order.diagStart).format('HH:mm');
                return 'Keys time should be between 8:00 and ' + startTime();
            },
            invalidKeysTime: () => {
                var before = (d1, h) => moment(d1).isBefore(moment(d1).hours(8));
                var diag = {
                    hours: moment(s._order.diagStart).hours(),
                    minutes: moment(s._order.diagStart).minutes()
                };
                var after = (d1) => moment(d1).isAfter(moment(d1).hours(diag.hours).minutes(diag.minutes));
                var tfrom = s._order.keysTimeFrom;
                var tto = s._order.keysTimeTo;
                if (!tfrom || before(tfrom) || after(tfrom)) {
                    console.warn('invalidKeysTime from', (!tfrom), before(tfrom), after(tfrom));
                    return true;
                }
                if (!tto || before(tto) || after(tto)) {
                    console.warn('invalidKeysTime to', (!tto), before(tto), after(tto));
                    return true;
                }
                if (tto && tfrom && moment(tto).isBefore(moment(tfrom))) {
                    console.warn('invalidKeysTime from <- to required.');
                    return true;
                }

                return false;
            },
            emit: function(n) {
                var self = this;
                var arr = self.evts[n] || [];
                arr.forEach(evt => (evt(self)))
            },
            evts: {
                onItem: [(self) => {
                    s.keysWhereTime.updateItems(self);
                }]
            },
            mstep: 15,
            hstep: 1,
            address: '',
            scope: s,
            val: undefined,
            disabled: () => r.state.working(),
            cls: () => ({
                btn: true,
                'btn-default': true
            }),
            filterWatch: '_order',
            filter: (v) => {
                if (s._order && s._order._client && s._order._client.clientType) {
                    if (s._order._client.clientType !== 'agency') {
                        if (v.val == 'agency') {
                            return false;
                        }
                    }
                }
                return true;
            },
            label: '(Select where)',
            modelPath: '_order.keysWhere',
            items: [],
            updateItems: ((self) => {
                var o = [{
                    label: () => s._order && s._order.address || 'Diag Address',
                    val: 1,
                    get: () => s._order && s._order.address
                }];
                if (s._order._client && s._order._client.clientType == 'agency') {
                    o.push({
                        label: () => s._user.address || 'Agency address',
                        val: 3,
                        get: () => s._user.address || ''
                    }, {
                        label: () => s._order.landLordAddress || 'Landlord address',
                        val: 4,
                        disabled: () => !s._order.landLordAddress,
                        get: () => s._order.landLordAddress || ''
                    }); //when agency / other
                }
                else {
                    o.push({
                        label: () => s._user.address || 'Client address',
                        val: 3,
                        get: () => s._user.address || ''
                    }); //when landlord
                }
                self.items = o;
            }),
            change: (v, self, setOldValue) => {
                if (!v) return;
                var address = v.get();
                if (!address) {
                    s.notify('Address not found', {
                        type: 'warning',
                        duration: 5000,
                        clickDismissable: true
                    });
                    self.val = undefined;
                    setOldValue();
                    return;
                }
                if (s._order.keysAddress && s._order.keysAddress == address) {
                    if (!s._order.keysTime) {
                        s._order.keysTime = moment(s._order.diagStart).hours(8).minutes(0)._d;
                    }
                    return;
                }
                else {
                    s._order.keysAddress = address;
                }

            }
        };

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
        s.CLIENT_TYPES_COMPANY = ['agency', 'enterprise'];
        s.isLandLord = () => {
            return !_.includes(s.CLIENT_TYPES_COMPANY, s._user.clientType);
        }
        s.isAgency = () => {
            return !s.isLandLord();
        };

        s.model = {
            date: undefined,
            diags: {},
            clientType: 'landlord'
        };



        s.validModel = () => {
            var isValid = true &&
                (true && s.model.sell !== undefined) &&
                (true && s.model.house !== undefined) &&
                //
                //(true && s.model.house && s.model.squareMeters) &&
                //(true && s.model.house == false && !s.model.apartamentType) &&

                //deprecated: now there is only squareMeters (for house and apartment)
                //((true && s.model.house == true && s.model.squareMeters) || (true && s.model.house == false && s.model.apartamentType)) &&
                (true && s.model.squareMeters || false) &&


                (true && s.model.constructionPermissionDate || false) &&
                (true && s.model.gasInstallation || false) &&
                (true && s.model.electricityInstallation || false) &&
                (true && s.model.address || false) &&
                (true && s.model.diagStart || false) &&
                (true && s.model.diagEnd || false) &&
                true;
            return isValid;
        };




        var waitForProperties = (cbArray, props) => {
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
        };

        s.__constructionPermissionDateSelectLabel = 'choisir';
        s.__constructionPermissionDateSelect = (key, val) => {
            s.model.constructionPermissionDate = val;

        };
        s.$watch('model.constructionPermissionDate', function(val) {
            s.__constructionPermissionDateSelectLabel = val ? val : 'choisir';
            r.dom();
        });

        s.__gazSelectLabel = 'choisir';
        s.__gazSelect = (key, val) => {
            s.model.gasInstallation = val;
        };
        s.$watch('model.gasInstallation', function(val) {
            s.__gazSelectLabel = val ? val : 'choisir';
            r.dom();
        });



        s.diagSelected = {};
        s.selectDiag = (d) => s.diagSelected = (typeof d == 'string') ? s.diag[d] : d;
        s.homeOneTitle = () => decodeURI(val(s.diagSelected, 'dialogs.one.title'));
        s.homeOneContent = () => decodeURI(val(s.diagSelected, 'dialogs.one.content'));
        s.homeTwoTitle = () => decodeURI(val(s.diagSelected, 'dialogs.two.title'));
        s.homeTwoContent = () => decodeURI(val(s.diagSelected, 'dialogs.one.content'));
        s.homeThreeTitle = () => decodeURI(val(s.diagSelected, 'dialogs.two.title'));
        s.homeThreeContent = () => decodeURI(val(s.diagSelected, 'dialogs.three.content'));

        db.localData().then(function(data) {
            Object.assign(s, data);

            //accessors for diags
            s.diag = s.diag || {};
            s.diags.forEach(diag => {
                s.diag[diag.name] = diag;
            });
            s.diagSelected = s.diag.dpe;






            updateChecksVisibilityOnDemand();
            waitForProperties([loadDefaults, scrollToAnchor, r.dom], ['notify']);
        });

        function scrollToAnchor() {
            try {
                if ($.hrefAnchor()) {
                    $.fn.fullpage.moveTo($.hrefAnchor());
                }
            }
            catch (e) {

            }
        }



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
        s.diagPrice = (n, v) => {
            if (!v) return;
            return diag(n).price;
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

        function toggleMandatory(n, val) {
            s.diags.forEach((diag) => {
                if ((n && diag.name == n) || !n) {
                    diag.show = val;
                    if (diag.show == false) {
                        s.model.diags[diag.name] = false;
                    }
                }
            });
        }

        s.lineThrough = (item) => (item.show == false);

        function updateChecksVisibilityOnDemand() {
            var toggle = (n, val) => {
                s.diags.forEach((diag) => {
                    if ((n && diag.name == n) || !n) {
                        diag.show = val;
                        if (diag.show == false) {
                            s.model.diags[diag.name] = false;
                        }
                    }
                });
            };
            s.diags.forEach(function(val, key) {
                s.model.diags[val.name] = (val.mandatory) ? true : false;
            });

            s.$watch('model.constructionPermissionDate', updateChecks);
            s.$watch('model.sell', updateChecks);
            s.$watch('model.gasInstallation', updateChecks);
            s.$watch('model.address', updateChecks);
            s.$watch('model.electricityInstallation', updateChecks);

            function updateChecks() {
                if (s.model.constructionPermissionDate === 'avant le 01/01/1949') {
                    toggle('crep', true);
                    s.model.diags.crep = true; //mandatory
                    toggleMandatory('crep', true);
                }
                else {
                    s.model.diags.crep = false; //
                    toggle('crep', true);
                    toggleMandatory('crep', false);
                }

                if (s.departmentHasTermites()) {
                    toggle('termites', true);
                    s.model.diags.termites = true;
                    toggleMandatory('termites', true);
                }
                else {
                    toggle('termites', false);
                    s.model.diags.termites = false;
                    toggleMandatory('termites', false);
                }

                if (_.includes(['avant le 01/01/1949', 'entre 1949 et le 01/07/1997'], s.model.constructionPermissionDate)) {
                    toggle('dta', true);
                    s.model.diags.dta = true; //mandatory
                    toggleMandatory('dta', true);
                }
                else {
                    toggle('dta', true);
                    s.model.diags.dta = false;
                    toggleMandatory('dta', false);
                }

                if (_.includes(['Oui, Plus de 15 ans', 'Oui, Moins de 15 ans'], s.model.gasInstallation)) {
                    toggle('gaz', true);
                    if (s.model.sell == true && s.model.gasInstallation === 'Oui, Plus de 15 ans') {
                        s.model.diags.gaz = true;
                        toggleMandatory('gaz', true);
                    }
                    else {
                        s.model.diags.gaz = false;
                        toggleMandatory('gaz', false);
                    }
                }
                else {
                    toggle('gaz', false);
                    toggleMandatory('gaz', false);
                }
                if (_.includes(['Plus de 15 ans', 'Moins de 15 ans'], s.model.electricityInstallation)) {
                    toggle('electricity', true);
                    if (s.model.sell == true && s.model.electricityInstallation === 'Plus de 15 ans') {
                        s.model.diags.electricity = true;
                        toggleMandatory('electricity', true);
                    }
                    else {
                        s.model.diags.electricity = false;
                        toggleMandatory('electricity', false);
                    }
                }
                else {
                    toggle('electricity', false);
                    toggleMandatory('electricity', false);
                }

            }
            toggle(undefined, true); //all checks visibles.
        }

        function loadDefaults() {
            s.model = Object.assign(s.model, {
                sell: paramBool('sell') || false,
                house: paramBool('house') || undefined,
                squareMeters: param('squareMeters', s.squareMeters) || undefined, // '- de 20m²',
                // apartamentType: param('apartamentType', s.apartamentType) || undefined,
                constructionPermissionDate: param('cpd', s.constructionPermissionDate) || undefined, // 'Entre 1949 et le 01/07/1997',
                address: param('address') || undefined, // "15 rue L'Hopital Sain Louis",
                gasInstallation: param('gasInstallation', s.gasInstallation) || undefined, // 'Oui, Moins de 15 ans',
                electricityInstallation: param('electricityInstallation', s.electricityInstallation) || undefined, // 'Plus de 15 ans',
                date: paramDate('date'),
                time: param('time', ['any']),
                clientType: param('clientType', s.CLIENT_TYPES)
            });
            $U.emitPreserve('booking-defaults-change');

            s.diags.forEach((diag) => {
                var val = paramBool(diag.name);
                if (!_.isUndefined(val) && !_.isNull(val)) {
                    s.model.diags[diag.name] = val;
                }
            });
        }


        s.requestSlots = function(date) {
            return $U.MyPromise(function(resolve, error, evt) {
                if (!isFinite(new Date(date))) return; //invalid
                //if sunday, skip
                if (moment(date).day() === 0) {
                    s.warningMsg('Sunday is an exception.');
                    r.dom(() => {
                        s.model.date = moment(s.model.date).subtract(1, 'days')._d;
                    }, 1000);
                    return;
                }
                var time = s.totalTime();
                var order = {
                    day: date,
                    time: time
                };
                db.getAvailableRanges(order).then(function(data) {
                    //console.log('slots', data);
                    data = data.length > 0 && data || null;
                    if (s.model.time == 'any') {
                        if (data && s.availableTimeRanges.length > 0) {
                            s.pickTimeRange(data[0]);
                        }
                    }
                    if (!data) return;
                    var cbHell = $U.cbHell(data.length, function() {
                        //   console.log('slots-ok', data);
                        resolve(data);
                    });

                    data.forEach(r => {

                        r.id = window.btoa(JSON.stringify(r));

                        db.ctrl('User', 'get', {
                            _id: r._diag
                        }).then(d => {
                            if (d.ok && d.result) {
                                r.name = d.result.firstName + ', ' + d.result.lastName.substring(0, 1);
                                if (d.result.diagPriority) {
                                    r.name += ' (' + d.result.diagPriority + ')';
                                }
                                cbHell.next();
                            }
                        });
                    });
                });
            });
        };


        //----------------------------------------------------------
        s.$watch('model.date', function(date) {
            s.requestSlots(date);
        });
        s.moveTo = (n) => {
            $.fn.fullpage.moveTo(n);
        };
        s.left = () => ($.fn.fullpage.moveSlideLeft());
        s.right = () => ($.fn.fullpage.moveSlideRight());
        s.down = function(force) {

            var curr = $.hrefAnchor();
            var anchors = ['question1', 'question2', 'question3', 'question4', 'question5', 'question6', 'question7', 'diags', 'calendar-timepicker', 'confirm-order'];
            var req = {
                'question1': () => (true && s.model.sell !== undefined),
                'question2': () => (true && s.model.house !== undefined),
                //'question3': () => ((true && s.model.house == true && s.model.squareMeters) ||(true && s.model.house == false && s.model.apartamentType)),
                'question3': () => (true && s.model.squareMeters),
                'question4': () => (true && s.model.constructionPermissionDate),
                'question5': () => (true && s.model.address),
                'question6': () => (true && s.model.gasInstallation),
                'question7': () => (true && s.model.electricityInstallation),
                'diags': () => false,
                'calendar-timepicker': () => (true && s.model.diagStart) && (true && s.model.diagEnd),
                'confirm-order': () => false
            };
            var nextInvalidAnchor = (curr) => {
                var index = _.indexOf(anchors, curr);
                if (index + 1 == anchors.length) return curr;
                index++;
                for (var section in req) {
                    if (req[anchors[index]]()) index++;
                    else return anchors[index];
                }
            };
            if (force == true) {
                $.fn.fullpage.moveSectionDown();
            }
            else {
                s.moveTo(nextInvalidAnchor(curr));
            }

            //$.fn.fullpage.moveSectionDown();
        };
        s.up = function() {
            $.fn.fullpage.moveSectionUp();
        };
        s.selectedDate = function() {
            return moment(s.model.date).format('DD MMMM YYYY');
        };
        s.drawRange = function(rng) {
            var rta = moment(rng.start).format("HH[h]mm");
            rta += ' - ' + s.totalPrice(true) + ' €';
            // + ' - ' + moment(rng.end).format("HH[h]mm");
            return rta;
        };

        s.onModelChange = function(a, b, c) {
            //            console.info(s.model);
        };
        s.$watch('model', s.onModelChange, true);


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

        s.auto = () => {
            //console.log('auto');
            //r.dom(() => s.moveTo('confirm-and-save'), 0);
            //r.dom(() => s.right(), 2000);
            //r.dom(() => s.login(), 4000);
            //s.hideNav();
            s.stateTo('connect');
            s.auth = {
                email: 'javiermosch@gmail.com',
                pass: 'agency'
            };
            s.login();
        };


        s.auth = {
            email: undefined,
            pass: undefined
        };
        s.validateAuthInput = (cb) => {

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
                        s.model.clientType = _user.clientType;
                        s._user = _user;

                        s.validateBeforePayment(function() {
                            s.saveAsync().on('success', function() {
                                s.route(URL.PAYMENT);
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

        s.backToBookingQuestions = () => {
            s.moveTo('question5');
            $('#fp-nav').toggle(true) //nav on again
            s.left();
        };
        s.slideToAuth = () => {
            if (s.subscribeMode) {
                s.saveAsync();
            }
            s.hideNav();
            s.right();
        }

        s.validateBooking = (cb) => {
            ifThenMessage([
                [s.isAgency() && !s._order.landLordEmail, '==', true, "Landlord Email required."],
                [s.isAgency() && !s._order.landLordFullName, '==', true, "Landlord Name required."],
                [!s._order.keysAddress, '==', true, 'Keys Address required.'],
                [!s._order.keysTimeFrom, '==', true, 'Keys Time From  required.'],
                [!s._order.keysTimeTo, '==', true, 'Keys Time To required.'],

                [s.keysWhereTime.invalidKeysTime(), '==', true, s.keysWhereTime.invalidKeysTimeMessage],

            ], (m) => {
                if (typeof m[0] !== 'string') {
                    s.warningMsg(m[0]());
                }
                else {
                    s.warningMsg(m[0]);
                }
            }, cb);
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


        s.sendPaymentLink = () => {
            s.validateBooking(_sendPaymentLink);
            //
            function _sendPaymentLink() {
                db.ctrl('Order', 'update', s._order); //async

                s.openConfirm('You want to send a payment link to ' + s._order.landLordEmail + ' ?', () => {
                    s.infoMsg("Sending email.");
                    db.ctrl('Email', 'orderPaymentLink', s._order).then(data => {
                        s.infoMsg("Email sended to the landlord. Check the back-office to track your order status.");
                        s._order.landLordPaymentEmailSended = true;
                        db.ctrl('Order', 'update', {
                            _id: s._order._id,
                            landLordPaymentEmailSended: true
                        }); //async
                        s.booking.complete = true; //
                    });
                });
            }
        };

        /*deprecated 
                s.subscribeMode = false;
                s.subscribeConfirm = () => {
                    var addressMessage = () => {
                        if (s._user.clientType == 'landlord') return 'Address required.';
                        if (s._user.clientType == 'agency') return 'Agency address required.';
                        if (s._user.clientType == 'other') return 'Company address required.';
                    };
                    ifThenMessage([
                        [!s._user.address, '==', true, addressMessage],
                        [!s._user.email, '==', true, "Email required."],
                        [!s._user.password, '==', true, "Password required."],
                        [!s._user.fixedTel && !s._user.cellPhone, '==', true, "at least one fixed phone or cell phone is required."],
                    ], (m) => {
                        if (typeof m[0] !== 'string') {
                            s.warningMsg(m[0]())
                        }
                        else {
                            s.warningMsg(m[0]);
                        }
                    }, () => {
                        db.setAsync().ctrl('User', 'update', s._user).then(() => {}); //async (we don't want to wait here).
                        s.right();
                    });


                };
                */

        s.validateClientDetails = function(cb) {
            db.ctrl('User', 'exists', {
                email: s.auth.email,
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

        s.subscribeClientStandAlone = function() {
            s.createClient(function() {
                s.infoMsg('Le compte a été créé . Vérifiez votre email .');
                r.route(URL.HOME);
            })
        }

        s.subscribeClient = function() {
            s.createClient(function() {
                //s.infoMsg('Le compte a été créé . Vérifiez votre email .');
                s.validateBeforePayment(function() {
                    s.saveAsync().on('success', function() {
                        s.route(URL.PAYMENT);
                    });
                }, true);
            });
        }

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
                })
            });
        }

        s.subscribeModeBooking = (clientType) => s.subscribe(clientType, URL.ACCOUNT_DETAILS_BOOKING);
        s.subscribeMode = (clientType) => s.subscribe(clientType, URL.ACCOUNT_DETAILS);

        s.subscribe = (clientType, nextRoute) => {
            s.validateAuthInput(() => {
                db.ctrl('User', 'exists', {
                    email: s.auth.email,
                    userType: 'client',
                }).then(exists => {
                    exists = exists.ok && exists.result == true;
                    if (exists) {
                        s.warningMsg('This email address belongs to an existing member.');
                    }
                    else {
                        s._user.email = s.auth.email;
                        s._user.password = s.auth.pass;
                        s._user.clientType = clientType;
                        s._user.__subscribeMode = true;
                        r.route(nextRoute);
                    }
                });
            });
        };


        s.goRightAndHideNav = () => {
            s.openConfirm('You are sure to continue?. You cannot modified Order time and selected inspections after this point', () => {
                s.hideNav();
                s.right();
            });
        };

        s.hideNav = () => {
            r.dom(() => {
                $('#fp-nav').toggle(false);
            })
        };
        s.showNav = () => {
            r.dom(() => {
                $('#fp-nav').toggle(true);
            })
        };


        function fetchOrder(_order_id) {
            return $U.MyPromise(function(resolve, err, emit) {
                var payload = Object.assign(s._order, {
                    __populate: {
                        _client: '_id email clientType address',
                        _diag: '_id email clientType address firstName lastName'
                    }
                });
                if (_order_id) {
                    payload._id = _order_id;
                }
                db.ctrl('Order', 'getById', payload)
                    .then(d => {
                        if (d.ok) {
                            console.info('fetch-order', payload._id, r.momentDateTime(d.result.diagStart));
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

        function setOrder(_order) {
            s._order = _order;
            commitOrderInfo();
            updateAutoSave();
        }

        function commitOrderInfo() {
            if (!s._order) return;
            s._order.info = Object.assign(s._order.info, {
                house: $U.val(s.model, 'house') || s._order.info.house,
                sell: $U.val(s.model, 'sell') || s._order.info.sell
            });
        }

        //SAVEASYNC
        s.saveAsync = () => {
            return $U.MyPromise(function(resolve, err, evt) {


                if (s._user) {
                    //s.model._client = s._user._id;
                    s.model._client = s._user; //we need the full user ref for price discount calcs.
                    s.model.email = s._user.email;
                    s.model.clientType = s._user.clientType;
                }

                //defaults for keysTime
                if (!s.model.keysTimeFrom && s.model.diagStart) {
                    s.model.keysTimeFrom = moment(s.model.diagStart).subtract(2, 'hour');
                }
                if (!s.model.keysTimeTo && s.model.diagStart) {
                    s.model.keysTimeTo = moment(s.model.diagStart);
                }

                //update price
                s.model.price = s.totalPrice(true);

                if ($U.hasUndefinedProps(s.model, ['_diag', 'diagStart', 'diagEnd'])) {
                    s.warningMsg('Select one available date');
                    return r.route(URL.RDV);
                }

                db.ctrl('Order', 'saveWithEmail', s.model).then(data => {
                    var saved = data.ok;

                    console.info('save-order', data.err)

                    var exists = (data.err === 'ORDER_EXISTS');
                    var taken = (data.err === 'ORDER_TAKEN');
                    if (exists || taken) saved = true;
                    //
                    r.dom(function() {
                        setOrder(data.result);

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
                                    _client: '_id email clientType address',
                                    _diag: '_id email clientType address firstName lastName'
                                }
                            }))
                            .then(d => {
                                if (d.ok) {
                                    setOrder(d.result);

                                    s.keysWhereTime.emit('onItem');
                                }

                            });



                        //
                        if (saved) {
                            s.successMsg('Order created');
                        }
                        if (exists) {
                            //s.warningMsg('Order already exists.');
                            s.successMsg('Order retaken');
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
                }).err(err => {
                    s.notify('There was a server issue during the order saving proccess. Retrying in 10 seconds. Wait.', {
                        type: 'warning',
                        duration: 100000
                    });
                    setTimeout(s.saveAsync, 10000);
                });
            });
        };






        //require an order to be saved (s._order)
        s.payNOW = (success) => {
            
            if(orderPaid()){
                return s.infoMsg('Son ordre de travail a déjà été payée');
            }
            
            s.validateBooking(() => {
                //
                db.ctrl('Order', 'update', s._order); //async
                db.ctrl('User', 'update', s._user); //async
                //
                var order = s._order;
                openStripeModalPayOrder(order, (token) => {
                    order.stripeToken = token.id;
                    db.ctrl('Order', 'pay', order).then((data) => {
                        if (data.ok) {

                            s._order.status = 'prepaid';

                            s.booking.complete = true;
                            s.booking.payment.complete = true;
                            db.ctrl('Order', 'update', s._order); //async
                            console.info('PAY-OK', data.result);
                            s.notify('Order payment success. We send you an email.', {
                                type: 'success',
                                duration: 100000
                            });

                            r.dom(()=>(s._order = {}));
                            updateAutoSave(false);
                            $U.url.clear();
                            r.route(URL.HOME);
                        }
                        else {
                            console.info('PAY-FAIL', data.err);
                            s.notify('There was a server issue during the payment proccess. You pay later from the back-office.', {
                                type: 'warning',
                                duration: 100000
                            });
                        }
                    }).error(() => {
                        s.notify('There was a server issue during the payment proccess. You pay later from the back-office.', {
                            type: 'warning',
                            duration: 100000
                        });
                    });
                });
                //
            });
            //------
        };

        function _payOrder(order) {
            openStripeModalPayOrder(order, (token) => {
                order.stripeToken = token.id;
                db.ctrl('Order', 'pay', order).then((data) => {
                    if (data.ok) {
                        _modalSuccess();
                        console.info('PAY-OK', data.result);
                        s.notify('Order created and paid. We send you an email.', {
                            type: 'success',
                            duration: 100000
                        });
                    }
                    else {
                        console.info('PAY-FAIL', data.err);
                        s.notify('There was a server issue during the payment proccess, but your Order has been created. Check your email for more information.', {
                            type: 'warning',
                            duration: 100000
                        });
                    }
                }).error(() => {
                    s.notify('There was a server issue during the payment proccess, but your Order has been created. Check your email for more information.', {
                        type: 'warning',
                        duration: 100000
                    });
                });
            });
        }

        s.confirm = function() {

            db.ctrl('User', 'get', {
                email: s.model.email,
                userType: 'client',
                //clientType: 'landlord'
            }).then(_modal)


            function _modal(_userResponse) {
                var _user = _userResponse.ok && _userResponse.result || null;
                if (_user) {
                    s._user = _user;
                    s.model.clientType = _user.clientType;
                }

                var url = 'views/directives/directive.modal.confirm.order.as.agency.html'
                if (!_user && s.model.clientType === 'landlord') {
                    url = url.replace('agency', 'landlord');
                }
                else {
                    if (_user.clientType === 'landlord') {
                        url = url.replace('agency', 'landlord');
                    }
                }
                s.openConfirm({
                    templateUrl: url,
                    data: {
                        total: s.totalPrice(true),
                        clientType: s.clientType[s.model.clientType],
                        hasUser: _userResponse.ok && _userResponse.result !== null,
                        _user: _userResponse.result
                    }
                }, () => {
                    _saveOrder(isLandlord());
                });
            }

            function _modalSuccess() {
                s.openConfirm({
                    templateUrl: 'views/directives/directive.modal.order.created.html',
                    data: {
                        email: s.model.email
                    }
                }, () => {
                    window.location.href = window.location.origin; //reset
                });
            }

            function _modalInfo(msg, cb) {
                s.openConfirm({
                    templateUrl: 'views/directives/directive.modal.ok.html',
                    message: msg
                });
            }



            function _saveOrder(payAfterSave) {
                var data = _.clone(s.model);
                data._client = data._client.id || data._client;
                db.custom('order', 'saveWithEmail', data).then(function(res) {
                    if (res.data.ok) {
                        //showModal('Detailed information was send to ' + s.model.email);
                        if (payAfterSave) {
                            _payOrder(res.data.result);
                        }
                        else {
                            //agency
                            s.notify('Order created. We send you an email.', {
                                type: 'success',
                                duration: 100000
                            });
                        }
                        s._orderSAVED = true;
                        console.info('ORDER:SAVE:SUCCESS', res.data);
                    }
                    else {
                        if (res.data.err === 'ORDER_EXISTS') {
                            //if landlord && if payment pending (paymodal)
                            var _order = res.data.result;
                            if (isLandlord() && !_.includes(['prepaid', 'completed'], _order.status)) {
                                return _payOrder(_order);
                            }
                            else {
                                var backOffice = '<a target="_blank" href="' + location.origin + '/admin#/orders/edit/' + _order._id + '">View Order</a>';
                                _modalInfo('A similar order is alredy associated to the email you enter: ' + s.model.email + '.<br>' + backOffice + ' in our back-office.');
                            }

                            //_modalInfo('An order with same address / start/ end is alredy associated to ' + s.model.email);
                        }
                        else {
                            console.info('ORDER:SAVE:ISSUES', res.data);
                            s.notify('There was a server issue. Try again later.', {
                                type: 'warning',
                                duration: 10000
                            });
                        }

                    }
                }).error(function(res) {
                    console.warn('ORDER:SAVE:ERROR', res);
                    s.notify('There was a server issue. Try again later.', {
                        type: 'warning',
                        duration: 10000
                    });
                });
            }

            function _after() {

            }
        };


        s.getDate = () => {
            return {
                date: moment(s.model.diagStart).format('DD-MM-YY'),
                start: moment(s.model.diagStart).format('HH[h]mm'),
                end: moment(s.model.diagEnd).format('HH[h]mm')
            };
        };

        s.subTotal = () => subTotal(s.model, s.diags, s.basePrice);
        s.sizePrice = () => sizePrice(s.model, s.diags, s.squareMetersPrice, s.basePrice);
        s.totalPrice = (showRounded) => totalPrice(showRounded, s.model, s.diags, s.squareMetersPrice, s.basePrice, {
            s: s
        });

        s.pickTimeRange = function(timeRange) {
            s.model.diagStart = timeRange.start;
            s.model._diag = timeRange._diag;
            s.model.diagEnd = timeRange.end;
        };

        s.totalTime = function() {
            var total = 0;
            s.model.diags = s.model.diags || {};
            Object.keys(s.model.diags).forEach(function(mkey) {
                if (!s.model.diags[mkey]) return;
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

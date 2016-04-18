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
var app = angular.module('app', [
    'app.run',
    'app.services',
    'app.directives',
    'app.static.calendar',
    'ngRoute',
    'ui.bootstrap'
]);
var URL = {
    HOME:'home',
    DIAGS:'choix-diagnostics',
    RDV: 'rendez-vous',
    LOGIN:'connexion',
    SUBSCRIBE:'subscribe',
    PAYMENT:'payment'
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
        

        $U.on('route-change', function(url) {
            if (url == URL.HOME || url == '') s.__header = 1;
            else s.__header = 2;

            if (url == URL.RDV) {
                s.requestSlots(moment()._d).then((d) => s.slots1 = d);
                s.requestSlots(moment().add(1, 'days')._d).then((d) => s.slots2 = d);
                s.requestSlots(moment().add(2, 'days')._d).then((d) => s.slots3 = d);
                s.requestSlots(moment().add(3, 'days')._d).then((d) => s.slots4 = d);
               
               s.slots2Label = moment().add(1, 'days').format('dddd DD MMMM');
               s.slots3Label = moment().add(2, 'days').format('dddd DD MMMM');
               s.slots4Label = moment().add(3, 'days').format('dddd DD MMMM');
               
            }
        });

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


        //MAIN BUTTONS
        s.proceedToDiagsSelection = function() {
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
                if (!s._order) {
                    s.saveAsync();
                    console.info('You are able to connect');
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
        s.$watch('model.range',function(id){
           if(!id) return;
           var data = JSON.parse(window.atob(id));
           s.model._diag = data._diag;
           s.model.diagStart = data.start;
           s.model.diagEnd = data.end;
        });


        //DOM CLASS
        s.dateSlotSelected = function(rng){
            return (s.model.range && (s.model.range == rng.id));
        }


        s.$watch('checks.selectAll', function() {
            if (!s.diags) return;
            s.diags.forEach(d => {
                s.model.diags[d.name] = s.checks.selectAll;
            });
        }, true);


        db.ctrl('Settings', 'getAll', {}).then(d => {
            if (d.ok && d.result.length > 0) s.settings = d.result[0];
        });

        s.orderPaid = () => {
            return _.includes(['prepaid', 'completed'], s._order.status);
        }

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
            if (_.includes(['prepaid', 'completed'], s._order.status)) {
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
        s.model = {
            date: undefined,
            diags: {},
            clientType: 'agency'
        };

        s.isAgency = () => {
            return s.model.clientType == 'agency' || false;
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

        s.__constructionPermissionDateSelectFirstItem = () => s.constructionPermissionDate && Object.keys(s.constructionPermissionDate)[0] || "Loading";
        s.__constructionPermissionDateSelectLabel = () => s.__constructionPermissionDateSelectLabelVal || s.__constructionPermissionDateSelectFirstItem();
        s.__constructionPermissionDateSelect = (key, val) => {
            s.model.constructionPermissionDate = val;

        };
        s.$watch('model.constructionPermissionDate', function(val) {
            s.__constructionPermissionDateSelectLabelVal = val;
        });



        s.__gazSelectFirstItem = () => s.gasInstallation && Object.keys(s.gasInstallation)[0] || "Loading";
        s.__gazSelectLabel = () => s.__gazSelectLabelVal || s.__gazSelectFirstItem();
        s.__gazSelect = (key, val) => {
            s.model.gasInstallation = val;
        };
        s.$watch('model.gasInstallation', function(val) {
            s.__gazSelectLabelVal = val;
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
                house: paramBool('house') || false,
                squareMeters: param('squareMeters', s.squareMeters) || '- de 20m²',
                // apartamentType: param('apartamentType', s.apartamentType) || undefined,
                constructionPermissionDate: param('cpd', s.constructionPermissionDate) || 'Entre 1949 et le 01/07/1997',
                address: param('address') || "15 rue L'Hopital Sain Louis",
                gasInstallation: param('gasInstallation', s.gasInstallation) || 'Oui, Moins de 15 ans',
                electricityInstallation: param('electricityInstallation', s.electricityInstallation) || 'Plus de 15 ans',
                date: paramDate('date'),
                time: param('time', ['any']),
                clientType: param('clientType', ['agency', 'landlord'])
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
                    console.log('slots',data);
                    data = data.length > 0 && data || null;
                    if (s.model.time == 'any') {
                        if (data && s.availableTimeRanges.length > 0) {
                            s.pickTimeRange(data[0]);
                        }
                    }
                    if (!data) return;
                    var cbHell = $U.cbHell(data.length, function() {
                        console.log('slots-ok',data);
                        resolve(data);
                    });
                    
                    data.forEach(r => {
                        
                        r.id = window.btoa(JSON.stringify(r));
                        
                        db.ctrl('User', 'get', {
                            _id: r._diag
                        }).then(d => {
                            if (d.ok && d.result) {
                                r.name = d.result.firstName+', '+ d.result.lastName.substring(0,1);
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
            return s.booking.order.saved;
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
                        s.saveAsync();
                        s.subscribeMode = true;
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
        s.subscribe = (clientType) => {
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
                        db.ctrl('User', 'createClient', {
                            email: s.auth.email,
                            clientType: clientType
                        }).then(data => {
                            if (data.ok) {
                                s._user = data.result;
                                s.saveAsync();
                                s.subscribeMode = true;
                                //s.right();
                            }
                        })
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


        s.saveAsync = () => {
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

            db.ctrl('Order', 'saveWithEmail', s.model).then(data => {
                var saved = data.ok;
                var exists = (data.err === 'ORDER_EXISTS');
                var taken = (data.err === 'ORDER_TAKEN');
                //
                s._order = data.result;
                //

                if (!data.ok) console.warn('save-error', data);

                db.ctrl('Order', 'getById', Object.assign(s._order, {
                        __populate: {
                            _client: '_id email clientType address',
                            _diag: '_id email clientType address'
                        }
                    }))
                    .then(d => {
                        if (d.ok) s._order = d.result;
                        s.keysWhereTime.emit('onItem');
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
                s.booking.order.saved = saved || exists;
                s.booking.order.exists = exists;



                s.booking.order.taken = (taken == true);

            }).error(err => {
                s.notify('There was a server issue during the order saving proccess. Retrying in 10 seconds. Wait.', {
                    type: 'warning',
                    duration: 100000
                });
                setTimeout(s.saveAsync, 10000);
            });

        };




        var isLandlord = () => s.model.clientType === 'landlord';

        //require an order to be saved (s._order)
        s.payNOW = (success) => {
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
                            if (success) {
                                success();
                            }
                            s.booking.complete = true;
                            s.booking.payment.complete = true;
                            db.ctrl('Order', 'update', s._order); //async
                            console.info('PAY-OK', data.result);
                            s.notify('Order payment success. We send you an email.', {
                                type: 'success',
                                duration: 100000
                            });
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

/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
/*global $D*/

(function() {
    var app = angular.module('app.diag', []);

    app.directive('diagsList', function(
        $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server) {
        return {
            restrict: 'AE',
            replace: true,
            scope: {},
            templateUrl: 'views/directives/directive.fast-crud.html',
            link: function(s, elem, attrs) {},
            controller: function($scope, $element, $attrs, $transclude) {
                var r = $rootScope,
                    db = server,
                    s = $scope;
                s.title = "";
                r.routeParams({
                    prevRoute: 'diags'
                });

                function update() {
                    db.ctrl('User', 'getAll', {
                        userType: 'diag'
                    }).then((res) => {
                        res.result = _.orderBy(res.result, ['priority'], ['asc']);
                        s.model.update(res.result)
                    });
                }
                s.model = {
                    click: (item, index) => {
                        r.routeParams({
                            item: item,
                        });
                        r.route('diags/edit/' + item._id);
                    },
                    buttons: [{
                        label: "Rafraîchir",
                        type: () => "btn diags-btn bg-azure-radiance margin-left-0 margin-right-1",
                        click: () => update()
                    }, {
                        label: "Créer un nouveau",
                        type: () => "btn diags-btn bg-azure-radiance",
                        click: () => r.route('diags/edit/-1')
                    }],
                    columns: [{
                        label: 'Priorité',
                        name: 'priority'
                    }, {
                        label: "Description",
                        name: "firstName",
                        format: (x, o) => o.firstName + ((o.lastName) ? ', ' + o.lastName : '')
                    }, {
                        label: "Email",
                        name: 'email'
                    }, {
                        label: "Téléphones",
                        name: "fixedTel",
                        format: (v, item) => {
                            v = '';
                            if (item.fixedTel) {
                                v = 'TF: ' + item.fixedTel;
                            }
                            if (item.cellPhone) {
                                if (!v) {
                                    v = 'M: ' + item.cellPhone;
                                } else {
                                    v += ' M: ' + item.cellPhone;
                                }
                            }
                            return v;
                        }
                    }, {
                        label: "Reversement",
                        name: "commission"
                    }, {
                        label: "Activated",
                        name: "commission",
                        format: (v, item) => !item.disabled
                    }, {
                        label: "Wallet ID",
                        name: "wallet",
                        format: (v, item) => item.wallet || ''
                    }],
                    items: []
                };
                update();
            }
        };
    });
    app.directive('diagExceptionList', function(
        $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server, $mongoosePaginate, $routeParams) {
        return {
            restrict: 'AE',
            replace: true,
            scope: {
                //model: "=model"
            },
            templateUrl: 'views/directives/directive.fast-crud.html',
            link: function(s, elem, attrs) {
                var r = $rootScope,
                    dbPaginate = $mongoosePaginate.get('TimeRange'),
                    params = $routeParams;
                var db = server;
                var n = attrs.name;
                r.secureSection(s);
                //
                if (r.userIs('client')) {
                    r.handleSecurityRouteViolation();
                }

                function update(items, cb) {
                    if (items) {
                        s.model.update(items);
                        return;
                    }
                    var rules = {
                        __populate: {
                            '_user': 'email'
                        }
                    };

                    if (r.userIs('diag')) {
                        rules._user = r.session()._id;
                    }

                    if (params && params.id) {
                        rules._user = params.id;
                    }

                    if (!rules._user || rules._user.toString() == '-1') {
                        return console.warn('time-range: insufficients rules.');
                    }

                    dbPaginate.ctrl(rules, s.model).then((res) => {
                        if (res.ok) {
                            if (cb) {
                                cb(res.result);
                            } else {
                                s.model.update(res.result, null);
                            }
                        }
                    });
                }

                var userId = () => {
                    if (r.userIs('diag')) return r.session()._id;
                    if (params.id) return params.id;
                    return null;
                };
                var prevRoute = () => {
                    if (r.userIs('diag')) return 'dashboard';
                    if (params.id) {
                        return 'diags/edit/' + params.id;
                    } else {
                        return 'exceptions';
                    }
                };

                var columns = [];
                if (r.userIs('admin') && (params && params.id || null) == null) {
                    columns.push({
                        label: 'Diag',
                        name: '_user',
                        format: (v, item) => item._user.email
                    });
                }
                columns.push({
                    label: "Description",
                    name: 'description'
                }, {
                    label: "de",
                    name: 'start',
                    format: (v, item) => {
                        if (item.repeat !== 'none') return r.momentTime(item.start);
                        //return moment(item.start).format('DD-MM-YY HH[h]mm')
                        return r.momentDateTimeWords2(item.start);
                    }
                }, {
                    label: "à",
                    name: 'end',
                    format: (v, item) => {
                        if (item.repeat !== 'none') return r.momentTime(item.end);
                        //return moment(item.end).format('DD-MM-YY HH[h]mm')
                        return r.momentDateTimeWords2(item.end);
                    }
                }, {
                    label: "Règle",
                    name: 'repeat',
                    format: (v, item) => {
                        if (item.repeat == 'none') return 'Indisponibilité spécifique';
                        if (item.repeat == 'day') return 'Indisponibilité tous les jours';
                        if (item.repeat == 'week') {
                            var day = '('+moment().weekday(item.weekday).format('dddd')+')';
                            return 'Indisponibilité toutes les semaines '+(item.weekday?day:'');
                        }
                        return 'Error';
                    }
                });

                s.model = {
                    title: 'Indisponibilités',
                    paginate: (cb) => update(null, cb),
                    init: () => update(),
                    remove: (item, index) => {
                        var msg = 'Delete Indisponibilité  ' + item.description + ' / De ' + r.momentDateTime(item.start) + ' À ' + r.momentDateTime(item.end);
                        s.confirm(msg, () => {
                            db.ctrl('TimeRange', 'remove', {
                                _id: item._id
                            }).then(() => {
                                update();
                            });
                        });
                    },
                    click: (item, index) => {
                        r.routeParams({
                            item: item,
                            prevRoute: prevRoute()
                        });
                        r.route('exceptions/edit/' + item._id);
                    },
                    buttons: [{
                        label: "Rafraichir",
                        type: () => "btn diags-btn bg-azure-radiance margin-right-quarter margin-bottom-quarter",
                        click: () => update()
                    }, {
                        label: "Ajouter une indisponibilité",
                        type: () => "btn diags-btn bg-azure-radiance margin-bottom-quarter",
                        click: () => {
                            r.routeParams({
                                item: {
                                    _user: userId()
                                },
                                prevRoute: prevRoute()
                            });
                            r.route('exceptions/edit/-1');
                        }
                    }],
                    columns: columns
                };

            }
        };
    });
    app.controller('diagExceptionEdit', ['server', '$scope', '$rootScope', '$routeParams', 'focus', '$timeout', '$log',
        function(db, s, r, params, focus, $timeout, $log) {

            r.dom(function() {
                document.body.scrollTop = 0;
            });

            //
            $U.expose('s', s);

            $timeout(function() {
                s.confirm = s.confirm || r.openConfirm || null;
            }, 2000);



            var dateRangePicker = {
                _initializeCounter: 0,
                _watches: [],
                watch: function(path, handler) {
                    this._watches.push(s.$watch(path, handler));
                },
                resetWatches: function() {
                    for (var index in this._watches) {
                        this._watches[index]();
                    }
                },
                momentDateToToday: function(value) {
                    //$log.debug('date hour is',moment(value).hours());
                    return moment().hours(moment(value).hours()).minutes(moment(value).minutes());
                },
                initialize: function() {
                    var self = this;
                    self._initializeCounter++;
                    self.resetWatches();
                    var el = $('input[name="daterange"]');

                    var format = 'DD/MM/YYYY HH[h]mm';
                    if(s.item.repeat!=='none'){
                        //format = 'HH[h]mm';
                    }

                    el.daterangepicker({
                        minDate: moment().hours(8).minutes(0),
                        maxDate: s.item.repeat === 'none' ? moment().add(60, 'day') : moment().hours(20).minutes(0),
                        startDate: moment()._d,
                        endDate: moment()._d,
                        timePicker: true,
                        timePicker24Hour: true,
                        timePickerIncrement: 10,
                        locale: {
                            format: format
                        }
                    });

                    self.watch('item.start', function(value) {
                        if (moment(value).isValid()) {
                            if (s.item.repeat !== 'none') {
                                value = self.momentDateToToday(value);
                            }
                            el.data('daterangepicker').setStartDate(moment(value)._d);
                        }
                    });
                    self.watch('item.end', function(value) {
                        if (moment(value).isValid()) {
                            if (s.item.repeat !== 'none') {
                                value = self.momentDateToToday(value);
                            }
                            el.data('daterangepicker').setEndDate(moment(value)._d);
                        }
                    });
                    s.getStartDate = () => {
                        return el.data('daterangepicker').startDate;
                    }
                    s.getEndDate = () => {
                        return el.data('daterangepicker').endDate;
                    }

                    //if(self._initializeCounter<=5){
                    el.trigger('click');
                    //}

                }
            };



            //TIME-PICKER-DATA
            s.timeRange = {
                hstep: 1,
                mstep: 10,
                minDate: moment().date(1),
            };


            s.item = {
                start: null,
                end: null,
                repeat: 'none',
                description: '',
                start: new Date(),
                end: new Date()
            };

            s.$watch('item.repeat', function() {
                r.dom(dateRangePicker.initialize());
            });

            var isEdit = params.id.toString() !== '-1';



            //DAYS SELECTOR
            s.days = (() => {
                var o = {
                    label: 'Day',
                    selected: '',
                    items: [],
                    val: -1,
                    select: (val) => {
                        o.items.forEach((v) => {
                            if (v.val.toString() == val.toString()) {
                                o.click(v);
                            }
                        });
                    },
                    click: (v) => {
                        o.selected = v.label || v;
                        o.val = v.val;
                        s.item.weekday = o.val;
                    }
                };
                var m = moment();
                o.items.push({
                        label: "(Choice a day)",
                        val: ''
                    }
                    /*, {
                                        label: "Every day",
                                        val: '-1'
                                    }*/
                );
                for (var x = 0; x <= 6; x++) {
                    m.weekday(x);
                    o.items.push({
                        label: m.format('dddd'),
                        val: x
                    });
                }

                o.selected = o.items[0].label;
                s.$watch('item.repeat', (v) => {
                    if (v !== 'none') {
                        if(s.item.weekday){
                            s.days.select(s.item.weekday);    
                        }else{
                            s.days.select(-1);    
                        }
                    }
                });
                
                return o;
            })();

            s.getDiags = function(val) {
                return db.http('User', 'getAll', {
                    userType: 'diag',
                    __rules: {
                        disabled: {
                            $ne: true
                        },
                    },
                    __regexp: {
                        email: val
                    }
                }).then(function(res) {
                    return res.data.result;
                });
            };
            s.onLoad = (isNew) => {
                if (s.repeat == 'week') {
                    s.days.select(moment(s.item.start).day());
                }
                if (isNew) {
                    s.item.start = moment().hour(9).minutes(0)._d;
                    if (r.params && r.params.item) {
                        s.item = Object.assign(s.item, r.params.item);
                        if (typeof s.params.item._user == 'string') {
                            db.ctrl('User', 'get', {
                                _id: r.params.item._user,
                                __select: 'email'
                            }).then(d => {
                                if (d.ok) {
                                    s.item._user = d.result;
                                    s.refreshFix();
                                }
                            });
                        }
                        delete r.params.item;
                    }
                    return;
                } else {
                    s.refreshFix();
                }
            };
            s.refreshFix = function() {
                s._item = s.item;
                r.dom(function() {
                    s.item = {};
                });
                r.dom(function() {
                    s.item = s._item;
                    delete s._item;
                }, 100);
            }
            if (isEdit) {
                if (r.params && r.params.item) {
                    s.item = r.params.item;
                    r.params.item = null;
                    s.onLoad();
                } else {
                    db.ctrl('TimeRange', 'get', {
                        _id: params.id,
                        __populate: {
                            '_user': 'email'
                        }
                    }).then(d => {
                        if (d.ok) {
                            s.item = d.result;
                            s.onLoad();
                        } else {
                            r.notify({
                                message: 'Loading error, try later',
                                type: "warning"
                            });
                        }
                    })
                }
            } else {
                s.onLoad(true);
            }
            s.save = () => {
                db.ctrl('TimeRange', 'createUpdate', s.item).then((result) => {
                    r.route(r.params && r.params.prevRoute || 'dashboard');
                });
            };
            s.cancel = () => r.route(r.params && r.params.prevRoute || 'dashboard');
            s.delete = () => {
                var msg = 'Delete ' + (s.item.description || '') + ' ' + r.momentDateTime(s.item.start) + ' - ' + r.momentDateTime(s.item.end);
                if(s.item.repeat=='week'){
                    msg+' ('+moment().weekday(s.item.weekday).format('dddd')+ ')';
                }
                s.confirm(msg, () => {
                    db.ctrl('TimeRange', 'remove', {
                        _id: s.item._id
                    }).then(() => {
                        s.cancel();
                    });
                });
            };
            s.rangeCollideWithOrder = (yes, no) => {
                db.ctrl('Order', 'getAll', {
                    __select: 'start end',
                    _diag: s.item._user,
                    __rules:{
                        status:{
                            $ne:'completed'
                        }
                    }
                }).then((d) => {
                    if (d.ok) {
                        var yesFlag = false;
                        var start = s.item.start;
                        var end = s.item.end;
                        d.result.forEach(v => {
                            if(s.item.repeat=='week'&&moment(v.start).weekday()!=s.item.weekday){
                                return;
                            }
                            if(s.item.repeat=='day' || s.item.repeat=='week'){
                                start = moment(v.start).hour(moment(start).hour()).minute(moment(start).minute())
                                end = moment(v.end).hour(moment(end).hour()).minute(moment(end).minute())
                            }
                            if (moment.range(v.start, v.end).overlaps(moment.range(start, end))) {
                                yesFlag = true;
                                if (!yes) {
                                    $log.debug('dates do collide with order',v);
                                }
                                return yes && yes(v);
                            }
                        });
                        if (yesFlag) return;
                        if (!no) {
                            $log.debug('dates do not collide with orders');
                        }
                        return no && no();
                    } else {
                        console.warn('rangeCollide order fetch error');
                        return no && no();
                    }
                }).error(() => {
                    console.warn('rangeCollide order fetch error');
                });
            };
            s.validate = () => {
                if (!s.item) return console.warn('item missing.');
                if (!s.item._user) return console.warn('item._user missing.');

                s.item.start = s.getStartDate();
                s.item.end = s.getEndDate();

                if(s.item.repeat=='week' && s.item.weekday==undefined){
                    return r.warningMessage('Jour de semaine requis.');
                }

                s.rangeCollideWithOrder((order) => {
                    switch(s.item.repeat){
                        case 'none':
                        return r.warningMessage('Une commande existe à la date choisie.');
                        break;
                        case 'day':
                        return r.warningMessage("Une commande existe à l&#39;heure choisie.");
                        break;
                        case 'week':
                        var day = moment().weekday(s.item.weekday).format('dddd');
                        return r.warningMessage("Une commande existe un jour "+day+" à l&#39;heure choisie.");
                        break;
                    }
                    
                }, () => {

                    $U.ifThenMessage([
                        [!s.item._user, '==', true, 'Diag required'],
                        [s.item.repeat == 'week' && s.days.val.toString() === '-1', '==', true, 'Choice a day'],
                        [_.isNull(s.item.start) || _.isUndefined(s.item.start), '==', true, 'Start date required'],
                        [_.isNull(s.item.end) || _.isUndefined(s.item.end), '==', true, 'Start date required'],
                        [moment(s.item.start || null).isValid(), '==', false, "Start date invalid"],
                        [moment(s.item.end || null).isValid(), '==', false, "End date invalid"],
                        [s.item.repeat != 'none' && moment(s.item.end).isValid() && moment(s.item.start).isValid() && !moment(s.item.end).isSame(moment(s.item.start), 'day'), '==', true, 'Start / End dates need to be in the same day.'],
                        [moment(s.item.end).isValid() && moment(s.item.end).isBefore(moment(s.item.start), 'hour'), '==', true, 'End date cannot be lower than Start date']
                    ], (m) => {
                        if (typeof m[0] !== 'string') {
                            r.notify(m[0](), 'warning');
                        } else {
                            r.notify(m[0], 'warning');
                        }
                    }, s.save);
                });
            }
        }
    ]);
})();
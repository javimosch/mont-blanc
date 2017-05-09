(function() {
    /*global angular*/
    /*global _*/
    /*global moment*/
    /*global $U*/
    /*global $D*/
    /*global $*/
    angular.module('diag-account-feature-module').controller('diagExceptionEdit', ['server', '$scope', '$rootScope', '$routeParams', '$timeout', '$log',
        function(db, s, r, params, $timeout, $log) {

            r.dom(function() {
                console.log('diag exception edit scrolltop');
                document.body.scrollTop = 0;
            });

            //
            $U.expose('s', s);





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
                    if (s.item.repeat !== 'none') {
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
                        if (s.item.weekday) {
                            s.days.select(s.item.weekday);
                        }
                        else {
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
                }
                else {
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
                }
                else {
                    db.ctrl('TimeRange', 'get', {
                        _id: params.id,
                        __populate: {
                            '_user': 'email'
                        }
                    }).then(d => {
                        if (d.ok) {
                            s.item = d.result;
                            s.onLoad();
                        }
                        else {
                            r.notify({
                                message: 'Loading error, try later',
                                type: "warning"
                            });
                        }
                    })
                }
            }
            else {
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
                if (s.item.repeat == 'week') {
                    msg + ' (' + moment().weekday(s.item.weekday).format('dddd') + ')';
                }
                r.openConfirm(msg, () => {
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
                    __rules: {
                        status: {
                            $ne: 'completed'
                        }
                    }
                }).then(onOrdersFetch).error(() => {
                    console.warn('rangeCollide order fetch error');
                });

                function orderOverlaps(_order) {
                    var start = s.item.start;
                    var end = s.item.end;
                    if (s.item.repeat == 'week' && moment(_order.start).weekday() != s.item.weekday) {
                        return;
                    }
                    if (s.item.repeat == 'day' || s.item.repeat == 'week') {
                        start = moment(_order.start).hour(moment(start).hour()).minute(moment(start).minute())
                        end = moment(_order.end).hour(moment(end).hour()).minute(moment(end).minute())
                    }
                    if (s.item.repeat == 'none') {

                    }
                    var rangeException = moment.range(start, end);
                    //var rngExeptionStart = start;
                    //var rngExeptionEnd = end;
                    var rangeOrder = moment.range(_order.start, _order.end);
                    //var rngOrderStart = _order.start;
                    //var rngOrderEnd = _order.end;
                    //var overlaps = $U.dateRangeOverlaps(rngExeptionStart, rngExeptionEnd, rngOrderStart, rngOrderEnd);
                    var overlaps = rangeException.overlaps(rangeOrder);
                    return overlaps;
                }

                function onOrdersFetch(response) {
                    if (response.ok) {
                        for (var index in response.result) {
                            if (orderOverlaps(response.result[index])) {
                                if (!yes) {
                                    $log.debug('dates do collide with order', response.result[index]);
                                }
                                return yes && yes(response.result[index]);
                            }
                        }
                        if (!no) {
                            $log.debug('dates do not collide with orders');
                        }
                        return no && no();
                    }
                    else {
                        console.warn('rangeCollide order fetch error');
                        return no && no();
                    }
                }

            };
            s.validate = () => {
                if (!s.item) return console.warn('item missing.');
                if (!s.item._user) return console.warn('item._user missing.');

                s.item.start = s.getStartDate();
                s.item.end = s.getEndDate();

                if (s.item.repeat == 'week' && s.item.weekday == undefined) {
                    return r.warningMessage('Jour de semaine requis.');
                }

                s.rangeCollideWithOrder((order) => {
                    switch (s.item.repeat) {
                        case 'none':
                            return r.warningMessage('Une commande existe à la date choisie.');
                        case 'day':
                            return r.warningMessage("Une commande existe à l&#39;heure choisie.");
                        case 'week':
                            var day = moment().weekday(s.item.weekday).format('dddd');
                            return r.warningMessage("Une commande existe un jour " + day + " à l&#39;heure choisie.");
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
                        }
                        else {
                            r.notify(m[0], 'warning');
                        }
                    }, s.save);
                });
            }
        }
    ]);
})();

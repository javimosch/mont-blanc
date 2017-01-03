/*global angular*/
/*global moment*/
/*global $U*/
/*global $D*/
/*global _*/
(function() {
    var app = angular.module('srv.diagSlots', []);
    app.service('diagSlots', function($rootScope, server, orderPrice,$log) {
        var r = $rootScope,
            db = server;

        //////
        return function(scope, item) {
                //item represent the payload of the order. ex:{start,end,diags}
                //var s = scope;
                //s.totalTime

                var _settings = {};

                function requestSlots(date) {
                    return $U.MyPromise(function(resolve, error, evt) {
                        if (!isFinite(new Date(date))) return; //invalid
                        var time = $D.OrderTotalTime(item.diags, scope.diags)
                        var order = {
                            day: date,
                            time: time
                        };
                        //$log.debug('order time',r.momentDateTime(order.day),JSON.stringify(order.time));
                        db.getAvailableRanges(order, _settings).then(function(data) {
                            //console.log('slots', data);
                            //data = data.length > 0 && data || null;
                            //if (!data) return;

                            var cbHell = $U.cbHell(data.length, function() {
                                //   console.log('slots-ok', data);
                                resolve(data);
                            });
                            data.forEach(r => {
                                r.id = window.btoa(JSON.stringify(r));

                                //IF SUNDAY +100% to base price ???



                                orderPrice.set({
                                    date:date,
                                    modifiersPercentages: scope.settings && scope.settings.pricePercentageIncrease,
                                    squareMetersPrice: scope.squareMetersPrice,
                                    squareMeters: scope._order && scope._order.info && scope._order.info.squareMeters ||
                                    scope.item && scope.item.info && scope.item.info.squareMeters || (scope.item && scope.item.squareMeters) || '',
                                    clientDiscountPercentage: 
                                    (scope._order && scope._order._client && scope._order._client.discount) ||
                                    (scope.item && scope.item._client && scope.item._client.discount),
                                    departmentMultipliers: scope.settings &&  scope.settings.metadata && scope.settings.metadata.departmentMultipliers,
                                    postCode: scope.item && scope.item.postCode,
                                    basePrice: scope.basePrice,
                                    selectedDiags:  scope._order && scope._order.diags && scope._order.diags ||
                                    scope.item && scope.item.diags,
                                    availableDiags: scope.diags
                                });
                                r.price = orderPrice.getPriceTTC();


                                //
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

                            if (data.length == 0) cbHell.call();

                        });
                    });
                };

                //this component is a high-level wrapper to retrive diags available slots.
                return function() {
                    function asyncRequest(_date, cbHell, dataPosition) {
                        var _newDate = new Date(_date);
                        requestSlots(_newDate).then((d) => {
                            var d = _.orderBy(d, function(item) {
                                return item.start._d;
                            });

                            if (d.length > 4) {
                                //console.warn('slots-more-than-four-warning',d)
                                try {
                                    db.ctrl('Log', "create", {
                                        message: "booking-warning: date slot request retrieve " + d.length + ' slots.',
                                        data: d
                                    });
                                } catch (e) {}

                                while (d.length > 4) {
                                    d.pop();
                                };
                                //console.warn('slots-more-than-four-resolve',d)
                            } else {

                            }

                            _data[dataPosition] = new DaySlot(_newDate, d);
                            //                    console.log('slots-days-request-end-for', _localCursor, 'at', dataPosition);
                            cbHell.next();
                        });
                    }

                    var DaySlot = function(_date, _slots) {
                        var o = {
                            date: moment(_date),
                            slots: _slots,
                            label: function() {
                                if (o.isToday()) {
                                    return 'Aujourd’hui';
                                } else {
                                    return r.momentFormat(o.date, 'dddd DD MMMM');
                                }
                            },
                            isToday: function() {
                                return o.date.isSame(moment(), 'day');
                            }
                        };
                        return o;
                    };
                    var _data = [];
                    var _nextTimes = 0;
                    var cursor = moment();
                    var o = {};
                    o.setDiag = function(_diag) {
                        _settings._diag = _diag;
                    };
                    o.get = function() {
                        return _data;
                    };
                    o.init = function(d, opt) {
                        //today, tomorrow, tomorrow morrow y tomorrow morrow morrow.
                        cursor = moment(d);
                        opt = opt || {};
                        _settings.department = opt.department;
                        _settings.maxSlots = opt.maxSlots;
                        _settings.allowFixedAllocation = opt.allowFixedAllocation;
                        o.request();
                    };
                    o.backIsDisabled = function() {
                            return cursor.isSame(moment(), 'days');
                        },
                        o.nextIsDisabled = function() {
                            return false; //_nextTimes > 1;
                        }
                    o.next = function() {
                        if (_nextTimes > 15) {
                            _nextTimes = 0;
                            return o.init();
                        }
                        _nextTimes++;
                        cursor = cursor.add(4, 'days');
                        o.request();
                    };
                    o.back = function() {
                        if (cursor.isSame(moment(), 'days')) return; //on today ,back is not possible.
                        cursor = cursor.subtract(4, 'days');
                        if (cursor.isBefore(moment(), 'days')) {
                            cursor = moment();
                        } else {
                            _nextTimes--;
                        }
                        o.request();
                    };
                    o.request = function() {
                        var _localCursor = moment(cursor);
                        var cbHell = $U.cbHell(4, function() {
                            // console.info('slots-days-request-end');

                            //if the first day is today and there is 0 slots, we move one day ahead.
                            if (o.get()[0].date.isSame(moment(), 'day') && o.get()[0].slots.length == 0) {
                                o.init(moment().add(1, 'days').toDate());
                            }

                        });
                        // console.info('slots-days-request-begin for', r.momentFormat(_localCursor, 'DD-MM-YY'));
                        asyncRequest(_localCursor._d, cbHell, 0); //
                        _localCursor = _localCursor.add(1, 'days');
                        asyncRequest(_localCursor._d, cbHell, 1); //
                        _localCursor = _localCursor.add(1, 'days');
                        asyncRequest(_localCursor._d, cbHell, 2); //
                        _localCursor = _localCursor.add(1, 'days');
                        asyncRequest(_localCursor._d, cbHell, 3); //
                    };
                    return o;
                }();
            }
            //////

    });
})();
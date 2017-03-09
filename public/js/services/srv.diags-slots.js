/*global angular*/
/*global moment*/
/*global $U*/
/*global $D*/
/*global _*/
(function() {
    var app = angular.module('srv.diagSlots', []);
    angular.module('app').service('diagSlots', function($rootScope, server, orderPrice, $log, orderRdv) {
        var r = $rootScope,
            db = server;

        //////
        return function(scope, item) {
                //item represent the payload of the order. ex:{start,end,diags}
                //var s = scope;
                //s.totalTime

                var _settings = {};
                $rootScope._diagSlotsSettings = _settings;

                function setOrderDetails(date) {
                    orderPrice.set({
                        date: date,
                        diagIsAutoentrepreneur: scope._order && scope._order._diag && scope._order._diag.isAutoentrepreneur ||
                            scope.item && scope.item._diag && scope.item._diag.isAutoentrepreneur || false,
                        buildingType: scope._order && scope._order.info && scope._order.info.buildingType || scope.item && scope.item.info && scope.item.info.buildingType,
                        modifiersPercentages: scope.settings && scope.settings.pricePercentageIncrease,
                        squareMetersPrice: scope.squareMetersPrice,
                        squareMeters: scope._order && scope._order.info && scope._order.info.squareMeters ||
                            scope.item && scope.item.info && scope.item.info.squareMeters || (scope.item && scope.item.squareMeters) || '',
                        clientDiscountPercentage:
                            (scope._order && scope._order._client && scope._order._client.discount) ||
                            (scope.item && scope.item._client && scope.item._client.discount),
                        departmentMultipliers: scope.settings && scope.settings.metadata && scope.settings.metadata.departmentMultipliers,
                        postCode: scope.item && scope.item.postCode,
                        basePrice: scope.basePrice,
                        selectedDiags: scope._order && scope._order.diags && scope._order.diags ||
                            scope.item && scope.item.diags,
                        availableDiags: scope.diags
                    });

                }

                function requestSlots(date) {
                    return $U.MyPromise(function(resolve, error, evt) {
                        if (!isFinite(new Date(date))) return; //invalid
                        var time = $D.OrderTotalTime(item.diags, scope.diags)
                        var order = {
                            day: date,
                            time: time
                        };
                        //$log.debug('order time',r.momentDateTime(order.day),JSON.stringify(order.time));

                        if (_settings.maxSlots && _settings.maxSlots > 4) {
                            //console.log('RDV-NON-FIXED',_settings.maxSlots);
                            //NEW
                            orderRdv.getAll({
                                date: date,
                                time: time,
                                diagId: _settings.diagId,
                                department: _settings.department
                            }).then(_resolve);
                        }
                        else {
                            //db.getAvailableRanges(order, _settings).then(_resolve);

                            orderRdv.getAll({
                                date: date,
                                time: time,
                                diagId: _settings.diagId,
                                fixedSlots: true,
                                department: _settings.department
                            }).then(_resolve);

                        }


                        //OLD


                        function _resolve(data) {
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



                                setOrderDetails(date);



                                //
                                db.ctrl('User', 'get', {
                                    _id: r._diag,
                                    __select: "firstName lastName diagPriority isAutoentrepreneur"
                                }).then(d => {
                                    if (d.ok && d.result) {
                                        r.name = d.result.firstName.substring(0, 1) + '. ' + d.result.lastName.substring(0, 1)+'.';
                                        if (d.result.diagPriority) {
                                            r.name += ' (' + d.result.diagPriority + ')';
                                        }

                                        orderPrice.set({
                                            diagIsAutoentrepreneur: d.result.isAutoentrepreneur || false,
                                            date: date
                                        });
                                        r.price = orderPrice.getPriceTTC();

                                        cbHell.next();
                                    }
                                });
                            });

                            if (data.length == 0) cbHell.call();

                        }

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


                            var maxSlots = (_settings.maxSlots != undefined && _settings.maxSlots || 4);
                            if (d && d.length > maxSlots) {
                                $log.warn('RDV slots exceed maximum', maxSlots || 4);
                                /*
                                try {
                                    db.ctrl('Log', "create", {
                                        message: "booking-warning: date slot request retrieve " + d.length + ' slots.',
                                        data: d
                                    });
                                } catch (e) {}
*/
                                while (d.length > maxSlots) {
                                    d.pop();
                                };
                                //console.warn('slots-more-than-four-resolve',d)
                            }
                            else {

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
                                }
                                else {
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
                    window._rdvService = o;
                    o.settings = () => _settings;
                    o.setDiag = function(_diag) {
                        if (_diag && _diag._id && _diag._id != _settings._diag) {
                            _settings.diagId = _diag && _diag._id || _diag || undefined;
                            o.init(null,_settings);
                        }
                    };
                    o.updatePrices = function() {
                        var daySlot = null;


                        for (var x in _data) {
                            daySlot = _data[x];

                            setOrderDetails(daySlot.date);

                            daySlot.slots.forEach(function(slot) {
                                slot.price = orderPrice.getPriceTTC();
                            });

                        }
                    };
                    o.get = function() {
                        return _data;
                    };
                    o.init = function(d, opt) {
                        //today, tomorrow, tomorrow morrow y tomorrow morrow morrow.
                        cursor = moment(d);

                        if (cursor.isSame(moment(), 'day') && moment().isAfter(moment().hour(19).minutes(0))) {
                            return o.init(moment().add(1, 'days').toDate(), opt);
                        }

                        opt = opt || {};

                        _settings.maxSlots = opt.maxSlots || _settings.maxSlots;
                        _settings.allowFixedAllocation = opt.allowFixedAllocation;

                        if (scope.item && scope.item.postCode) {
                            $log.debug('rdv-slots: parsing department',scope.item.postCode);
                            _settings.department = scope.item.postCode.substring(0, 2);
                        }else{
                            $log.warn('rdv-slots: Department missing');
                        }

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
                            return o.init(null, _settings);
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
                        }
                        else {
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
                                o.init(moment().add(1, 'days').toDate(), _settings);
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

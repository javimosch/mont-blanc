var srv = angular.module('app.common.service', []);

srv.service('localdb', ['$http', function(http) {

    return function(settings) {
        return MyPromise(function(resolve) {
            //handlers
            resolve({
                localdb: true
            });
        });
    };
}]);
srv.directive('fileModel', ['$parse', function($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;

            element.bind('change', function() {
                scope.$apply(function() {
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}]);
srv.service('fileUpload', ['$http', function($http) {
    this.single = function(opt, success, err) {
        var fd = new FormData();
        Object.keys(opt.data).forEach((key) => {
            fd.append(key, opt.data[key]);
        });
        fd.append('file', opt.file);
        $http.post(opt.url, fd, {
                transformRequest: angular.identity,
                headers: { 'Content-Type': undefined }
            })
            .success(success)
            .error(err);
    };
}]);
srv.service('server', ['$http', 'localdb', '$rootScope', 'fileUpload', function(http, localdb, r, fileUpload) {
    //var URL = 'http://ujkk558c0c9a.javoche.koding.io:3434';
    var URL = 'http://localhost:5000';

    $.ajax("/serverURL").then(function(r) {
        URL = r.URL; //updates serverURL from express (node env serverURL);
        console.info('server:url:' + URL);
    });

    //var URL = 'http://blooming-plateau-64344.herokuapp.com/';

    var localData = null;

    var spinner = (() => {
        return (v) => {
            r.showSpinner = v;
            r.dom();
        }
    })();
    var logger = (() => {
        var _controlledErrorsStrings = [];
        var _controlledErrors = {};
        var _errors = {};
        var _logs = {};
        var fn = new function() {
            var self = this;
            self.id = newId(20); //new Date() + '#' + Object.keys(_logs).length;
            return (url, req) => {
                var item = {
                    url: url,
                    req: req
                };
                _logs[self.id] = item;
                setTimeout(() => {
                    if (_logs[self.id] !== undefined) {
                        item.err = "Logger: request timeout.";
                        delete _logs[self.id];
                    }
                }, 1000 * 30);
                r.$emit('logger.working');
                return (res) => {
                    //data for $http, result for others
                    //add more validations for detect a fail here.
                    if (!res.data && !res.result) {
                        item.err = 'Server down, try later.';
                        if (_.includes(_controlledErrorsStrings, item.err)) {
                            _controlledErrors[self.id] = item;
                        } else {
                            _errors[self.id] = item;
                        }
                    } else {
                        var data = res.data || res;
                        if (data.ok !== true) {
                            item.err = data.err || data;
                            item.message = data.message || null;
                            if (_.includes(_controlledErrorsStrings, item.err)) {
                                _controlledErrors[self.id] = item;
                            } else {
                                _errors[self.id] = item;
                            }
                        }
                    }
                    if (!_.isUndefined(_logs[self.id])) {
                        delete _logs[self.id];
                    }
                    if (Object.keys(_logs).length === 0) {
                        r.$emit('logger.clear');
                    }
                }
            }
        };
        fn.addControlledErrors = (arr) => {
            _controlledErrorsStrings = _.union(arr, _controlledErrorsStrings);
        };
        fn.clearErrors = () => _errors = {};
        fn.hasErrors = () => Object.keys(_errors).length > 0;
        fn.hasPending = () => Object.keys(_logs).length > 0;
        fn.pending = () => {
            var msg = 'Pending<br>';
            _.each(_logs, (v, k) => {
                console.info(v.url);
                if (msg !== '') msg += '<br>';
                msg += v.url + ': ' + JSON.stringify(v.req);
            });
            return msg;
        }
        fn.errors = () => {
            var msg = 'Errors<br>';
            _.each(_errors, (v, k) => {
                console.info(v);
                if (msg !== '') msg += '<br>';
                try {
                    msg += v.url + ': ' + JSON.stringify(v.err);
                } catch (e) {
                    msg += v.url + ': ' + 'Unparseable error. See the console.';
                }
            });
            return msg;
        }
        r.state = {
            working: () => fn.hasPending(),
            data: _logs
        };
        r.logger = fn;
        return fn;
    })();
    r.$on('logger.working', () => {
        spinner(true);
        //console.info('LOGGER:WORKING');
    });
    r.$on('logger.clear', () => {
        spinner(false);
        //console.info('LOGGER:CLEAR');
    });

    function getLocalData() {
        return MyPromise(function(resolve, error) {
            if (localData) {
                resolve(localData);
            } else {
                $.getJSON('./data.json', function(data) {
                    localData = data;
                    resolve(localData);
                }).fail(function(jqxhr, textStatus, error) {
                    var err = textStatus + ", " + error;
                    console.log("Request Failed: " + err);
                });
            }
        });
    }


    function handleServerError(err) {
        console.warn(err);
    }

    function handleError(_log, err) {
        _log(err);
        //console.warn(err);
    }

    function get(relativeUrl, data, callback) {
        //        console.warn('URL ' + URL + '/' + relativeUrl);
        var _log = logger(relativeUrl, data);
        http({
            method: 'GET',
            data: data,
            url: URL + '/' + relativeUrl
        }).then(function(res) {
            _log(res);
            if (callback) { callback(res); }
        }, (err) => handleError(_log, err));
    }
    r.get = get;

    function post(relativeUrl, data, callback, error) {
        var _log = logger(relativeUrl, data);
        http({
            method: 'POST',
            data: data,
            url: URL + '/' + relativeUrl
        }).then(function(res) {
            _log(res);
            if (res.data && res.data.ok == false) {
                console.warn('SERVER:REQUEST:WARNING = ', res.data.err || "Unkown error detected");
            }
            return callback(res);
        }, (err) => {
            handleError(_log, err);
            error(err);
        });
    }



    var _dataAvailableRangeDummy = [{
        price: 60,
        diagStart: new Date().getTime() - (1000 * 60) * 30,
        diagEnd: new Date().getTime() + (1000 * 60) * 30,
        _diag: 1
    }, {
        price: 55,
        diagStart: new Date().getTime() - (1000 * 60) * 120,
        diagEnd: new Date().getTime() - (1000 * 60) * 60,
        _diag: 1
    }];

    function login(data) {
        console.log('SEVICE LOGIN', data);
        return MyPromise(function(resolve, error) {
            post('login', data, function(res) {
                resolve(res);
            }, error);
        });
    }

    function save(table, data) {
        return MyPromise(function(resolve, error) {
            post('save/' + table, data, function(res) {
                resolve(res);
            }, error);
        });
    }

    function getSingle(table, data) {
        return MyPromise(function(resolve, error) {
            post('get/' + table, data, function(res) {
                resolve(res);
            }, error);
        });
    }

    function getAll(table, data) {
        return MyPromise(function(resolve, error) {
            get('getAll/' + table, data, function(res) {
                resolve(res);
            }, error);
        });
    }

    function custom(controller, action, data, method) {
        if (method === 'get') {
            return MyPromise(function(resolve, error) {
                get(controller + '/' + action, data, function(res) {
                    resolve(res);
                }, error);
            });
        } else {
            return MyPromise(function(resolve, error) {
                post(controller + '/' + action, data, function(res) {
                    resolve(res);
                }, error);
            });
        }
    }


    ///--------------------------------------- DIAGS RELATED---------BEGIN
    ///--------------------------------------- DIAGS RELATED---------BEGIN
    ///--------------------------------------- DIAGS RELATED---------BEGIN
    ///--------------------------------------- DIAGS RELATED---------BEGIN
    function diagsPriority(cb) {
        ctrl('User', 'getAll', {
            userType: 'diag',
            __rules: {
                disabled: { $ne: true } //exclude disabled diags
            },
            __select: 'diagPriority'
        }).then((data) => {
            cb(data.result.map((v) => ({ _id: v._id, priority: v.diagPriority })));
        })
    }

    function timeRangesDiagSayHeCantWorktype(cb) {
        ctrl('TimeRange', 'getAll', {
            type: 'work-exception',
            __select: '_user start end repeat'
        }).then((data) => {
            cb(data.result.map((v) => (v)));
        })
    }

    function timeRangesDiagIsWorking(order,cb) {
        ctrl('Order', 'getAll', {
            __select: 'diagStart diagEnd _diag',
            __rules: {
                status: { $ne: 'complete' }
            }
        }).then((data) => {

            data.result = data.result.filter(v=>{
                return moment(v.diagStart).isSame(moment(order.day),'day');
            });

            cb(data.result.map((v) => ({ _user: v._diag, start: v.diagStart, end: v.diagEnd })));
        })
    }

    function getAvailableRanges(order) {
        if (!isFinite(new Date(order.day))) {
            throw Error('getAvailableRanges Invalid order day');
        }

        function _data(cb) {
            timeRangesDiagIsWorking(order,(working) => {
                timeRangesDiagSayHeCantWorktype((exceptions) => {
                    diagsPriority((diags) => {
                        cb(working, exceptions, diags);
                    });
                });
            });
        }

        function calc(order, working, exceptions, diags) {
            return diagsCalculateAvailableSlots(order,working,exceptions,diags);
            //order: {day:moment(),time{hours,minutes}} // the time that the order last.
            //working: [{_user,start,end}] // the times that a diag is occupied.
            //exceptions: [{_user,start,end,repeat}] // the times that the diag can't work.
            //diags: [{_user, priority}] //a list of diags.
            //
            //RULES
            //-book the whole day of the diag with Priority = 1 then 2 then 3 
            //-Working day is from 8h to 19h (8am to 7pm)
            //-diagnositquer do not work on sunday
            //We propose Two rendez vous in the morning and two in the afternoon 
            //9h and 10h are proposed by default when calendat is empty for the morning
            //14h and 15h are proposed by default for the afternoon is empty
            //Last beginning time for morning : 11h30
            //Last diag of the day has to finish at 19h  7pm max
            //A diag can start at 00min or 30 ex: 9H30 10H 10h30
            //The diagnostiquer need 30 minutes. Its minimum time between to mission.
            //one hour minimum between each diag beginning
            //console.info('WORKING',working);
            //console.info('EXCEPTIONS',exceptions);
            //console.info('DIAGS',diags)

            //_.orderBy([{p:1},{p:5},{p:2}],(v)=>v.p) //rta: [{p:1},{p:2},{p:5}]

            //is alredy normalized with next tenth calc.
            //order.time = normalizeOrderTime(order.time);

            window.t = order.time;
            var diags = _.orderBy(diags, (v) => v.priority);
            var slots = []; //{_diag,start,end};
            var covered = {
                morning: [],
                afternoon: []
            };

            function _pushSlot(slot, isMorning) {
                if (slots.length < 4) {
                    slots.push(slot);
                    if (isMorning) {
                        covered.morning.push(slot);
                    } else {
                        covered.afternoon.push(slot);
                    }
                }
            }

            diags.forEach((diag) => {
                //diag: A diag with the lowerst priority.

                //MORNING
                if (covered.morning.length < 2) {
                    var hasWorkingExceptions = diagExceptionsCollide(order, diag, exceptions, isBeforeMidDay);
                    if (diagMorningEmpty(order, diag, working)) {
                        if (!hasWorkingExceptions) {
                            console.warn('-MORNING-[]=' + diag._id);
                            _pushSlot({
                                _diag: diag._id,
                                start: moment(new Date(order.day)).hour(9).minutes(0),
                                end: moment(new Date(order.day)).hour(9 + order.time.hours).minutes(0 + order.time.minutes)
                            }, true);
                            _pushSlot({
                                _diag: diag._id,
                                start: moment(new Date(order.day)).hour(10).minutes(0),
                                end: moment(new Date(order.day)).hour(10 + order.time.hours).minutes(0 + order.time.minutes)
                            }, true);
                        } else {
                            console.warn('-MORNING-[EXCEPTIONS]=' + diag._id);
                            var slot = diagMorningCollisionAllocateBefore(order, diag, working, slots, exceptions);
                            if (slot) {
                                _pushSlot(slot, true);
                                slot = null;
                            }
                            slot = diagMorningCollisionAllocateAfter(order, diag, working, slots, exceptions);
                            if (slot) {
                                _pushSlot(slot, true);
                            }
                        }


                    } else {
                        if (hasWorkingExceptions) {
                            console.warn('-MORNING-[ORDERS,EXCEPTIONS]=' + diag._id);
                            var slot = diagMorningCollisionAllocateBefore(order, diag, working, slots, exceptions);
                            if (slot) {
                                _pushSlot(slot, true);
                                slot = null;
                            }
                            slot = diagMorningCollisionAllocateAfter(order, diag, working, slots);
                            if (slot) _pushSlot(slot, true);
                        } else {
                            console.warn('-MORNING-[ORDERS]=' + diag._id);
                            var slot = diagMorningCollisionAllocateBefore(order, diag, working, slots);
                            if (slot) {
                                _pushSlot(slot, true);
                                slot = null;
                            }
                            slot = diagMorningCollisionAllocateAfter(order, diag, working, slots);
                            if (slot) _pushSlot(slot, true);
                        }

                    }
                }

                //AFTERNOON
                if (covered.afternoon.length < 2) {
                    var hasWorkingExceptions = diagExceptionsCollide(order, diag, exceptions, isAfterMidDay);
                    if (diagAfternoonEmpty(order, diag, working)) {
                        if (!hasWorkingExceptions) {
                            console.warn('-AFTERNOON-[]=' + diag._id);
                            _pushSlot({
                                _diag: diag._id,
                                start: moment(new Date(order.day)).hour(14).minutes(0),
                                end: moment(new Date(order.day)).hour(14 + order.time.hours).minutes(0 + order.time.minutes)
                            }, false);
                            _pushSlot({
                                _diag: diag._id,
                                start: moment(new Date(order.day)).hour(15).minutes(0),
                                end: moment(new Date(order.day)).hour(15 + order.time.hours).minutes(0 + order.time.minutes)
                            }, false);
                        } else {
                            console.warn('-AFTERNOON-COMPLEX-[EXCEPTIONS]=' + diag._id);
                            var slot = diagAfternoonCollisionAllocateBefore(order, diag, working, slots, exceptions);
                            if (slot) {
                                _pushSlot(slot, false);
                                slot = null;
                            }
                            slot = diagAfternoonCollisionAllocateAfter(order, diag, working, slots, exceptions);
                            if (slot) _pushSlot(slot, false);
                        }
                    } else {
                        if (hasWorkingExceptions) {
                            console.warn('-AFTERNOON-[ORDERS,EXCEPTIONS]=' + diag._id);
                            var slot = diagAfternoonCollisionAllocateBefore(order, diag, working, slots);
                            if (slot) {
                                _pushSlot(slot, false);
                                slot = null;
                            }
                            slot = diagAfternoonCollisionAllocateAfter(order, diag, working, slots);
                            if (slot) _pushSlot(slot, false);
                        } else {
                            console.warn('-AFTERNOON-[ORDERS]=' + diag._id);
                            var slot = diagAfternoonCollisionAllocateBefore(order, diag, working, slots);
                            if (slot) {
                                _pushSlot(slot, false);
                                slot = null;
                            }
                            slot = diagAfternoonCollisionAllocateAfter(order, diag, working, slots);
                            if (slot) _pushSlot(slot, false);
                        }

                    }
                }
                //
            });

            //slots = covered.morning + covered.afternoon
            slots = _.union(covered.morning, covered.afternoon);
            return slots;
        }
        return MyPromise(function(resolve, error) {
            _data((working, exceptions, diags) => {
                resolve(calc(order, working, exceptions, diags));
            });
        });
    }



    var isAfterMidDay = (d1) => moment(d1).isAfter(moment(d1).hour(13), 'hour');
    var isBeforeMidDay = (d1) => moment(d1).isBefore(moment(d1).hour(12), 'hour');
    var isSameDay = (d1, d2) => moment(d1).isSame(moment(d2), 'day');
    var isSameDayOfWeek = (d1, d2) => moment(d1).day() == moment(d2).day();

    var isRangeCollidingRanges = (start, end, ranges) => {
        var cond = (cb) => ((ranges.filter(v => cb(v))).length == 0);
        var valid = true;
        valid = valid && cond((r) => (
            moment(r.start).isSameOrAfter(start) &&
            moment(r.start).isSameOrBefore(end)
        ));
        valid = valid && cond((r) => (
            moment(r.end).isSameOrAfter(start) &&
            moment(r.end).isSameOrBefore(end)
        ));
        return valid;
    };

    //Try to find an slot in the morning before colliding orders.
    function diagMorningCollisionAllocateBefore(order, diag, working, slots, exceptions) {
        var ms = (d, h, m) => moment(d).subtract(h, 'hour').subtract(m, 'minutes');
        var sameAfter = (d1, d2) => moment(d1).isSameOrAfter(moment(d2), 'minutes');
        var morningOrders = diagMorningOrdersCollisions(order, diag, working);
        if (exceptions) morningOrders = _.union(morningOrders, exceptions);
        var rta = null;
        morningOrders.forEach(wr => {
            //            
            if (exceptions && !isExceptionColliding(wr, order.day)) return;
            //
            var end = ms(wr.start, 1, 30); //1hour, 30min ago
            var start = ms(end, order.time.hours, order.time.minutes);
            var t = normalizeOrderStartTime({
                hours: start.hours(),
                minutes: start.minutes()
            }, false, true); //allocate backwards only. Ex: 9:15 becomes 9:00
            start.hours(t.hours);
            start.minutes(t.minutes);
            end = moment(start).add(order.time.hours, 'hours').add(order.time.minutes, 'minutes'); //fix according start. Ex: 9:45 -> 9:30


            var valid = true;
            valid = valid && isRangeCollidingRanges(start, end, morningOrders);
            valid = valid && isRangeCollidingRanges(start, end, slots);
            valid = valid && sameAfter(start, moment(start).hours(8).minutes(0));
            if (valid) {
                var assignSameDate = (d1, d2) => moment(d1).date(moment(d2).date());
                rta = {
                    _diag: diag._id,
                    start: assignSameDate(start, order.day),
                    end: assignSameDate(end, order.day)
                };
            }
        });
        return rta;
    }

    function diagAfternoonCollisionAllocateBefore(order, diag, working, slots, exceptions) {
        var ms = (d, h, m) => moment(d).subtract(h, 'hour').subtract(m, 'minutes');
        var after = (d1, d2) => moment(d1).isAfter(moment(d2), 'minutes');
        var workRanges = diagAfternoonOrdersCollisions(order, diag, working);
        if (exceptions) workRanges = _.union(workRanges, exceptions);
        var rta = null;
        workRanges.forEach(wr => {
            //
            if (exceptions && !isExceptionColliding(wr, order.day)) return;
            //ex: wr.start 15:00
            ///ex: 13:30
            var limit = ms(wr.start, 1, 30); //1hour, 30min ago

            //ex: 13:00 (an order of 30min)
            var start = ms(limit, order.time.hours, order.time.minutes);
            var t = normalizeOrderStartTime({
                hours: start.hours(),
                minutes: start.minutes()
            }, false, true);
            start.hours(t.hours);
            start.minutes(t.minutes);

            //adjust end
            limit = moment(start).add(order.time.hours, 'hours').add(order.time.minutes, 'minutes');

            //ex: 11:30
            var slotBefore = ms(start, 1, 30);
            //collisions of slotBefore with a morning order finishing after.
            var morningOrders = diagMorningOrdersCollisions(order, diag, working);

            var valid = true;
            valid = valid && isRangeCollidingRanges(start, end, workRanges);
            valid = valid && isRangeCollidingRanges(start, end, slots);
            valid = valid && morningOrders.filter(o => after(o.end, slotBefore)).length == 0;

            if (valid) {
                if (slots.filter(o => after(o.end, slotBefore)).length == 0) {
                    rta = {
                        _diag: diag._id,
                        start: start,
                        end: limit
                    };
                }
            }
        });
        return rta;
    }

    function diagMorningCollisionAllocateAfter(order, diag, working, slots, exceptions) {
        var ms = (d, h, m) => moment(d).add(h, 'hour').add(m, 'minutes');
        var sameBefore = (d1, d2) => moment(d1).isSameOrBefore(moment(d2), 'minutes');
        var sameAfter = (d1, d2) => moment(d1).isSameOrAfter(moment(d2), 'minutes');
        var rta = null;
        var tardeOrders = diagAfternoonOrdersCollisions(order, diag, working);
        var morningOrders = exceptions || diagMorningOrdersCollisions(order, diag, working);
        if (exceptions) morningOrders = _.union(morningOrders, exceptions);

        morningOrders.forEach(wr => {
            //
            if (exceptions && !isExceptionColliding(wr, order.day)) return;
            //
            var start = ms(wr.end, 1, 30); //1hour, 30min after
            var t = normalizeOrderStartTime({
                hours: start.hours(),
                minutes: start.minutes()
            }, true);
            start.hours(t.hours);
            start.minutes(t.minutes);
            var end = ms(start, order.time.hours, order.time.minutes);
            //
            var startLimit = moment(end).hours(11).minutes(30);
            //
            var valid = true && morningOrders.filter(o => sameAfter(o.start, end)).length == 0 && morningOrders.filter(o => sameAfter(o.end, end)).length == 0 &&
                //
                sameBefore(start, startLimit)
                //morningOrders.filter(o => sameBefore(o.start, startLimit)).length == 0;
                //
            valid = valid && isRangeCollidingRanges(start, end, morningOrders);
            valid = valid && isRangeCollidingRanges(start, end, slots);

            if (valid) {
                rta = {
                    _diag: diag._id,
                    start: start,
                    end: end
                };
            }

        });
        return rta;
    }

    function diagAfternoonCollisionAllocateAfter(order, diag, working, slots, exceptions) {
        var ms = (d, h, m) => moment(d).add(h, 'hour').add(m, 'minutes');
        var before = (d1, d2) => moment(d1).isBefore(moment(d2), 'minutes');
        var sameAfter = (d1, d2) => moment(d1).isSameOrAfter(moment(d2), 'minutes');
        var rta = null;
        var workRanges = exceptions || diagAfternoonOrdersCollisions(order, diag, working);
        if (exceptions) workRanges = _.union(workRanges, exceptions);

        workRanges.forEach(wr => {
            //
            if (exceptions && !isExceptionColliding(wr, order.day)) return;
            //
            //ex: wr.start 15:00
            ///ex: 16:30
            var limit = ms(wr.end, 1, 30); //1hour, 30min after
            var t = normalizeOrderStartTime({
                hours: limit.hours(),
                minutes: limit.minutes()
            }, true);
            limit.hours(t.hours);
            limit.minutes(t.minutes);
            //ex: 16:45 (an order of 45min)
            var end = ms(limit, order.time.hours, order.time.minutes);

            //end = limit.add(order.time.hours, 'hours').add(order.time.minutes);

            //ex: 18:15
            //var slotAfter = ms(end, 1, 30);
            //collisions of slotBefore with a morning order finishing after.
            var valid = true;
            valid = valid && isRangeCollidingRanges(start, end, workRanges);
            valid = valid && isRangeCollidingRanges(start, end, slots);
            //
            var tardeOrders = diagAfternoonOrdersCollisions(order, diag, working);
            valid = valid && tardeOrders.filter(o => sameAfter(o.start, end)).length == 0;
            //
            if (valid) {
                if (slots.filter(o => sameAfter(o.start, end)).length == 0) {
                    if (before(end, moment(end).hour(19).minutes(0))) {
                        rta = {
                            _diag: diag._id,
                            start: limit,
                            end: end
                        };
                    }
                }
            }
        });
        return rta;
    }

    function diagAfternoonOrdersCollisions(order, diag, workRanges) {
        var rta = [];
        workRanges.forEach((workRange) => {
            if (workRange._user !== diag._id) return;
            if (isSameDay(workRange.start, order.day)) {
                if (isAfterMidDay(workRange.start)) {
                    rta.push(workRange);
                }
            }
        });
        return rta;
    }

    function diagAfternoonEmpty(order, diag, workRanges) {
        var rta = true;
        workRanges.forEach((workRange) => {
            if (workRange._user !== diag._id) return;
            if (isSameDay(workRange.start, order.day)) {
                if (isAfterMidDay(workRange.start)) {
                    rta = false;
                }
            }
        });
        return rta;
    }

    function diagMorningOrdersCollisions(order, diag, workRanges) {
        var rta = [];
        workRanges.forEach((workRange) => {
            if (workRange._user !== diag._id) return;
            if (isSameDay(workRange.start, order.day)) {
                if (isBeforeMidDay(workRange.start)) {
                    rta.push(workRange);
                }
            }
        });
        return rta;
    }

    function diagMorningEmpty(order, diag, workRanges) {
        var rta = true;
        workRanges.forEach((workRange) => {
            if (workRange._user !== diag._id) return;
            if (isSameDay(workRange.start, order.day)) {
                if (isBeforeMidDay(workRange.start)) {
                    rta = false;
                }
            }
        });
        return rta;
    }

    function diagExceptionsCollide(order, diag, exceptions, isBeforeAfterFn) {
        var sameDay = false,
            repeatDay = false,
            repeatWeek, sameDOW, collide;
        return exceptions.filter((range) => {
            if (range._user !== diag._id) return false;
            collide = (true && isBeforeAfterFn(range.start));
            sameDay = isSameDay(range.start, order.day);
            repeatDay = range.repeat == 'day';
            repeatWeek = range.repeat == 'week';
            sameDOW = isSameDayOfWeek(order.day, range.start);
            collide = collide &&
                (
                    sameDay || repeatDay || (repeatWeek && sameDOW)
                );
            return collide;
        }).length !== 0;
    }

    function isExceptionColliding(range, date) {
        return (true && isSameDay(range.start, date)) ||
            (true && range.repeat == 'day') ||
            (true && range.repeat == 'week' && isSameDayOfWeek(date, range.start));
    }

    ///--------------------------------------- DIAGS RELATED------------ END
    ///--------------------------------------- DIAGS RELATED------------ END
    ///--------------------------------------- DIAGS RELATED------------ END
    ///--------------------------------------- DIAGS RELATED------------ END
    ///--------------------------------------- DIAGS RELATED------------ END

    function ctrl(ctrl, action, data) {
        return MyPromise(function(resolve, error) {

            post('ctrl/' + ctrl + '/' + action, data, function(res) {
                //console.info('CTRL: ',res.data);
                return resolve(res.data);
            }, error);

        });
    }
    var ws = {
        URL: () => URL,
        getAvailableRanges: getAvailableRanges,
        login: login,
        save: save,
        get: getSingle,
        getAll: getAll,
        localData: getLocalData,
        custom: custom,
        http: function(ctrl, action, data) {
            return http.post(URL + '/' + 'ctrl/' + ctrl + '/' + action, data);
        },
        form: (relativeURL, data) => {
            if (!data.file) throw Error('form: file arg required');
            return MyPromise((r, err) => {
                var file = data.file;
                delete data.file;
                var _log = logger(relativeURL, data);
                fileUpload.single({
                    url: URL + '/' + relativeURL,
                    file: file,
                    data: data
                }, res => {
                    _log(res);
                    r(res);
                }, res => {
                    _log(res);
                    err(res);
                });
            });
        },
        ctrl: ctrl,
        $get: (url, config) => {
            return MyPromise(function(resolve, error) {
                var _log = logger(url, data);
                http.get(url, config).then((res) => {
                    _log({
                        ok: true,
                        result: res
                    });
                    resolve(res);
                }, (err) => {
                    _log({
                        ok: false,
                        err: err
                    });
                    error(err);
                })
            });
        },
        $post: (url, data, config) => {
            return MyPromise(function(resolve, error) {
                var _log = logger(url, data);
                http.post(url, data, config).then((res) => {
                    _log({
                        ok: true,
                        result: res
                    });
                    resolve(res);
                }, (err) => {
                    _log({
                        ok: false,
                        err: err
                    });
                    error(err);
                })
            });
        },
        post: function(url, data) {
            return MyPromise(function(resolve, error) {
                post(url, data, function(res) {
                    resolve(res);
                }, error);
            });
        }
    };
    r.ws = ws;
    return ws;
}]);

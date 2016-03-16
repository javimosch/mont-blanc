function diagsCalculateAvailableSlotsDeprecated(order, working, exceptions, diags) {
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
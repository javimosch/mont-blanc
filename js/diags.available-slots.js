((global) => {
    global.diagsCalculateAvailableSlots = diagsCalculateAvailableSlots;
    //////////////////
    function diagsCalculateAvailableSlots(order, working, exceptions, diags) {
       //console.log('diagsCalculateAvailableSlots');
        var slots = {
            morning: [],
            afternoon: []
        };
        var diags = _.orderBy(diags, (v) => v.priority);
        diags.forEach((diag) => {
            //
            //exceptions that collide in the whole day.
            var _exceptions = orderDiagExceptions(order, diag, exceptions);
            //a sum of the active orders of the day plus exceptions.
            var _collisions = _.union(filterOrders(working,diag), _exceptions);
            //
            //we sum already assigned slots
            _collisions = _.union(_collisions, slots.morning);
            _collisions = _.union(_collisions, slots.afternoon);
            //
            if (slots.morning.length < 2) {
                if (freeMorning(order, _collisions)) {
                    slots.morning.push(slot(9, 0, order, diag), slot(10, 0, order, diag));
                } else {
                    var sumo = allocateMorning(diag, order, _collisions, slots);
                    if (sumo && slots.morning.length < 2) {
                        _collisions.push(slots.morning[slots.morning.length - 1]);
                        allocateMorning(diag, order, _collisions, slots);
                    }
                }
            }
            //
            if (slots.afternoon.length < 2) {
                if (freeAfternoon(order, _collisions)) {
                    slots.afternoon.push(slot(14, 0, order, diag), slot(15, 0, order, diag));
                } else {
                    var sumo = allocateAfternoon(diag, order, _collisions, slots);
                    if (sumo && slots.afternoon.length < 2) {
                        _collisions.push(slots.afternoon[slots.afternoon.length - 1]);
                        allocateAfternoon(diag, order, _collisions, slots);
                    }
                }
            }
            //
            //console.info(_collisions);
        });
        return _.union(slots.morning, slots.afternoon);
    }
    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////
    function filterOrders(orders,diag){
    	return orders.filter(v=>{
    		return v._user == diag._id;
    	});
    }
    function allocateMorning(diag, order, collisions, arr) {
        return allocate(8, 0, 11, 30, diag, order, collisions, arr, 'morning');
    }

    function allocateAfternoon(diag, order, collisions, arr) {
        var startMax = moment(order.day).hours(19).minutes(0).subtract(order.time.hours, 'hour').subtract(order.time.minutes, 'minutes');
        //
        return allocate(13, 0, startMax.hours(), startMax.minutes(), diag, order, collisions, arr, 'afternoon');
    }

    function normalizeStart(start){
        start = moment(start);
        var h = start.hours();
        var m = start.minutes();
        if(m>0 && m<30) m = 30;
        if(m>30){
             m = 0;
             h++;
        }
        return start.hours(h).minutes(m);
    }

    function allocate(startMinH, startMinM, startMaxH, startMaxM, diag, order, collisions, arr, propName) {
        var startMin = moment(order.day).hour(startMinH).minutes(startMinM);
        var startMax = moment(order.day).hour(startMaxH).minutes(startMaxM);
        var cut = false,
            start = moment(startMin),
            _cols = [],
            c = 0;
        //rangeCollisions4(start, order, collisions);
        //console.log('allocate[' + diag._id + ']:start=' + start.format('HH:mm'));
        do {
            //------------------
            //rangeCollision4: start, end: order duration.
            _cols = rangeCollisions4(start, order, collisions);
            if (_cols.length == 0) {
                _cols = rangeCollisions5(orderEnd(start, order), 1, 30, collisions);
                if (_cols.length == 0) {
                    //available!
                    var _s = slot(start.hours(), start.minutes(), order, diag);
                   //console.info('allocate:success=' + JSON.stringify(_s));
                    arr[propName].push(_s);
                    return true;
                } else {
                    start = moment(_cols[_cols.length - 1].end).add(1, 'hours').add(30, 'minutes');
                    start = normalizeStart(start);
                }
            } else {
                start = moment(_cols[_cols.length - 1].end).add(1, 'hours').add(30, 'minutes');
                start = normalizeStart(start);
            }
            //console.log('allocate:moving=' + start.format('HH:mm'));
            //------------------
            c++;
            if (c > 20) cut = true;
        } while (moment(start).isBefore(moment(startMax)) || cut);
        if (cut) {
           //console.warn('allocate while warning.');
        } else {
           //console.log('allocate:not-posible');
        }
        return false;
    }

    function freeMorning(order, collisions) {
        var lastAssignableMorningDate = moment(order.day).hours(11).minutes(30);
        return collisions.filter(v => {
            return moment(v.start).isBefore(lastAssignableMorningDate);
        }).length == 0;
    }

    function freeAfternoon(order, collisions) {
        var minAssignableAfternoonDate = moment(order.day).hours(13).minutes(00);
        return collisions.filter(v => {
            return moment(v.start).isAfter(minAssignableAfternoonDate);
        }).length == 0;
    }

    function slot(h, m, order, diag) {
        var start = moment(order.day).hour(h).minutes(m);
        return {
            _diag: diag._id,
            start: start,
            end: moment(start).add(order.time.hours, 'hours').add(order.time.minutes, 'minutes')
        };
    }

    function orderEnd(start, order) {
        return moment(start).add(order.time.hours, 'hours').add(order.time.minutes, 'minutes');
    }

    function rangeCollisions5(date, hp, mp, collisions) {
        return rangeCollisions2(
            date, moment(date).hours(), moment(date).minutes(), hp, mp, collisions);
    }

    function rangeCollisions4(start, order, collisions) {
        return rangeCollisions(start, orderEnd(start, order), collisions);
    }

    function rangeCollisions3(date, h, m, timePlus, collisions) {
        return rangeCollisions2(date, h, m, timePlus.hours, timePlus.minutes, collisions);
    }

    function rangeCollisions2(date, h, m, hp, mp, collisions) {
        var start = moment(date).hour(h).minutes(m);
        var end = moment(start).add(hp, 'hours').add(mp, 'minutes');
        return rangeCollisions(start, end, collisions)
    }

    function rangeCollisions(start, end, collisions) {
        var get = (cb) => (collisions.filter(v => cb(v)) || []);
        var rta = get((r) => (
            moment(r.start).isSameOrAfter(start) &&
            moment(r.start).isSameOrBefore(end)
        ));
        _.union(rta, get((r) => (
            moment(r.end).isSameOrAfter(start) &&
            moment(r.end).isSameOrBefore(end)
        )));
        //
       /*
       console.info('rangeCollisions ' + moment(start).format('HH:mm') + ' - ' + moment(end).format('HH:mm') + ' collisions:' + JSON.stringify(collisions.map(v => {
            return
            moment(v.start).format('HH:mm') + ' - ' + moment(v.end).format('HH:mm');

        })) + ' == Collisions: ' + (rta.length));*/
        return rta;
    }

    function orderDiagExceptions(order, diag, exceptions) {
        var sameDay = false,
            repeatDay = false,
            repeatWeek, sameDOW, collide;
        return exceptions.filter((range) => {
            if (range._user !== diag._id) return false;
            collide = true;
            sameDay = moment(range.start).isSame(order.day, 'day');
            repeatDay = range.repeat == 'day';
            repeatWeek = range.repeat == 'week';
            sameDOW = moment(order.day).day() == moment(range.start).day();
            collide = collide &&
                (
                    sameDay || repeatDay || (repeatWeek && sameDOW)
                );
            return collide;
        });
    }
})(typeof exports !== 'undefined' && exports || window);

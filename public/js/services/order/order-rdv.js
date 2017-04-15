/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
    var app = angular.module('app').service('orderRdv', ['$rootScope', '$log', 'server', function($rootScope, $log, db) {

        var DIAG_NAME = {};

        function fetchDiagGuys(settings) {
            return $U.MyPromise(function(resolve, err, emit) {
                var payload = {
                    userType: 'diag',
                    __rules: {
                        disabled: {
                            $ne: true
                        }
                    },
                    __select: 'priority firstName'
                };
                if (settings.department) {
                    payload.__rules.departments = {
                        $eq: settings.department.toString()
                    };
                }
                db.ctrl('User', 'getAll', payload).then((data) => {
                    data.result.forEach(function(d) {
                        DIAG_NAME[d._id] = d.firstName;
                    });

                    data.result = _.orderBy(data.result, (v) => {
                        return v.priority
                    });

                    //$log.debug('diag-order',data.result);

                    var rta = data.result.map((v) => {
                        return v._id
                    });

                    //$log.debug('diag-map',rta);

                    resolve(rta);
                });
            });
        }

        function fetchOrdersFromTheSameDay(date) {
            //$log.debug('fetchOrdersFromTheSameDay', moment(date).dayOfYear());
            return db.ctrl('Order', 'getAll', {
                __select: 'start end _diag',
                __rules: {
                    //start: {
                    //  $dayOfYear: moment(date).dayOfYear()
                    //},
                    status: {
                        $ne: 'complete'
                    }
                }
            });
        }

        function fetchDiagsUnavailabilities() {
            return db.ctrl('TimeRange', 'getAll', {
                type: 'work-exception',
                __select: '_user start end repeat weekday description'
            });
        }

        function fetchCollisions(rdvDate) {
            return $U.MyPromise(function(resolve, err, emit) {
                var collisions = [];
                fetchOrdersFromTheSameDay().then(function(res) {
                    if (res.result) {
                        res.result = res.result.filter(v => {
                            return moment(v.start).isSame(moment(rdvDate), 'day');
                        });
                        collisions = res.result.map(function(order) {
                            return {
                                _user: order._diag,
                                start: order.start,
                                end: order.end
                            };
                        });
                        //$log.debug('rdv fetchCollisions', 'are orders', collisions.length);
                    }
                    fetchDiagsUnavailabilities().then(function(res) {
                        if (res.result) {
                            var unavailabilitiesCollisions = res.result.filter(function(workExceptionItem) {
                                if (workExceptionItem.repeat == 'day') return true;
                                if (workExceptionItem.repeat == 'week') {
                                    if (moment(rdvDate).weekday() == workExceptionItem.weekday) return true;
                                }
                                if (workExceptionItem.repeat == 'none') {
                                    return true;
                                }
                                return false;
                            });
                            //$log.debug('rdv fetchCollisions', 'are unavailabilities', unavailabilitiesCollisions.length);
                            collisions = _.concat(collisions, unavailabilitiesCollisions);
                            resolve(collisions);
                        }
                    });
                });
            });
        }

        function isDiagAvailableAtCursor(id, collisions, cursor, settings) {
            //id:string
            //collisions: {_user,start,end,repeat (none,day,week,undefined)}

            if (collisions.length > 0) {
                //$log.debug(DIAG_NAME[id] || id, 'AVAILABLE?', collisions);
            }

            var end = moment(cursor).add(settings.time.hours, 'hours').add(settings.time.minutes, 'minutes');
            var equal = end._d == moment(cursor)._d;
            var hasCollisions = collisions.filter((r) => {
                if (r.repeat && r.repeat === 'none') {
                    if (moment.range(r.start, r.end).overlaps(moment.range(cursor, end))) {
                        //$log.debug(DIAG_NAME[id] || id, 'COLLIDE(specific overlap)!', JSON.stringify(r));
                        return true;
                    }
                    else {
                        return false;
                    }
                }
                if (r.repeat && r.repeat === 'day' || r.repeat === 'week') {
                    if (r.weekday != moment(cursor).weekday()) return false;
                    r.start = moment(cursor).hour(moment(r.start).hour()).minutes(moment(r.start).minutes());
                    r.end = moment(cursor).hour(moment(r.end).hour()).minutes(moment(r.end).minutes());
                    if (moment.range(r.start, r.end).overlaps(moment.range(cursor, end))) {
                        //$log.debug(DIAG_NAME[id] || id, 'COLLIDE('+(r.repeat)+' overlaps)!', JSON.stringify(r));
                        return true;
                    }
                    return false;
                }
                if (!r.repeat) {
                    if (moment.range(r.start, r.end).overlaps(moment.range(cursor, end))) {
                        //$log.debug(DIAG_NAME[id] || id, 'COLLIDE(order overlaps)!', JSON.stringify(r));
                        return true;
                    }
                    return false;
                }

                $log.warn('RDV unknown collision', r);
                return false;
            }).length > 0;
            if (!hasCollisions) {
                //$log.debug(DIAG_NAME[id] || id, "free at", moment(cursor).format("HH:mm"));

                //if cursor end (end of assignment) exceed 19h00, false
                var end = moment(cursor).add(settings.time.hours, 'hours').add(settings.time.minutes, 'minutes');
                if (moment(end).isAfter(moment(end).hour(18).minutes(59))) {
                    return false;
                }

            }
            return !hasCollisions;
        }

        function createRdvSlot(diagId, cursor, settings) {
            return {
                _diag: diagId,
                start: moment(cursor),
                end: moment(cursor).add(settings.time.hours, 'hours').add(settings.time.minutes, 'minutes')
            };
        }

        function moveSlotCursorForward(cursor, settings) {
            //we sum the order duration
            var rta = moment(cursor).add(settings.time.hours, 'hours').add(settings.time.minutes, 'minutes');
            //we sum 30min
            //rta = moment(rta).add(30, 'minutes');
            //normalize (:00 or :30)
            rta = normalizeDate(rta);
            //11:30am max morning slot, continue at 13:00
            if (moment(rta).isAfter(moment(rta).hours(11).minutes(30)) && moment(rta).isBefore(moment(rta).hours(13).minutes(0))) {
                rta = moment(rta).hours(13).minutes(0);
            }
            return rta;
        }

        function normalizeDate(date) {
            date = moment(date);
            var h = date.hours();
            var m = date.minutes();
            if (m > 0 && m < 30) m = 30;
            if (m > 30) {
                m = 0;
                h++;
            }
            return date.hours(h).minutes(m);
        }

        function getInitialCursorDate(settings) {
            if (moment(settings.date).isSame(moment(), 'day')) {
                var rta = normalizeDate(moment()).add(2, 'hour');

                if (moment(rta).hour() > 19 || moment(rta).hour() < 8) {
                    //case scenario: today after 9pm moves the cursor forward to 00h00
                    //case scenario: today evening
                    return null;
                }

                return rta;
            }
            else {
                return moment(settings.date).hour(8).minutes(0);
            }
        }

        function isFixedSlots(settings) {
            return settings.fixedSlots != undefined && settings.fixedSlots == true;
        }


        function isFutureDate(m){
            return !m.isSame(moment(),'day') || ( m.isSame(moment(),'day') && m.subtract(30,'minutes').isAfter(moment()));
        }


        function getAll(settings) {
            var ID = "RDV-" + moment(settings.date).format('DD-MM') + moment().format('--ss-SSS');
            //$log.debug(ID, 'START date', moment(settings.date).format('DD/MM'), 'time', settings.time.hours, ':', settings.time.minutes);
            //settings.date  :  fixed date (day) for diags.
            //settings.time : {hours,minutes}


            var slots = []; //{_diag,start,end}
            var cursor = getInitialCursorDate(settings);
            //            $log.debug(ID, 'CURSOR START at', moment(cursor).format("HH:mm"));
            var diagId = -1,
                diagCollisions = null;



            return $U.MyPromise(function(resolve, err, emit) {

                if (cursor == null || moment(cursor).isAfter(moment(cursor).hour(18).minutes(59))) {
                    //$log.debug(ID, 'RESOLVE(HOUR IS AFTER 19h00)');
                    return resolve([]);
                }

                fetchDiagGuys(settings).then(function(rdvDiags) {
                    //$log.debug(ID, 'DIAGS_LENGTH', rdvDiags.length);
                    fetchCollisions(settings.date).then(function(diagsCollisions) {
                        //$log.debug(ID, 'TOTAL_COLLISIONS', diagsCollisions.length);


                        function allocateSlots(rdvDiags, diagCollisions, iterations) {
                            //$log.debug(ID, 'allocate START iterations ', iterations);
                            if (iterations == 0) {
                                //$log.debug(ID, 'RESOLVE (ITERATIONS WARN)', slots.length, 'slots');
                                //return resolve(slots);
                            }
                            var diagCollisions;
                            for (var index in rdvDiags) {
                                diagId = rdvDiags[index];
                                diagCollisions = [];
                                if (settings.diagId != undefined) {
                                    if (settings.diagId != diagId) {
                                        continue;
                                    }
                                }

                                //$log.debug(ID, 'diag', diagId);
                                diagCollisions = diagsCollisions.filter(function(collision) {
                                    return collision._user == diagId;
                                });

                                if (isFixedSlots(settings)) {
                                    //morning

                                    
                                    var availableAtSlot1 = isDiagAvailableAtCursor(diagId, diagCollisions, moment(cursor).hour(9).minutes(0), settings) && slots.length < 4 && isFutureDate(moment(cursor).hour(9).minutes(0));

                                    if (availableAtSlot1) {
                                        slots.push(createRdvSlot(diagId, moment(cursor).hour(9).minutes(0), settings));
                                    }
                                    var availableAtSlot2 = isDiagAvailableAtCursor(diagId, diagCollisions, moment(cursor).hour(10).minutes(0), settings) && slots.length < 4 && isFutureDate(moment(cursor).hour(10).minutes(0));
                                    if (availableAtSlot2) {
                                        slots.push(createRdvSlot(diagId, moment(cursor).hour(10).minutes(0), settings));
                                    }

                                    //afternoon
                                    availableAtSlot1 = isDiagAvailableAtCursor(diagId, diagCollisions, moment(cursor).hour(14).minutes(0), settings) && slots.length < 4 && isFutureDate(moment(cursor).hour(14).minutes(0));
                                    if (availableAtSlot1) {
                                        slots.push(createRdvSlot(diagId, moment(cursor).hour(14).minutes(0), settings));
                                    }
                                    availableAtSlot1 = isDiagAvailableAtCursor(diagId, diagCollisions, moment(cursor).hour(15).minutes(0), settings) && slots.length < 4 && isFutureDate(moment(cursor).hour(15).minutes(0));
                                    if (availableAtSlot2) {
                                        slots.push(createRdvSlot(diagId, moment(cursor).hour(15).minutes(0), settings));
                                    }

                                    if (slots.length == 4) {
                                        // $log.debug(ID, 'resolved with', slots.length, ' fixed slots');
                                        return resolve(slots);
                                    }
                                    else {
                                        continue; //next diag man
                                    }
                                }
                                else {
                                    //$log.debug(ID, 'diag owns', diagCollisions.length, 'collisions');
                                    if (isDiagAvailableAtCursor(diagId, diagCollisions, cursor, settings)) {



                                        slots.push(createRdvSlot(diagId, cursor, settings));
                                        //$log.debug(ID, DIAG_NAME[diagId] || diagId, 'ASSIGNED!', moment(slots[slots.length - 1].start).format("HH:mm"));
                                        break;
                                    }
                                    else {
                                        //$log.debug(ID, 'diag', 'collide', moment(cursor).format('HH:mm'));
                                    }
                                }


                            }

                            if (isFixedSlots(settings)) {
                                // $log.debug(ID, 'resolved (after loop) with', slots.length, ' fixed slots');
                                return resolve(slots);
                            }
                            else {
                                cursor = moveSlotCursorForward(cursor, settings);

                                //$log.debug(ID, 'loop end, cursor at', moment(cursor).format('HH:mm'));
                                if (moment(cursor).isAfter(moment(cursor).hour(18).minutes(59))) {
                                    $log.debug(ID, 'resolved with', slots.length, 'slots');
                                    return resolve(slots);
                                }
                                else {
                                    //$log.debug(ID, ' CURSOR-TO', cursor.format('HH:mm'));
                                    setTimeout(function() {
                                        //$log.debug(ID,'HERE SHOULD MOVE AHEAD',slots.length,'slots so far.');
                                        allocateSlots(rdvDiags, diagsCollisions, iterations + 1);
                                    }, 0);

                                }
                            }
                        }


                        allocateSlots(rdvDiags, diagsCollisions, 0);
                    });
                });
            });
        }

        //ALL: Working day is from 8h to 19h (8am to 7pm)
        //FIXED SLOTS: We propose Two rendez vous in the morning and two in the afternoon 
        //FIXED SLOTS: 9h and 10h are proposed by default when calendat is empty for the morning
        //FIXED SLOTS: 14h and 15h are proposed by default for the afternoon is empty
        //ALL: Last beginning time for morning : 11h30
        //ALL: Last diag of the day has to finish at 19h  7pm max
        //ALL: A diag can start at 00min or 30 ex: 9H30 10H 10h30
        //ALL: The diagnostiquer need 30 minutes. Its minimum time between to mission.


        var self = {
            getAll: getAll
        };
        return self;

    }]);
})();

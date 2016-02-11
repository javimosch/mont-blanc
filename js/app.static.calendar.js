angular.module('app.static.calendar', []).controller('calendar', ['$scope', 'server', '$rootScope', calendar]);

function calendar(s, server, r) {
    console.info('ctrl.calendar');
    var c = this;


    c.panel = 'CALENDAR' //CALENDAR,EMAIL
    r.selectedDate = '';
    c.range = '';

    c.pickDate = function(rr) {
        r.selectedDateRange = rr._id;
        //console.warn('range:',rr,c.range);
    };

    c.init = function(main) {
        c.main = main;
        if (c.main.state == c.main.states.CALENDAR && c.initialized !== true) {
            r.onCalendarInit();
        }
    };

    r.$on('CALENDAR.CONTINUE', function() {
        if (!r.selectedDateRange) {
            alert('Select a datetime');
        } else {
            console.log('gotoemail');
        }
    });

    r.onCalendarInit = function() {
        console.log('onCalendarInit')
        r.dom(function() {

            var $lastDate = null;
            $calendar = $('#calendar').fullCalendar({
                dayClick: function(date, jsEvent, view) {
                    var dateFormated = date.format();
                    r.selectedDate = date.format('MMMM Do YYYY, dddd');
                    server.getAvailableRanges(dateFormated).then(function(data) {
                        c.availableRanges = data;
                        console.log('availableRanges', c.availableRanges);
                        r.dom(function() {});
                    });

                    var $curr = $(this);
                    r.dom(function() {
                        if ($lastDate) $lastDate.css('background', 'transparent');
                        $curr.css('background', 'rgba(0,0,0,.2)');
                        $lastDate = $curr;
                    });
                }
            });



            /*
                        $('#timepicker1').timepicker().on('changeTime.timepicker', function(e) {
                            console.log('The time is ' + e.time.value);
                            console.log('The hour is ' + e.time.hours);
                            console.log('The minute is ' + e.time.minutes);
                            console.log('The meridian is ' + e.time.meridian);
                        });*/
        });
        c.initialized = true;
    };

    r.milliToHours = function(milli) {
        return Math.floor(((milli / 1000) / 60) / 60);
    };

    c.drawRange = function(rng) {
        return moment(rng.from).format("HH:mm") + 'h - ' + moment(rng.to).format("HH:mm") + 'h';
    };
}

var app = angular.module('app.admin.calendar', []);

app.directive('globalCalendar', function(
    $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server) {
    return {
        restrict: 'AE',
        replace: true,
        scope: {},
        templateUrl: 'views/directives/directive.diag.calendar.html',
        link: function(s, elem, attrs) {
            var r = $rootScope;
            var ws = server;
            var m = moment();
            var y = m.year();
            var mo = m.month();
            window.s = s;
            s.calendarView = 'year';
            s.views = {
                label: 'View Type',
                selected: s.calendarView,
                click: (x) => {
                    s.calendarView = x.label.toLowerCase();
                    s.views.selected = s.calendarView;
                    r.dom();
                },
                items: [
                    { label: 'Day' },
                    { label: 'Week' },
                    { label: 'Month' },
                    { label: 'Year' },
                ]
            };
            s.calendarDate = new Date();
            s.events = r.cache('global.calendar.events')|| [];
            function update() {
                ws.ctrl('Order', 'getAll', { __populate: ['_client', 'email'] }).then((res) => {
                    if (res.ok) {
                        var evts = [];
                        res.result.forEach((v) => {
                            v.start = moment(v.diagStart).format('HH:mm');
                            v.end = moment(v.diagEnd).format('HH:mm');
                            evts.push({
                                item: v,
                                title: 'Order ',
                                type: 'info',
                                startsAt: new Date(v.diagStart),
                                endsAt: new Date(v.diagEnd),
                                editable: false,
                                deletable: false,
                                draggable: false,
                                resizable: false,
                                incrementsBadgeTotal: true,
                                //recursOn: 'year', // If set the event will recur on the given period. Valid values are year or month
                                cssClass: 'a-css-class-name' //A CSS class (or more, just separate with spaces) that will be added to the event when it is displayed on each view. Useful for marking an event as selected / active etc

                            });
                            s.events = evts;
                        });
						r.cache('global.calendar.events',s.events);
                    }
                });
            }
            s.eventClicked = (calendarEvent) => {
            	r.params = {
            		item:calendarEvent.item,
            		prevRoute:'global-calendar'
            	};
            	r.route('orders/edit/'+calendarEvent.item._id);
            };
            update();
        }
    };
});

var app = angular.module('app', [
    'app.admin',
    'app.admin.routes',
    'app.admin.login',
    'app.admin.user',
    'app.diag',
    'app.diag.balance',
    'app.order',
    'app.client',
    'app.diag',
    'app.admin.calendar',
    'app.notifications',
    'app.admin.client.payments',
    'app.common.directives',
    'app.common.service',
    'app.common.root',
    'tools',
    'ngRoute',
    'mwl.calendar',
    'ui.bootstrap',
    'ui.bootstrap.datetimepicker'
]);

app.run(['server', '$timeout', '$rootScope', function(db, $timeout, r) {
    //    console.info('app.admin:run');

    r.navShow = true;

    r.toggleNavbar = function(val) {
        r.navShow = val;
        r.dom();
    };
    r.secureSection = function(_s) {
        _s.show = false;
        if (!r.logged()) {
            console.warn('secureSection:redirecting to login');
            r.route('login');
        } else {
            _s.show = true;
        }
    };

    r.handleSecurityRouteViolation = () => {
        r.route('dashboard');
        console.warn('SECURITY: YOU-DONT-BELONG-HERE');
    };


    //go back (escape key)
    $('html').keydown(function(event) {
        if ('27' == event.keyCode) {
            if (r.params && r.params.prevRoute && r.__currentCtrlScope) {
                if (r.__currentCtrlScope.back) {
                    if (r.state.working()) {
                        r.message('Loading...', {
                            type: 'warning',
                            duration: 2000
                        });
                        return;
                    }
                    var fn = r.__currentCtrlScope.back;
                    r.__currentCtrlScope = null;
                    fn();
                }
                //return r.route(r.params.prevRoute);
            }
        };
    });

    r.setCurrentCtrl = (_s) => { r.__currentCtrlScope = _s };



}]);

app.config(function(calendarConfig) {
    //    console.log(calendarConfig); //view all available config
    //calendarConfig.templates.calendarMonthView = 'path/to/custom/template.html'; //change the month view template to a custom template
    calendarConfig.dateFormatter = 'moment'; //use either moment or angular to format dates on the calendar. Default angular. Setting this will override any date formats you have already set.
    //calendarConfig.allDateFormats.moment.date.hour = 'HH:mm'; //this will configure times on the day view to display in 24 hour format rather than the default of 12 hour
    //calendarConfig.allDateFormats.moment.title.day = 'ddd D MMM'; //this will configure the day view title to be shorter
    //calendarConfig.i18nStrings.eventsLabel = 'Events'; //This will set the events label on the day view
    //calendarConfig.displayAllMonthEvents = true; //This will display all events on a month view even if they're not in the current month. Default false.
    calendarConfig.displayEventEndTimes = true; //This will display event end times on the month and year views. Default false.
    calendarConfig.showTimesOnWeekView = true; //Make the week view more like the day view, with the caveat that event end times are ignored.
});

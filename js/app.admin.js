var app = angular.module('app', [
    'app.admin.routes',
    'app.admin.login',
    'app.admin.user',
    'app.admin.diag',
    'app.admin.order',
    'app.admin.inspector',
    'app.common.directives',
    'app.common.service',
    'app.common.root',
    'ngRoute',
    'mwl.calendar',
    'ui.bootstrap'
]);

app.run(['server', '$timeout', '$rootScope', function(db, $timeout, r) {
    console.info('app.admin:run');

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

app.controller('adminDashboard', [

    'server', '$scope', '$rootScope',
    function(db, s, r) {
        console.info('app.admin.login:adminDashboard');
        //
        r.toggleNavbar(true);
        r.secureSection(s);
    }
]);


app.controller('adminClients', [

    'server', '$scope', '$rootScope',
    function(db, s, r) {
        console.info('app.admin.login:adminClients');
        //
        r.toggleNavbar(true);
        r.secureSection(s);
        s.selectedItems = [];
        s.items = [];
        //
        s.click = function(item) {
            r.route('clients/edit/' + item._id);
        };
        s.create = function() {
            r.route('clients/edit/-1');
        };
        s.delete = function(item) {
            s.confirm('Remove ' + s.selectedItems.length + ' item/s?', function() {
                console.log('adminClients:removeAll:in-progress');
                s.message('deleting . . .', 'info');
                db.custom('user', 'removeAll', {
                    ids: s.selectedItems
                }).then(function(res) {
                    s.message('deleted', 'info');
                    read();
                    console.info('adminClients:removeAll:success', r.data);
                }).error(function(err) {
                    s.message('error, try later.', 'danger');
                    console.warn('adminClients:removeAll:error', err);
                });
            });
        };
        s.select = function() {
            if (window.event) {
                window.event.stopPropagation();
            }
        };

        function read() {
            s.message('loading . . .', 'info');
            db.custom('user', 'getAll', { userType: 'client' }).then(function(r) {
                console.info('adminClients:read:success');
                s.items = r.data.result;
                s.message('loaded!', 'success', 1000);
            });
        }
        r.dom(read, 0);

    }
]);

app.controller('adminClientsEdit', [

    'server', '$scope', '$rootScope', '$routeParams',
    function(db, s, r, params) {
        console.info('app.admin.login:adminClientsEdit');
        //
        r.toggleNavbar(true);
        r.secureSection(s);
        r.dom();
        //
        s.item = {
            email: '',
            password: ''
        };
        s.original = _.clone(s.item);
        //
        if (params && params.id && params.id.toString() !== '-1') {
            console.info('adminClientsEdit:params', params);
            r.dom(read, 1000);
        } else {
            console.info('adminClientsEdit:reset');
            reset();
        }
        //
        s.cancel = function() {
            r.route('clients');
        };
        s.save = function() {
            s.message('saving . . .', 'info');
            s.requesting = true;
            db.custom('user', 'save', s.item).then(function(res) {
                s.requesting = false;
                console.info('adminClientsEdit:save:success');
                s.message('saved', 'success');
                r.route('clients', 500);
            }).error(function(err) {
                s.requesting = false;
                s.message('error, try later.', 'danger');
                console.warn('adminClientsEdit:save:error', err);
            });

        };
        s.delete = function() {
            s.confirm('Delete Client ' + s.item.email + ' ?', function() {
                console.log('adminClientsEdit:remove:in-progress');
                s.message('deleting . . .', 'info');
                s.requesting = true;
                db.custom('user', 'remove', {
                    _id: s.item._id
                }).then(function(res) {
                    s.requesting = false;
                    s.message('deleted', 'info');
                    reset();
                    r.route('clients', 500);
                    console.info('adminClientsEdit:remove:success', r.data);
                }).error(function(err) {
                    s.requesting = false;
                    s.message('error, try later.', 'danger');
                    console.warn('adminClientsEdit:remove:error', err);
                });
            });
        };

        function reset() {
            s.item = _.clone(s.original);
        }

        function read() {
            s.message('loading . . .', 'info');
            s.requesting = true;
            db.custom('user', 'get', {
                _id: params.id
            }).then(function(res) {
                s.requesting = false;
                console.info('adminClientsEdit:read:success', res.data);
                s.item = res.data.result;
                if (!res.data.ok) {
                    s.message('not found, maybe it was deleted!', 'warning', 5000);
                } else {
                    s.message('loaded', 'success', 2000);
                }
            });
        }

    }
]);

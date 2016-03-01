var app = angular.module('app', [
    'app.admin.routes',
    'app.admin.login',
    'app.admin.user',
    'app.admin.diag',
    'app.admin.diag.balance',
    'app.admin.order',
    'app.admin.client',
    'app.admin.calendar',
    'app.admin.client.payments',
    'app.common.directives',
    'app.common.service',
    'app.common.root',
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
                if(r.__currentCtrlScope.back){
                    if(r.state.working()){
                        r.message('Loading...',{
                            type:'warning',
                            duration:2000
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

    r.setCurrentCtrl = (_s)=>{r.__currentCtrlScope = _s};

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
        //        console.info('app.admin.login:adminDashboard');
        //
        r.toggleNavbar(true);
        r.secureSection(s);
    }
]);



app.directive('adminBalance', function(
    $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, $compile, server) {
    return {
        restrict: 'AE',
        replace: true,
        scope: {
            //model: "=model"
        },
        templateUrl: 'views/partials/partial.admin.balance.html',
        link: function(s, elem, attrs) {
            var r = $rootScope;
            var ws = server;
            var n = attrs.name;

            ws.ctrl('Payment', 'balance').then((data) => {
                var b = {};
                var out = data.result;
                b.available = _.sumBy(out.available, function(o) {
                    return o.amount;
                }) / 100; //eur
                b.pending = _.sumBy(out.pending, function(o) {
                    return o.amount;
                }) / 100; //eur
                b.livemode = out.livemode;
                s.b = b;
            })

            ws.ctrl('Stats', 'general').then((data) => {
                s.g = data.result;
            })

        }
    };
});



app.directive('adminTurnover', function(
    $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, $compile, server) {
    return {
        restrict: 'AE',
        replace: true,
        scope: {
            //model: "=model"
        },
        templateUrl: 'views/directives/directive.fast-crud.html',
        link: function(s, elem, attrs) {
            var r = $rootScope;
            var ws = server;
            var n = attrs.name;
            s.title = "Balance details";

            function update() {
                var data = {
                    __populate: {
                        '_client': 'email userType',
                        '_diag': 'email userType'
                    }
                };

                if (r.userIs(['diag'])) {
                    data['_diag'] = r.session()._id;
                }
                if (r.userIs(['client'])) {
                    data['_client'] = r.session()._id;
                }

                ws.ctrl('Payment', 'balanceTransactions', data).then((res) => {
                    if (res.ok) {

                        res.result.data.forEach((v) => {
                            v.amount = v.amount / 100;
                            v.created = moment(v.created).format('DD/MM/YY HH:MM');

                            v._order = {
                                _id: '!@#!@#!@',
                                description: 'Zararara'
                            };
                            //v.date = moment(v.diagStart).format('dddd, DD MMMM')
                            //v.start = moment(v.diagStart).format('HH:mm');
                            //v.end = moment(v.diagEnd).format('HH:mm');
                        });
                        console.info('TRANSACTIONS', res.result.data);
                        s.model.update(res.result.data);
                    }
                });
            }


            s.model = {
                click: (item, index) => {
                    var data = {};
                    ws.localData().then(function(d) {
                        Object.assign(data, d);
                    });

                    ws.ctrl('Payment', 'associatedOrder', {
                        source: item.source
                    }).then((data) => {
                        item = Object.assign(data.result);
                        _open();
                    });

                    function _open() {
                        s.open({
                            title: 'Balance Transaction',
                            data: data,
                            evts: {
                                'init': []
                            },
                            item: item,
                            templateUrl: 'views/partials/partial.modal.balance.details.html',
                            callback: (item) => {}
                        });
                    }
                },
                buttons: [{
                    label: "Refresh",
                    type: () => "btn btn-primary spacing-h-1",
                    click: () => update()
                }],
                columns: [{
                    label: "Description",
                    name: 'description'
                }, {
                    label: "Amount (eur)",
                    name: 'amount',
                    align: 'right'
                }, {
                    label: "Created",
                    name: "created"
                }],
                items: []
            };
            update();
            //                console.log('directive.exceptions.linked');
        }
    };
});

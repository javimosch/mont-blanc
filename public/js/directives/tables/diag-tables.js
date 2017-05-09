(function() {

    /*global angular*/
    /*global $D*/
    /*global $U*/
    /*global moment*/
    /*global _*/
    var app = angular.module('app.diag.complete', []);



    function TABLE_COLUMNS(r) {
        return [{
                label: "Début",
                name: "start",
                format: (x, item) => r.momentDateTimeWords2(item.start)
            }, {
                label: "Fin",
                name: "end",
                format: (x, item) => r.momentDateTimeWords2(item.end)
            }, {
                label: "Adresse",
                name: 'address'
            }
            /*, {
                    label: "Statut",
                    name: 'status'
                }*/
        ];
    }

    angular.module('app').directive('diagOrders', function(
        $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server, $mongoosePaginate, localData) {
        return {
            restrict: 'AE',
            replace: true,
            scope: {
                //model: "=model"
            },
            templateUrl: 'views/directives/directive.fast-crud.html',
            link: function(s, elem, attrs) {
                var r = $rootScope,
                    ws = server,
                    dbPaginate = $mongoosePaginate.get('Order');
                var n = attrs.name;
                s.title = "Rendez-vous à venir";

                function update(items, cb) {
                    if (items) {
                        return s.model.update(items);
                    }
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

                    data.__sort = {
                        start: 1
                    };

                    data.__rules = {
                        start: {
                            "$gt": moment().toDate()
                        },
                        status: {
                            "$nin": ['completed', 'delivered', 'created']
                        }
                    };

                    dbPaginate.ctrl(data, s.model).then(res => {
                        if (cb) {
                            cb(res.result);
                        }
                        else {
                            s.model.update(res.result, null);
                        }
                    });
                }
                s.model = {
                    init: () => {
                        //s.model.filter.firstTime();
                        update();
                    },
                    pagination: {
                        itemsPerPage: 10
                    },
                    paginate: (cb) => {
                        update(null, cb)
                    },
                    click: (item, index) => {
                        var data = {};
                        localData().then(function(d) {
                            Object.assign(data, d);
                        });

                        r.params = {
                            item: item,
                            prevRoute: 'dashboard'
                        };
                        r.route('orders/edit/' + item._id);

                    },
                    buttons: [{
                        label: "Rafraichir",
                        type: () => "btn diags-btn bg-azure-radiance margin-left-0 margin-right-1",
                        click: () => update()
                    }],
                    columns: TABLE_COLUMNS(r),
                    items: []
                };
                update();
            }
        };
    });

    angular.module('app').directive('diagOrdersSucceded', function(
        $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server, $mongoosePaginate, localData) {
        return {
            restrict: 'AE',
            replace: true,
            scope: {
                //model: "=model"
            },
            templateUrl: 'views/directives/directive.fast-crud.html',
            link: function(s, elem, attrs) {
                var r = $rootScope,
                    ws = server,
                    dbPaginate = $mongoosePaginate.get('Order');
                var n = attrs.name;
                s.title = "Rendez-vous effectués";

                function update(items, cb) {
                    if (items) {
                        return s.model.update(items);
                    }
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

                    data.__sort = {
                        start: -1
                    };

                    data.__rules = {
                        end: {
                            "$lt": moment().toDate()
                        },
                        status: {
                            "$in": ['completed', 'prepaid', 'delivered']
                        }
                    };


                    dbPaginate.ctrl(data, s.model).then(res => {
                        if (cb) {
                            cb(res.result);
                        }
                        else {
                            s.model.update(res.result, null);
                        }
                    });
                }
                s.model = {
                    init: () => {
                        //s.model.filter.firstTime();
                        update();
                    },
                    pagination: {
                        itemsPerPage: 10
                    },
                    paginate: (cb) => {
                        update(null, cb)
                    },
                    click: (item, index) => {
                        var data = {};
                        localData().then(function(d) {
                            Object.assign(data, d);
                        });

                        r.params = {
                            item: item,
                            prevRoute: 'dashboard'
                        };
                        r.route('orders/edit/' + item._id);

                    },
                    buttons: [{
                        label: "Rafraichir",
                        type: () => "btn diags-btn bg-azure-radiance margin-left-0 margin-right-1",
                        click: () => update()
                    }],
                    columns: TABLE_COLUMNS(r),
                    items: []
                };
                update();
            }
        };
    });




    angular.module('app').directive('diagCalendar', function(
        $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server) {
        return {
            restrict: 'AE',
            replace: true,
            scope: {
                //model: "=model"
            },
            templateUrl: 'views/directives/directive.diag.calendar.html',
            link: function(s, elem, attrs) {
                var r = $rootScope;
                var ws = server;
                //
                var m = moment();
                var y = m.year();
                var mo = m.month();
                window.s = s;

                s.open = () => {};


                s.calendarView = 'year';

                s.views = {
                    label: 'View Type',
                    selected: s.calendarView,
                    click: (x) => {
                        s.calendarView = x.label.toLowerCase();
                        s.views.selected = s.calendarView;
                        r.dom();
                    },
                    items: [{
                        label: 'Day'
                    }, {
                        label: 'Week'
                    }, {
                        label: 'Month'
                    }, {
                        label: 'Year'
                    }, ]
                };


                s.calendarDate = new Date();

                s.events = [
                    /*{
                                    title: 'Order #2384', // The title of the event
                                    type: 'info', // The type of the event (determines its color). Can be important, warning, info, inverse, success or special
                                    startsAt: new Date(y, mo, 15, 1), // A javascript date object for when the event starts
                                    endsAt: new Date(y, mo, 15, 15), // Optional - a javascript date object for when the event ends
                                    editable: false, // If edit-event-html is set and this field is explicitly set to false then dont make it editable.
                                    deletable: false, // If delete-event-html is set and this field is explicitly set to false then dont make it deleteable
                                    draggable: true, //Allow an event to be dragged and dropped
                                    resizable: true, //Allow an event to be resizable
                                    incrementsBadgeTotal: true, //If set to false then will not count towards the badge total amount on the month and year view
                                    recursOn: 'year', // If set the event will recur on the given period. Valid values are year or month
                                    cssClass: 'a-css-class-name' //A CSS class (or more, just separate with spaces) that will be added to the event when it is displayed on each view. Useful for marking an event as selected / active etc
                                }*/
                ];

                function update() {
                    var conditions = {
                        __populate: {
                            '_client': 'email userType',
                            '_diag': 'email userType'
                        }
                    };

                    if (r.userIs(['diag'])) {
                        conditions['_diag'] = r.session()._id;
                    }
                    if (r.userIs(['client'])) {
                        conditions['_client'] = r.session()._id;
                    }

                    conditions.__rules = {
                        status: {
                            "$ne": 'created'
                        }
                    };

                    ws.ctrl('Order', 'getAll', conditions).then((res) => {
                        console.info(res);
                        if (res.ok) {
                            var evts = [];
                            res.result.forEach((v) => {
                                //v.start = moment(v.start).format('HH:mm');
                                //v.end = moment(v.end).format('HH:mm');
                                evts.push({
                                    item: v,
                                    title: 'Order ',
                                    type: 'info',
                                    startsAt: new Date(v.start),
                                    endsAt: new Date(v.end),
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

                        }
                    });
                }

                s.eventClicked = (calendarEvent) => {
                    r.params = {
                        item: calendarEvent.item,
                        prevRoute: 'dashboard'
                    };
                    r.route('orders/edit/' + calendarEvent.item._id);
                    /*
                    s.open({
                        //title: 'Edit Exception',
                        action: 'edit',
                        item: calendarEvent.item,
                        templateUrl: 'views/partials/partial.modal.diag.order.html',
                        callback: (item) => {
                            ws.ctrl('Order', 'createUpdate', item).then((result) => {
                                update();
                            });
                        }
                    })
                    console.log(calendarEvent);
                    */
                };
                s.eventEdited = (evt) => {
                    //console.log(evt);
                };
                //
                update();
            }
        };
    });


    app.controller('diagDashboard', [

        'server', '$scope', '$rootScope',
        function(db, s, r) {
            console.info('app.admin.diag:diagDashboard');



        }
    ]);



})();

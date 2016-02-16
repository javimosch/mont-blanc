var app = angular.module('app.admin.diag', ['app.common.service']);

app.directive('timeRangeExceptions', function(
    $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, $compile, server) {
    return {
        restrict: 'AE',
        replace: true,
        scope: {
            //model: "=model"
        },
        templateUrl: 'views/directives/directive.section.exceptions.html',
        link: function(s, elem, attrs) {
            var r = $rootScope;
            var ws = server;
            var n = attrs.name;
            //s.open //=> automatic
            function update() {
                ws.ctrl('TimeRange', 'getAll', {}).then((res) => {
                    if (res.ok) {
                        res.result.forEach((v)=>{
                            v.day = moment(v.start).format('dddd');
                            v.start = moment(v.start).format('HH:mm');
                            v.end = moment(v.end).format('HH:mm');
                        });
                        s.model.update(res.result);
                    }
                });
            }
            s.model = {
                //update //arg: items
                buttons: [{
                    label: "Refresh",
                    type: () => "btn btn-primary",
                    click: () => update()
                }, {
                    label: "New",
                    type: () => "btn btn-default",
                    click: () => {
                        s.open({
                            title: 'New Exception',
                            action: 'new',
                            type: 'work-exception',
                            callback: (timeRange) => {
                                timeRange._user = r.session()._id;
                                ws.ctrl('TimeRange', 'create', timeRange).then((result) => {
                                    update();
                                });
                            }
                        })
                    }
                }],
                columns: [{
                    label: "Description",
                    name: 'description'
                }, {
                    label: "Day",
                    name: 'day'
                }, {
                    label: "Start",
                    name: 'start'
                }, , {
                    label: "End",
                    name: 'end'
                }, {
                    label: "Repeat rule",
                    name: 'repeat'
                }],
                items: [{
                    description: 'working #1',
                    day: moment().date(1).format('dddd'),
                    start: moment().date(1).format('HH:mm'),
                    end: moment().date(2).format('HH:mm'),
                    repeat: 'day'
                }]
            };
            console.log('directive.exceptions.linked');
        }
    };
});


app.controller('diagDashboard', [

    'server', '$scope', '$rootScope',
    function(db, s, r) {
        console.info('app.admin.diag:diagDashboard');

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

        s.events = [{
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
        }, {
            title: "I can't work",
            type: 'warning',
            startsAt: new Date(y, mo, 15, 16),
            endsAt: new Date(y, mo, 15, 18),
            //editable: true, 
            //deletable: true,
            draggable: true, //Allow an event to be dragged and dropped
            //resizable: false, //Allow an event to be resizable
            incrementsBadgeTotal: false,
            //recursOn: 'year', // If set the event will recur on the given period. Valid values are year or month
            cssClass: 'a-css-class-name'
        }];

        s.eventClicked = (calendarEvent) => {
            console.log(calendarEvent);
        };
        s.eventEdited = (evt) => {
            console.log(evt);
        };

    }
]);


app.controller('adminDiags', [

    'server', '$scope', '$rootScope',
    function(db, s, r) {
        console.info('app.admin.diag:adminDiags');
        //
        r.toggleNavbar(true);
        r.secureSection(s);
        s.selectedItems = [];
        s.items = [];
        //
        s.click = function(item) {
            r.route('diags/edit/' + item._id);
        };
        s.create = function() {
            r.route('diags/edit/-1');
        };
        s.delete = function(item) {
            s.confirm('Remove ' + s.selectedItems.length + ' item/s?', function() {
                console.log('adminDiags:removeAll:in-progress');
                s.message('deleting . . .', 'info');
                s.requesting = true;
                db.custom('user', 'removeAll', {
                    ids: s.selectedItems
                }).then(function(res) {
                    s.requesting = false;
                    s.message('deleted', 'info');
                    read();
                    console.info('adminDiags:removeAll:success', r.data);
                }).error(function(err) {
                    s.requesting = false;
                    s.message('error, try later.', 'danger');
                    console.warn('adminDiags:removeAll:error', err);
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
            db.custom('user', 'getAll', { userType: 'diag' }).then(function(r) {
                console.info('adminDiags:read:success', r.data);
                s.items = r.data.result;
                s.message('loaded!', 'success', 1000);
            });
        }
        r.dom(read, 0);

    }
]);

app.controller('adminDiagsEdit', [

    'server', '$scope', '$rootScope', '$routeParams',
    function(db, s, r, params) {
        console.info('app.admin.diag:adminDiagsEdit');
        //
        r.toggleNavbar(true);
        r.secureSection(s);
        r.dom();
        //
        s.item = {
            email: '',
            password: '',
            address: '',
            userType: 'diag'
        };
        s.original = _.clone(s.item);



        s.$watch('item.address', (v) => {
            console.info('ADDRESS:CHANGE', v);
        });
        s.addressChange = (v) => s.item.address = v;

        //
        if (params && params.id && params.id.toString() !== '-1') {
            console.info('adminDiagsEdit:params', params);
            r.dom(read, 1000);
        } else {
            console.info('adminDiagsEdit:reset');
            reset();
        }
        //
        s.cancel = function() {
            r.route('diags');
        };
        s.save = function() {
            s.message('saving . . .', 'info');

            s.requesting = true;


            db.custom('user', 'find', {
                email: s.item.email
            }).then(function(res) {
                s.requesting = false;
                if (res.data.result.length > 0) {
                    var _item = res.data.result[0];
                    if (s.item._id && s.item._id == _item._id) {
                        _save(); //same diag
                    } else {
                        s.message('Email address in use.');
                    }
                } else {
                    _save(); //do not exist.
                }
            });

            function _save() {
                s.requesting = true;
                db.custom('user', 'save', s.item).then(function(res) {
                    s.requesting = false;
                    var _r = res.data;
                    if (_r.ok) {
                        console.info('adminDiagsEdit:save:success');
                        s.message('saved', 'success');
                        r.route('diags', 0);
                    } else {
                        console.warn('adminDiagsEdit:save:fail', _r.err);
                        s.message('error, try later', 'danger');
                    }

                }).error(function(err) {
                    s.requesting = false;
                    s.message('error, try later.', 'danger');
                    console.warn('adminDiagsEdit:save:error', err);
                });
            }

        };
        s.delete = function() {
            s.confirm('Delete Diag ' + s.item.email + ' ?', function() {
                console.log('adminDiagsEdit:remove:in-progress');
                s.message('deleting . . .', 'info');
                s.requesting = true;
                db.custom('user', 'remove', {
                    _id: s.item._id
                }).then(function(res) {
                    s.requesting = false;
                    s.message('deleted', 'info');
                    reset();
                    r.route('diags', 0);
                    console.info('adminDiagsEdit:remove:success', r.data);
                }).error(function(err) {
                    s.requesting = false;
                    s.message('error, try later.', 'danger');
                    console.warn('adminDiagsEdit:remove:error', err);
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
                console.info('adminDiagsEdit:read:success', res.data);
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

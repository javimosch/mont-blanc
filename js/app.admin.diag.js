var app = angular.module('app.admin.diag', ['app.common.service']);

app.directive('timeRangeExceptions', function(
    $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server) {
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
                ws.ctrl('TimeRange', 'getAll', {
                    _user: r.session()._id
                }).then((res) => {
                    if (res.ok) {
                        res.result.forEach((v) => {
                            v.dayFormat = moment(v.start).format('dddd');
                            v.startFormat = moment(v.start).format('HH:mm');
                            v.endFormat = moment(v.end).format('HH:mm');
                        });
                        s.model.update(res.result);
                    }
                });
            }
            s.model = {
                //update //arg: items
                remove: (item, index) => {
                    var msg = 'Delete ' + item.description + ' ' + item.startFormat + ' - ' + item.endFormat + ' (' + item.dayFormat + ')';
                    s.confirm(msg, () => {
                        ws.ctrl('TimeRange', 'remove', { _id: item._id }).then(() => {
                            update();
                        });
                    });
                },
                click: (item, index) => {
                    s.open({
                        title: 'Edit Exception',
                        action: 'edit',
                        item: item,
                        type: 'work-exception',
                        callback: (timeRange) => {
                            ws.ctrl('TimeRange', 'createUpdate', timeRange).then((result) => {
                                update();
                            });
                        }
                    })
                },
                buttons: [{
                    label: "Refresh",
                    type: () => "btn btn-primary spacing-h-1",
                    click: () => update()
                }, {
                    label: "New",
                    type: () => "btn btn-default spacing-h-1",
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
                    name: 'dayFormat'
                }, {
                    label: "Start",
                    name: 'startFormat'
                }, , {
                    label: "End",
                    name: 'endFormat'
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
            update();
            console.log('directive.exceptions.linked');
        }
    };
});


//------------------------------------------------------------ ORDER MODAL READONLY
app.directive('diagOrders', function(
    $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server) {
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
            s.title = "Your Orders";

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

                ws.ctrl('Order', 'getAll', data).then((res) => {
                    if (res.ok) {
                        res.result.forEach((v) => {
                            v.date = moment(v.diagStart).format('dddd, DD MMMM')
                            v.start = moment(v.diagStart).format('HH:mm');
                            v.end = moment(v.diagEnd).format('HH:mm');
                        });
                        s.model.update(res.result);
                    }
                });
            }
            s.model = {
                click: (item, index) => {
                    var data = {};
                    ws.localData().then(function(d) {
                        Object.assign(data, d);
                    });

                    r.params = {
                        item: item,
                        prevRoute: 'dashboard'
                    };
                    r.route('orders/edit/' + item._id);
                    /*
                    s.open({
                        title: 'Order View',
                        data: data,
                        item: item,
                        templateUrl: 'views/partials/partial.modal.diag.order.html',
                        callback: (item) => {
                            ws.ctrl('Order', 'createUpdate', item).then((result) => {
                                update();
                            });
                        }
                    });*/
                },
                buttons: [{
                    label: "Refresh",
                    type: () => "btn btn-primary spacing-h-1",
                    click: () => update()
                }],
                columns: [{
                    label: "Address",
                    name: 'address'
                }, {
                    label: "Status",
                    name: 'status'
                }, {
                    label: "Start",
                    name: "start"
                }, {
                    label: "End",
                    name: "end"
                }],
                items: []
            };
            update();
        }
    };
});

app.directive('diagCalendar', function(
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
            }];

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

                ws.ctrl('Order', 'getAll', conditions).then((res) => {
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


app.controller('adminDiags', [

    'server', '$scope', '$rootScope',
    function(db, s, r) {
        console.info('app.admin.diag:adminDiags');
        //
        r.toggleNavbar(true);
        r.secureSection(s);
        //
        var isClientOrDiag = r.userIs(['client', 'diag']);
        if (isClientOrDiag) {
            return r.handleSecurityRouteViolation();
        }
        //

        //
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
        //        console.info('app.admin.diag:adminDiagsEdit');
        //
        r.toggleNavbar(true);
        r.secureSection(s);
        //
        var isClient = r.userIs(['client']);
        var notCurrentDiag = (r.userIs(['diag']) && r.sesson()._id !== params.id);
        if (isClient || notCurrentDiag) {
            return r.handleSecurityRouteViolation();
        }
        //
        expose('s', s);
        //
        r.dom();
        //
        s.item = {
            email: '',
            password: '',
            address: '',
            userType: 'diag',
            diagPriority: undefined
        };
        s.original = _.clone(s.item);
        window.edit = s;


        s.$watch('item.disabled', (v) => {
            if (v && s.item._id) {
                db.ctrl('Order', 'count', {
                    _diag: s.item._id //{ $eq: s.item._id }
                }).then(d => {
                    if (d.ok && d.result > 0) {
                        s.item.disabled = false;
                        r.message('Diag can only be disabled when there are not orders assigned.', {
                            type: 'warning',
                            duration: 5000
                        });
                    }
                });
            }
        });

        s.$watch('item.diagPriority', (v) => {
            if (!_.isUndefined(v) && !_.isNull(v) && isFinite(v)) {
                if (v === s.original.diagPriority) return;
                db.ctrl('User', 'get', { userType: 'diag', diagPriority: v, __select: "email" }).then((data) => {
                    if (data.result !== null) {
                        s.item.diagPriority = s.original.diagPriority;
                        r.message('Priority ' + v + ' is alredy assigned to ' + data.result.email, 'warning', 5000, true);
                    }
                });
            }
        });

        s.$watch('item.address', (v) => {
            //            console.info('ADDRESS:CHANGE', v);
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

        function handleErrors(err) {
            s.requesting = false;
            s.message('error, try later.', 'danger');
        }

        s.validate = () => {
            ifThenMessage([
                [s.item.email, '==', '', "Email cannot be empty"],
                [s.item.password, '==', '', "Password cannot be empty"]
            ], (m) => {
                s.message(m[0], 'warning', 0, true);
            }, s.save);
        };

        s.diplomesExpirationDateNotificationEnabled = (_id) => {
            if (s.item.diplomesInfo[_id].expirationDateNotificationEnabled == undefined) {
                s.item.diplomesInfo[_id].expirationDateNotificationEnabled = false;
            }
            return s.item.diplomesInfo[_id].expirationDateNotificationEnabled;
        };
        s.diplomesEnableExpirationDateNotification = (_id) => {
            s.item.diplomesInfo[_id].expirationDateNotificationEnabled = true;
            db.ctrl('Order', 'update', {
                _id: s.item._id
            }).then(d => {
                r.notify('Expiration Date Notification Enabled', 'info');
            });
        };

        s.diplomesUpdate = () => {
            if (s.item && s.item.diplomes && s.item.diplomes.length > 0) {
                s.diplomesData = {};

                var infoToDelete = [];
                Object.keys(s.item.diplomesInfo).forEach(_id => {
                    if (!_.includes(s.item.diplomes, _id)) {
                        infoToDelete.push(_id);
                    }
                });
                infoToDelete.forEach(k => {
                    delete s.item.diplomesInfo[k];
                });
                db.ctrl('User', 'update', {
                    _id: s.item._id,
                    diplomesInfo: s.item.diplomesInfo
                });

                s.item.diplomes.forEach((_id, k) => {
                    db.ctrl('File', 'find', {
                        _id: _id
                    }).then(data => {
                        var file = data.result;
                        if (data.ok && file) {
                            file = Object.assign(file, s.item.diplomesInfo && s.item.diplomesInfo[file._id] || {});
                            s.diplomesData[file._id] = s.diplomesDataCreate(file);
                        } else {
                            //if is unable to fetch the diplome, we assume that was removed from the db, so we delete the reference.
                            s.item.diplomes = _.pull(s.item.diplomes, _id);
                            s.item.diplomesInfo = _.pull(s.item.diplomesInfo, _id);
                            if (s.diplomesData[_id]) {
                                delete s.diplomesData[_id];
                            }
                            if (Object.keys(s.diplomesData).length === 0) {
                                s.diplomesNew();
                            }
                            db.ctrl('User', 'update', {
                                _id: s.item._id,
                                diplomes: s.item.diplomes,
                            });
                        }
                    });
                });
            } else {
                s.item.diplomes = s.item.diplomes || [];
                s.diplomesNew();
            }
        };
        s.diplomesFile = {

        };
        s.diplomesData = {};
        s.diplomesDelete = (_id) => {
            if (!s.diplomesExists(_id)) return;
            var name = s.diplomesData[_id] && s.diplomesData[_id].info.filename || "File";
            s.confirm('Delete ' + name + ' ?', () => {
                db.ctrl('File', 'remove', { _id: _id }).then((d) => {
                    if (d.ok) {
                        s.item.diplomes = _.pull(s.item.diplomes, _id);
                        s.item.diplomesInfo = _.pull(s.item.diplomesInfo, _id);
                        if (s.diplomesData[_id]) {
                            delete s.diplomesData[_id];
                        }
                        if (Object.keys(s.diplomesData).length === 0) {
                            s.diplomesNew();
                        }
                        s.diplomesUpdate();
                    }
                });
            });
        };
        s.diplomesExists = (_id) => s.item && s.item.diplomes && _.includes(s.item.diplomes, _id);
        s.diplomesDownload = (_id) => {
            window.open(db.URL() + '/File/get/' + _id, '_newtab');
        };
        s.diplomesNew = () => {
            if (s.item && s.item.diplomes.length !== Object.keys(s.diplomesData).length) {
                return;
            }

            s.diplomesData[new Date().getTime()] = s.diplomesDataCreate();
        };
        s.diplomesLabel = _id => {
            //Pdf {{(d.info && "("+d.info.filename+")")||""}}
            var d = s.diplomesData[_id];
            if(s.diplomesExists(_id)){
                return 'Pdf '+ (d.info && "("+d.info.filename+")" || "unkown");
            }else{
                d = s.diplomesFile[_id];
                if(d&&d.name){
                    return 'Selected: '+ d.name.toLowerCase()+ ' (click upload button)';
                }else{
                    return 'select a file and click the upload button';
                }
            }
        };
        s.diplomesDataCreate = (info) => {
            var o = {
                obtentionMaxDate: new Date(),
                obtentionDateOpen: false,
                obtentionDateClick: () => o.obtentionDateOpen = !o.obtentionDateOpen,
                //
                expirationMinDate: new Date(),
                expirationDateOpen: false,
                expirationDateClick: () => o.expirationDateOpen = !o.expirationDateOpen,
                //
                dateOptions: {
                    formatYear: 'yy',
                    startingDay: 1
                },
                info: info || {
                    filename: 'select a file and click the upload button',
                }
            };
            o.info.obtentionDate = isFinite(new Date(o.info.obtentionDate)) && new Date(o.info.obtentionDate) || new Date();
            o.info.expirationDate = isFinite(new Date(o.info.expirationDate)) && new Date(o.info.expirationDate) || new Date();
            return o;
        };


        s.diplomesSave = (_id) => {
            if (!s.diplomesFile[_id]) return;
            var curr = _id;


            _uploadNew(); //starts here


            function _deleteCurr() {
                db.ctrl('File', 'remove', { _id: curr });
            }

            function _uploadNew() {



                if (s.diplomesFile[_id]) {
                    var _str = s.diplomesFile[_id].name.toString().toLowerCase();
                    if (_str.substring(_str.length - 3) !== 'pdf') {
                        s.message('PDF Format required', {
                            type: 'warning',
                            duration: 99999,
                            scroll: true
                        });
                        return;
                    }
                }

                s.message('Uploading (Do not touch anything)', {
                    type: 'info',
                    duration: 99999,
                    scroll: true
                });


                db.form('File/save/', {
                    name: s.diplomesFile[_id].name,
                    file: s.diplomesFile[_id]
                }).then((data) => {
                    if (data.ok) {
                        var newId = data.result._id;
                        s.item.diplomes.push(newId);

                        s.item.diplomesInfo = s.item.diplomesInfo || {};
                        s.item.diplomesInfo[newId] = s.diplomesData[_id].info;

                        if (s.diplomesExists(curr)) {
                            s.item.diplomes = _.pull(s.item.diplomes, curr);
                            s.item.diplomesInfo = _.pull(s.item.diplomesInfo, curr);
                        }
                        db.ctrl('User', 'update', {
                            _id: s.item._id,
                            diplomes: s.item.diplomes,
                        }).then(data => {
                            if (data.ok) {
                                if (s.diplomesExists(curr)) {
                                    _deleteCurr();
                                }
                                s.message('File upload success.', {
                                    type: 'info',
                                    duration: 5000,
                                    scroll: true
                                });
                            } else {
                                s.message('Upload fail, try later.', {
                                    type: 'warning',
                                    duration: 99999,
                                    scroll: true
                                });
                            }
                            read(s.item._id);
                        });
                    } else {
                        s.message('Upload fail, try later.', {
                            type: 'warning',
                            duration: 99999,
                            scroll: true
                        });
                    }
                });
            }
        };

        s.save = function() {
            s.message('saving . . .', 'info');

            s.requesting = true;


            db.custom('user', 'find', {
                email: s.item.email,
                userType: 'diag'
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
            }).error(handleErrors);

            function _save() {
                s.requesting = true;

                s.item.diplomesInfo = s.item.diplomesInfo || {};
                Object.keys(s.diplomesData).forEach(id => {
                    if (s.diplomesExists(id)) {
                        var data = s.diplomesData[id];
                        s.item.diplomesInfo[id] = {
                            obtentionDate: data.info.obtentionDate,
                            expirationDate: data.info.expirationDate,
                            expirationDateNotificationEnabled: false,
                            expirationDateNotificationSended: false,
                            filename: data.info.filename
                        };
                    }
                });


                db.ctrl('User', 'save', s.item).then((res) => {
                    s.requesting = false;
                    var _r = res;
                    if (_r.ok) {
                        console.info('adminDiagsEdit:save:success');
                        s.message('saved', 'success');
                        r.route('diags', 0);
                    } else {
                        console.warn('adminDiagsEdit:save:fail', _r.err);
                        s.message('error, try later', 'danger');
                    }
                }).error(handleErrors);

            }

        };
        s.delete = function() {
            s.confirm('Delete Diag ' + s.item.email + ' ?', function() {
                //console.log('adminDiagsEdit:remove:in-progress');
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

        s.update = read;

        function read() {
            s.message('loading . . .', 'info');

            s.requesting = true;




            db.custom('user', 'get', {
                _id: params.id
            }).then(function(res) {
                s.requesting = false;
                //                console.info('adminDiagsEdit:read:success', res.data);
                s.original = _.clone(res.data.result);
                s.item = res.data.result;
                s.diplomesUpdate();
                if (!res.data.ok) {
                    s.message('not found, maybe it was deleted!', 'warning', 5000);
                } else {
                    s.message('loaded', 'success', 2000);
                }
            });
        }

    }
]);

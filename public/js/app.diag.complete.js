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

app.directive('diagOrders', function(
    $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server, $mongoosePaginate) {
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
                    ws.localData().then(function(d) {
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

app.directive('diagOrdersSucceded', function(
    $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server, $mongoosePaginate) {
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
                    ws.localData().then(function(d) {
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



app.controller('ctrl-diag-edit', [

    'server', '$scope', '$rootScope', '$routeParams', 'paymentApi', '$log',
    function(db, s, r, params, paymentApi, $log) {
        //        console.info('app.admin.diag:adminDiagsEdit');
        //
        s.pdf = {
            file: null
        };


        s.$on('item.read', function(item) {
            s.activated = !item.disabled;
            r.dom();
            s.$watch('activated', function(v) {
                if (typeof v === 'boolean' && s.item && s.item.disabled != undefined) {
                    //s.item.disabled = !v;
                }
            });
        });






        s.createWallet = function() {
            paymentApi.registerUserWallet(s.item).then(function() {
                r.dom();
                r.infoMessage('Linked to ' + s.item.wallet + '.');
                s.save(true);
            }).error(function(res) {
                r.errorMessage();
            }).on('validate', function(msg) {
                r.warningMessage(msg);
            });
        }

        //
        var isAdmin = r.userIs(['admin']);
        var isClient = r.userIs(['client']);
        var notCurrentDiag = (r.userIs(['diag']) && r.session()._id !== params.id);
        var logged = r.logged();

        s.inscriptionLabel = {
            val: "Suivant",
            update: function() {
                r.dom(function() {
                    if (s.item._id) {
                        s.inscriptionLabel.val = "Suivant";
                    }
                    else {
                        s.inscriptionLabel.val = "Suivant"
                    }
                });
            }
        };

        if (!logged) {
            //new diag public route
            r.__hideNavMenu = true;
            $U.once('route-exit:diag-inscription', function(url) {
                r.__hideNavMenu = false;
            });
            r.toggleNavbar(true);
        }
        else {
            r.toggleNavbar(true);
            r.secureSection(s);
            if (isClient || notCurrentDiag) {
                return r.handleSecurityRouteViolation();
            }
        }
        //
        $U.expose('s', s);
        //
        r.dom();
        //
        s.item = {
            email: '',
            password: '',
            address: '',
            userType: 'diag',
            priority: 100,
            commission: 0,
            disabled: true
        };

        if (isAdmin) {
            s.item.disabled = false
        }

        s.original = _.cloneDeep(s.item);


        s.department = null;
        s.removeDeparment = (nro) => {
            s.item.departments = s.item.departments || [];
            s.item.departments.splice(s.item.departments.indexOf(nro), 1);
        };
        s.addDepartment = () => {
            if (!s.department) return r.warningMessage('Indiquez le département');
            if (s.department.toString().length === 1) {
                s.department = '0' + s.department;
            }
            s.item.departments = s.item.departments || [];
            if (!_.includes($D.availableFranceDepartementsNumbers(), s.department.toString())) {
                return r.warningMessage('Le département est pas valide');
            }
            if (_.includes(s.item.departments, s.department)) {
                return r.warningMessage('Le département est déjà sélectionné');
            }

            s.item.departments.push(s.department);
        };


        s.$watch('item.disabled', (v) => {
            if (v && s.item._id) {
                db.ctrl('Order', 'count', {
                    _diag: s.item._id //{ $eq: s.item._id }
                }).then(d => {
                    if (d.ok && d.result > 0) {
                        s.item.disabled = false;
                        r.warningMessage('Diag can only be disabled when there are not orders assigned.', 5000);
                    }
                });
            }
        });

        s.$watch('item.priority', (v) => {

        });

        s.validatePriority = (v, okCb) => {
            if (!_.isUndefined(v) && !_.isNull(v) && isFinite(v) && !isNaN(v)) {
                if (v === s.original.priority) return okCb();
                db.ctrl('User', 'get', {
                    userType: 'diag',
                    priority: v,
                    __select: "email"
                }).then((data) => {
                    if (data.result !== null) {
                        s.item.priority = s.original.priority;
                        r.warningMessage('Priority ' + v + ' is alredy assigned to ' + data.result.email, 5000);
                    }
                    else {
                        okCb();
                    }
                });
            }
        };


        s.$watch('item.address', (v) => {
            //            console.info('ADDRESS:CHANGE', v);
        });
        s.addressChange = (v) => s.item.address = v;

        //
        if (params && params.id && params.id.toString() !== '-1') {
            r.dom(read, 1000);
        }
        else {
            reset();
        }
        //
        s.cancel = function() {
            r.route('diags');
        };

        function handleErrors(_err) {
            r.errorMessage('Error, try later.');
        }

        s.validate = () => {
            $U.ifThenMessage([
                [s.item.email, '==', '', "email est nécessaire"],
                [s.item.password, '==', '', "Password est nécessaire"],
                [s.item.siret, '==', '', "siret est nécessaire"],
                [s.item.commission == undefined, '==', true, "Commission est nécessaire"],
                [isNaN(s.item.commission), '==', true, "Commission allowed values are 0..100"],
                [(s.item.commission < 0 || s.item.commission > 100), '==', true, "Commission allowed values are 0..100"],
                [!s.item.priority, '==', true, "Priority required"],
                [isNaN(s.item.priority), '==', true, "Priority allowed values are 0..100"],
                [(s.item.priority < 0 || s.item.priority > 100), '==', true, "Priority allowed values are 0..100"],

                [s.item.departments && s.item.departments.length == 0, '==', true, "Un Département en charge est requis"],

                [
                    s.item.notifications && s.item.notifications.DIAG_DIAG_ACCOUNT_CREATED == true && s.item._id && (!s.item.diplomes || (s.item.diplomes && s.item.diplomes.length == 0)), '==', true, 'A Diplome est nécessaire'
                ]

            ], (m) => {
                r.warningMessage(m[0], 5000);
            }, () => {
                s.validatePriority(s.item.priority, () => {
                    s.save();
                })
            });
        };









        s.diplomesExpirationDateChange = (_id) => {
            if (s.item.diplomesInfo[_id]) {
                s.item.diplomesInfo[_id].expirationDateNotificationSended = false;
                s.item.diplomesInfo[_id].expirationDateNotificationEnabled = false;
            }
        };
        s.diplomesExpirationDateNotificationEnabled = (_id) => {
            if (!r.userIs('admin')) return false;
            if (!s.item.diplomesInfo) return false;
            if (s.item.diplomesInfo[_id]) {
                if (s.item.diplomesInfo[_id].expirationDateNotificationEnabled == undefined) {
                    s.item.diplomesInfo[_id].expirationDateNotificationEnabled = false;
                }
                return s.item.diplomesInfo[_id].expirationDateNotificationEnabled;
            }
            else {
                return false;
            }

        };
        s.diplomesEnableExpirationDateNotification = (_id) => {
            if (!s.item.diplomesInfo) {
                console.error('diplomesInfo expected.');
            }
            s.item.diplomesInfo[_id].expirationDateNotificationEnabled = true;
            s.item.diplomesInfo[_id].expirationDateNotificationSended = false
            db.ctrl('User', 'update', {
                _id: s.item._id,
                diplomesInfo: s.item.diplomesInfo
            }).then(d => {
                r.notify('Expiration Date Notification Enabled', 'info');
            });
        };

        s.diplomesUpdate = () => {
            if (s.item && s.item.diplomes && s.item.diplomes.length > 0) {
                s.diplomesData = {};

                var infoToDelete = [];
                Object.keys(s.item.diplomesInfo || {}).forEach(_id => {
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
                            s.item.diplomesInfo = s.item.diplomesInfo || {};
                            if (!s.item.diplomesInfo[_id]) {
                                //
                                s.item.diplomesInfo[_id] = {
                                    //obtentionDate: data.info.obtentionDate,
                                    //expirationDate: data.info.expirationDate,
                                    expirationDateNotificationEnabled: false,
                                    expirationDateNotificationSended: false,
                                    filename: file.filename
                                };
                                db.ctrl('User', 'update', {
                                    _id: s.item._id,
                                    diplomesInfo: s.item.diplomesInfo
                                });
                                //
                                console.info('diplome-info-created', _id);
                            }
                            file = Object.assign(file, s.item.diplomesInfo && s.item.diplomesInfo[file._id] || {});
                            s.diplomesData[file._id] = s.diplomesDataCreate(file);
                        }
                        else {
                            //if is unable to fetch the diplome, we assume that was removed from the db, so we delete the reference.
                            console.info('diplome-fetch-fail: deleting-reference', _id);
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
            }
            else {
                s.item.diplomes = s.item.diplomes || [];
                s.diplomesNew();
            }
        };
        s.diplomesFile = {

        };
        s.diplomesFileChange = (id) => {
            console.info(id);
            setTimeout(() => {

                s.diplomesSave(id);
            }, 1000)

        };
        s.diplomesData = {};
        s.diplomesDelete = (_id) => {
            if (!s.diplomesExists(_id)) return;
            var name = s.diplomesData[_id] && s.diplomesData[_id].info.filename || "File";
            s.confirm('Delete ' + name + ' ?', () => {
                db.ctrl('File', 'remove', {
                    _id: _id
                }).then((d) => {
                    if (d.ok) {
                        delete s.diplomes[_id];
                        delete s.diplomesInfo[_id];
                        delete s.diplomesData[_id];
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
            if (s.diplomesExists(_id)) {
                return 'Pdf ' + (d.info && "(" + d.info.filename + ")" || "unkown");
            }
            else {
                d = s.diplomesFile[_id];
                if (d && d.name) {
                    return 'Sélectionné: ' + d.name.toLowerCase() + ' ';
                }
                else {
                    return 'Sélectionnez le fichier';
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
                    filename: 'Sélectionnez le fichier',
                }
            };
            o.info.obtentionDate = isFinite(new Date(o.info.obtentionDate)) && new Date(o.info.obtentionDate) || new Date();
            o.info.expirationDate = isFinite(new Date(o.info.expirationDate)) && new Date(o.info.expirationDate) || new Date();
            return o;
        };


        s.diplomeInfoApply = function() {
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
        };

        s.diplomesSave = (_id) => {
            var file = s.diplomesFile[_id];
            if (!file) {
                return r.warningMessage("Un fichier requis", 5000);
            }
            if (file.type !== 'application/pdf') {
                return r.warningMessage("Format pdf nécessaire", 5000);
            }
            if (file.size / 1000 > 1624) {
                return r.warningMessage("Limite 1.5mb pour le fichier pdf", 5000);
            }

            if (!s.diplomesFile[_id]) return;
            var curr = _id;


            _uploadNew(); //starts here


            function _deleteCurr() {
                db.ctrl('File', 'remove', {
                    _id: curr
                });
            }

            function _uploadNew() {



                r.infoMessage('Patientez, le chargement de vos certifications est en cours', 99999);


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
                                r.infoMessage('Vos certifications ont été chargées avec succès.', 5000);
                            }
                            else {
                                r.warningMessage('Upload échoué, essayez plus tard.', 99999);
                            }
                            read(s.item._id);
                        });
                    }
                    else {
                        r.warningMessage('Upload échoué, essayez plus tard.', 99999);
                    }
                });
            }
        };



        s.shouldSendAccountCreatedNotificationToDiag = (_user) => {
            var rta = (_user.userType === 'diag') && _user.disabled === true && (_user.notifications == undefined || _user.notifications.DIAG_DIAG_ACCOUNT_CREATED === undefined || _user.notifications.DIAG_DIAG_ACCOUNT_CREATED == false);
            console.info('shouldSendAccountCreatedNotificationToDiag', rta);
            return rta;
        };
        s.sendAccountCreatedNotificationToDiag = (_user) => {
            s.item = _user || s.item;
            db.ctrl('Notification', 'DIAG_DIAG_ACCOUNT_CREATED', {
                _user: s.item
            }).then(res => {
                if (res.ok) {
                    s.item.notifications = s.item.notifications || {};
                    s.item.notifications.DIAG_DIAG_ACCOUNT_CREATED = true;
                    db.ctrl('User', 'save', s.item);
                    console.info('sendAccountCreatedNotificationToDiag:success', res.message);
                }
                else {
                    console.info('sendAccountCreatedNotificationToDiag:failed', res.err);
                }
            });
        };

        s.adminsNeedToBeNotifiedAboutDiagAccountCreation = (_user) => {
            var rta = (_user.userType === 'diag') && _user.disabled == true && (!_user.notifications || _user.notifications.ADMIN_DIAG_ACCOUNT_CREATED == undefined || _user.notifications.ADMIN_DIAG_ACCOUNT_CREATED == false);
            console.info('adminsNeedToBeNotifiedAboutDiagAccountCreation', rta);
            return rta;
        };
        s.notifyAdminsAboutDiagAccountCreation = (_diag) => {
            db.ctrl('User', 'getAll', {
                userType: 'admin',
                __select: "email"
            }).then(res => {
                console.info('notifyAdminsAboutDiagAccountCreation:admins:', res.result.length);
                if (res.ok) {
                    var cbHell = $U.cbHell(res.result.length, () => {
                        Object.assign(s.item, _diag);
                        s.item.notifications = s.item.notifications || {};
                        s.item.notifications.ADMIN_DIAG_ACCOUNT_CREATED = 1;
                        db.ctrl('User', 'save', s.item);
                        console.info('notifyAdminsAboutDiagAccountCreation:success');
                    });
                    res.result.forEach(_admin => {
                        db.ctrl('Notification', 'ADMIN_DIAG_ACCOUNT_CREATED', {
                            _user: _diag,
                            _admin: {
                                email: _admin.email
                            }
                        }).then(rta => {
                            cbHell.next();
                        });
                    });
                }
            });

        };





        s.save = function(silent) {
            silent = silent || false;

            var payload = {
                email: s.item.email,
                userType: 'diag'
            };

            db.ctrl('User', 'find', payload).then(function(res) {
                if (res.result.length > 0) {
                    var _item = res.result[0];
                    if (s.item._id && s.item._id == _item._id) {
                        _save(); //same diag
                    }
                    else {
                        if (!silent) {
                            s.warningMessage('Email address in use.');
                        }
                    }
                }
                else {
                    _save(); //do not exist.
                }
            }).error(handleErrors);

            function _save() {
                s.diplomeInfoApply();
                db.ctrl('User', 'save', s.item).then((res) => {
                    var _r = res;
                    if (_r.ok) {
                        s.item._id = res.result._id;
                        /*
                        if (s.adminsNeedToBeNotifiedAboutDiagAccountCreation(s.item)) {
                            s.notifyAdminsAboutDiagAccountCreation(s.item);
                        }
                        if (s.shouldSendAccountCreatedNotificationToDiag(s.item)) {
                            s.sendAccountCreatedNotificationToDiag(s.item);
                        }*/

                        if (silent) {
                            return;
                        }

                        if (!logged) {
                            if (s.item && s.item.diplomes && s.item.diplomes.length > 0) {
                                r.route('login');
                                return r.infoMessage("Votre compte Diagnostiqueur est en cours de création. Un agent Diagnostical vous contactera prochainement pour finaliser votre inscription.", 10000);
                            }
                            else {
                                s.item = res.result;
                                s.inscriptionLabel.update();
                                r.dom();
                                return r.infoMessage("T&eacute;l&eacute;verser un diplome s&apos;il vous pla&Icirc;t", 10000);
                            }
                        }
                        else {
                            r.route('diags', 0);
                        }

                    }
                    else {
                        if (!silent) {
                            r.warningMessage('Error, try later', 'warning');
                        }
                    }
                }).error(handleErrors);

            }

        };
        s.delete = function() {
            s.confirm('Delete Diag ' + s.item.email + ' ?', function() {
                db.ctrl('User', 'remove', {
                    _id: s.item._id
                }).then(function(res) {
                    r.infoMessage('Deleted');
                    reset();
                    r.route('diags', 0);
                }).error(function(err) {
                    r.errorMessage('Error, try later.');
                });
            });
        };

        function reset() {
            s.item = _.cloneDeep(s.original);
        }

        s.update = read;

        function read() {
            var id = params.id;
            if (s.item._id) {
                id = s.item._id;
            }

            //s.infoMessage('Loading . . .');
            db.ctrl('User', 'get', {
                _id: id,
                userType: 'diag'
            }).then(function(res) {
                s.original = _.clone(res.result);
                s.item = res.result;
                s.$emit('item.read', s.item);
                s.diplomesUpdate();
                if (!res.ok) {
                    r.infoMessage('Registry not found, maybe it was deleted.', 'warning', 5000);
                }
                else {

                }
            });
        }

    }
]);

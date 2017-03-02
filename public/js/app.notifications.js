/*global angular*/
/*global $U*/
(() => {
    //QUICK CRUD
    var vars = {
        TITLE: '', //Notifications
        TPL_CRUD: 'views/directives/directive.fast-crud.html',
        //TPL_CRUD_TFOOT : 'views/partials/partial.diag.balance.footer.html',
        //TPL_CRUD_BUTTONS : 'views/partials/partial.diag.balance.buttons.html'
        TPL_CRUD_EDIT: 'views/diags/backoffice/notification/notification.edit.html'
    };
    var app = angular.module('app.notifications', []);

    app.controller('notificationEdit', ['$rootScope', '$scope', 'server', 'crud', '$routeParams', function(r, s, db, crud, params) {
        r.setCurrentCtrl(s);

        s.send = () => {
            var item = s.item;
            r.openConfirm('Confirm sending to ' + item.to + '?', () => {
                //html from to subject
                db.ctrl('Email', 'send', {
                    _user: item._user,
                    _notification: item._id,
                    html: item.contents,
                    to: item.to,
                    subject: item.subject,
                    __notificationType:item.type
                }).then(d => {
                    console.info(d);
                    r.infoMessage('Copy send to ' + item.to);
                    s.init();
                });
            });
        };

        crud.create({
            name: 'Notification',
            routeParams: params,
            scope: s,
            defaults: {
                data: {
                    message: 'Write your message'
                }
            },
            save: {
                after: {
                    goBack: true
                }
            },
            routes: {
                back: 'notifications'
            },
            modals: {
                confirm: r.openConfirm,
                delete: {
                    description: () => 'Delete item ' + s.item.type + ' ' + r.momentDateTime(s.item.created)
                }
            },
            events: {
                after: {
                    save: [
                        () => {
                            //console.log('saved!');
                        }
                    ]
                }
            },
            validate: {
                options: (s) => {
                    return [
                        [s.item.message, '==', false, 'Message required']
                    ];
                }
            }
        }).init();
    }]);


    angular.module('app').directive('sectionNotifications', function(
        $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server, $mongoosePaginate) {
        return {
            restrict: 'AE',
            replace: true,
            scope: {
                //model: "=model"
            },
            templateUrl: vars.TPL_CRUD,
            link: function(s, elem, attrs) {
                var r = $rootScope,
                    db = server,
                    dbPaginate = $mongoosePaginate.get('Notification');
                s.title = vars.TITLE;
                r.logger.addControlledErrors([
                    "SENDING_DISABLED_TYPE"
                ]);

                $U.expose('s', s);
                
                r.routeParams({
                    prevRoute:'notifications'
                });

                function update(items, cb) {
                    if (items) {
                        s.model.update(items);
                        return;
                    }
                    var data = {
                        __populate: {
                            _user: 'email'
                        },
                        __sort: "-createdAt"
                    };
                    data = Object.assign(data, s.model.filter.payload);
                    dbPaginate.ctrl(data, s.model).then(res => {
                        if (cb) {
                            cb(res.result);
                        }
                        else {
                            s.model.update(res.result, null);
                        }
                    }).on('cache', res => {
                        s.model.update(res.result, null);
                    });
                }

                var modalData = {
                    send: (item) => {
                        r.openConfirm('Confirm sending to ' + item.to + '?', () => {
                            //html from to subject
                            db.ctrl('Email', 'send', {
                                _user: item._user,
                                _notification: item._id,
                                html: item.contents,
                                to: item.to,
                                subject: item.subject
                            }).then(d => {
                                console.info(d);
                                r.infoMessage('Copy send to ' + item.to);
                                update();
                            });
                        });
                    }
                };

                s.model = {
                    init: () => {
                        //update()
                        s.model.filter.firstTime();
                    },
                    filter: {
                        store: "NOTIFICATIONS_LIST",
                        template: 'notificationFilter',
                        update: update,
                        rules: {
                            to: 'contains',
                            _user: "match"
                        }
                    },
                    pagination: {
                        itemsPerPage: 5
                    },
                    paginate: (cb) => {
                        update(null, cb)
                    },
                    getUsers: function(val) {
                        return db.http('User', 'getAll', {
                            //userType: 'client',
                            __regexp: {
                                email: val
                            }
                        }).then(function(res) {
                            return res.data.result;
                        });
                    },

                    remove: (item, index) => {
                        var rule = {
                            _id: item._id
                        };

                        db.ctrl('Notification', 'remove', rule).then((d) => {
                            update();
                        });

                    },
                    buttonsTpl: vars.TPL_CRUD_BUTTONS,
                    tfoot: vars.TPL_CRUD_TFOOT,
                    click: (item, index) => {
                        s.item = item;

                        r.routeParams({
                            item: item,
                        });
                        r.route('notifications/edit/' + item._id);

                        /*
                        s.open({
                            title: 'Notification Details',
                            data: modalData,
                            evts: {
                                'init': []
                            },
                            item: item,
                            templateUrl: vars.TPL_CRUD_EDIT,
                            callback: (item) => {}
                        });
                        */
                    },
                    buttons: [{
                        label: "Rafraîchir",
                        type: () => "btn diags-btn bg-azure-radiance margin-left-0 margin-right-1",
                        click: () => s.model.filter.filter()
                    }, {
                        label: "Clear Filters",
                        type: () => "btn diags-btn bg-azure-radiance margin-left-0 margin-right-1",
                        click: () => s.model.filter.clear && s.model.filter.clear()
                    }],
                    columns: [{
                        label: 'User',
                        name: 'to',
                        format: (x, item) => item._user && item._user.email || ''
                    }, {
                        label: 'To',
                        name: 'to'
                    }, {
                        label: "Subject",
                        name: 'subject'
                    }, {
                        label: "Sended",
                        name: 'sended',
                        format: (v) => {
                            return v ? 'Yes' : 'No'
                        }
                    }, {
                        label: "Created",
                        name: 'createdAt',
                        format: (v) => {
                            return r.momentFormat(v, "DD-MM-YY HH:mm");
                        }
                    }],
                    records: {
                        label: 'Records',
                        show: true
                    }
                };

            }
        };
    });
})();

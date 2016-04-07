(() => {
    //QUICK CRUD
    var vars = {
        TITLE: 'Notifications',
        TPL_CRUD: 'views/directives/directive.fast-crud.html',
        //TPL_CRUD_TFOOT : 'views/partials/partial.diag.balance.footer.html',
        //TPL_CRUD_BUTTONS : 'views/partials/partial.diag.balance.buttons.html'
        TPL_CRUD_EDIT: 'views/partials/notification.edit.html'
    };
    var app = angular.module('app.notifications', []);

    


    app.directive('sectionNotifications', function(
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



                function update(items, cb) {
                    if (items) {
                        s.model.update(items);
                        return;
                    }
                    var data = {
                        __populate: {
                            _config: '',
                        },
                        __sort:"-created"
                    };
                    dbPaginate.ctrl(data, s.model).then(res => {
                        if (cb) {
                            cb(res.result);
                        } else {
                            s.model.update(res.result, null);
                        }
                    }).on('cache', res => {
                        s.model.update(res.result, null);
                    });
                }

                var modalData = {
                    send: () => {
                        s.confirm('Confirm sending to ' + item.to + '?', () => {
                            //html from to subject
                            db.ctrl('Email', 'send', {
                                _user: item._user,
                                _notification: item._id,
                                html: item.contents,
                                to: item.to,
                                subject: item.subject
                            }).then(d => {
                                console.info(d);
                                update();
                            });
                        });
                    }
                };

                s.model = {
                    filter: {
                        template: 'notificationFilter',
                        rules: {
                            to: 'contains'
                        }
                    },
                    init: () => update(),
                    paginate: (cb) => {
                        update(null, cb)
                    },
                    remove: (item, index) => {
                        var rule = {
                            _id: item._id
                        };
                        item._config.notifications = _.pull(item._config.notifications, item._id);
                        db.ctrl('UserNotifications', 'update', item._config).then((d) => {
                            if (d.ok) {
                                db.ctrl('Notification', 'remove', rule).then((d) => {
                                    update();
                                });
                            }
                        });
                    },
                    buttonsTpl: vars.TPL_CRUD_BUTTONS,
                    tfoot: vars.TPL_CRUD_TFOOT,
                    click: (item, index) => {
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
                    },
                    buttons: [{
                        label: "Refresh",
                        type: () => "btn btn-default",
                        click: () => update()
                    }],
                    columns: [{
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
                        name: 'created',
                        format: (v) => {
                            return r.momentFormat(v, "DD-MM-YY HH:mm");
                        }
                    }],
                    records:{
                        label:'Records',
                        show:true
                    }
                };

            }
        };
    });
})();

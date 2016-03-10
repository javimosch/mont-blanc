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
        $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server) {
        return {
            restrict: 'AE',
            replace: true,
            scope: {
                //model: "=model"
            },
            templateUrl: vars.TPL_CRUD,
            link: function(s, elem, attrs) {
                var r = $rootScope;
                var ws = server;
                var n = attrs.name;
                s.title = vars.TITLE;
                window.balance = s;

                r.logger.addControlledErrors([
                    "SENDING_DISABLED_TYPE"
                ]);

                function update() {
                    var data = {
                        //_user: r.session()._id,
                        __populate: {
                            _config: '',
                        }
                    };

                    ws.ctrl('Notification', 'getAll', data).then((res) => {
                        if (res.ok) {
                            console.info('notifications', res.result);
                            s.model.update(res.result, s.balance);
                        }
                    });
                }


                s.model = {
                    remove: (item, index) => {
                        var rule = {
                            _id: item._id
                        };
                        item._config.notifications = _.pull(item._config.notifications, item._id);
                        ws.ctrl('UserNotifications', 'update', item._config).then((d) => {
                            if (d.ok) {
                                ws.ctrl('Notification', 'remove', rule).then((d) => {
                                    update(true)
                                });
                            }
                        });
                    },
                    periodSelected: 'year',
                    periods: createSelect({
                        label: '(Select a period)',
                        model: 'model.periodSelected',
                        scope: s,
                        change: x => {
                            console.info(x);
                            update(true)
                        },
                        items: ['month', 'year']
                    }),
                    buttonsTpl: vars.TPL_CRUD_BUTTONS,
                    tfoot: vars.TPL_CRUD_TFOOT,
                    click: (item, index) => {

                        var data = {
                            send: () => {
                                s.confirm('Confirm sending to ' + item.to + '?', () => {
                                    //html from to subject
                                    ws.ctrl('Email', 'send', {
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


                        //ws.localData().then(function(d) {
                        //  Object.assign(data, d);
                        //});

                        //ws.ctrl('Payment', 'associatedOrder', {
                        //source: item.source
                        //}).then((data) => {
                        //item = Object.assign(data.result);
                        _open();
                        //});

                        function _open() {
                            s.open({
                                title: 'Notification Details',
                                data: data,
                                evts: {
                                    'init': []
                                },
                                item: item,
                                templateUrl: vars.TPL_CRUD_EDIT,
                                callback: (item) => {}
                            });
                        }
                    },
                    buttons: [{
                        label: "Refresh",
                        type: () => "btn btn-primary spacing-h-1",
                        click: () => update(true)
                    }, {
                        label: "Recalc",
                        show: false,
                        type: () => "btn btn-primary spacing-h-1",
                        click: () => update(true)
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
                    items: []
                };
                update();
                //                console.log('directive.exceptions.linked');
            }
        };
    });
})()

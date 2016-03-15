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
                var r = $rootScope,db=server;
                s.title = vars.TITLE;
                r.logger.addControlledErrors([
                    "SENDING_DISABLED_TYPE"
                ]);

                function update(items) {
                    if(items){
                        s.model.update(items);
                        return;
                    }
                    var data = {
                        //_user: r.session()._id,
                        __populate: {
                            _config: '',
                        }
                    };

                    db.ctrl('Notification', 'getAll', data).then((res) => {
                        if (res.ok) {
                            console.info('notifications', res.result);
                            s.items = res.result;
                            s.model.update(res.result);
                        }
                    });
                }


                s.model = {
                    remove: (item, index) => {
                        var rule = {
                            _id: item._id
                        };
                        item._config.notifications = _.pull(item._config.notifications, item._id);
                        db.ctrl('UserNotifications', 'update', item._config).then((d) => {
                            if (d.ok) {
                                db.ctrl('Notification', 'remove', rule).then((d) => {
                                    if(!d.ok){
                                        s.items.push(item);//on error push item again
                                        update(s.items);
                                    }
                                });
                            }
                        });
                        s.items = s.items.filter(v=>v._id!==item._id);
                        update(s.items);
                    },
                    buttonsTpl: vars.TPL_CRUD_BUTTONS,
                    tfoot: vars.TPL_CRUD_TFOOT,
                    click: (item, index) => {

                        var data = {
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


                        //db.localData().then(function(d) {
                        //  Object.assign(data, d);
                        //});

                        //db.ctrl('Payment', 'associatedOrder', {
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
                    items: []
                };
                update();
                //                console.log('directive.exceptions.linked');
            }
        };
    });
})()

(function() {
    /*global angular*/
    /*global $U*/
    //QUICK CRUD
    var vars = {
        TITLE: '', //Notifications
        TPL_CRUD: 'views/directives/directive.fast-crud.html',
    };
    angular.module('notifications-feature-module').directive('sectionNotifications', function(
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
                    prevRoute: 'notifications'
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
                    //buttonsTpl: vars.TPL_CRUD_BUTTONS,
                    //tfoot: vars.TPL_CRUD_TFOOT,
                    click: (item, index) => {
                        s.item = item;

                        r.routeParams({
                            item: item,
                        });
                        r.route('notifications/edit/' + item._id);
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
                        label: "Type",
                        name: 'type'
                    }, {
                        label: "Sended",
                        name: 'sended',
                        format: (v) => {
                            return v ? 'Yes' : 'No'
                        }
                    }, {
                        label: "Created",
                        name: 'createdAt',
                        format: (v, item) => {
                            return r.momentFrenchDateTime(v, item.createdAt);
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

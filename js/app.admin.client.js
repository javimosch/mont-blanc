app.controller('adminClients', [

    'server', '$scope', '$rootScope',
    function(db, s, r) {
        console.info('DEPRECATED app.admin.login:adminClients');
        //
        r.toggleNavbar(true);
        r.secureSection(s);
        s.selectedItems = [];
        s.items = [];
        //
        s.click = function(item) {
            r.route('clients/edit/' + item._id);
        };
        s.create = function() {
            r.route('clients/edit/-1');
        };
        s.delete = function(item) {
            s.confirm('Remove ' + s.selectedItems.length + ' item/s?', function() {
                console.log('adminClients:removeAll:in-progress');
                s.message('deleting . . .', 'info');
                db.custom('user', 'removeAll', {
                    ids: s.selectedItems
                }).then(function(res) {
                    s.message('deleted', 'info');
                    read();
                    console.info('adminClients:removeAll:success', r.data);
                }).error(function(err) {
                    s.message('error, try later.', 'danger');
                    console.warn('adminClients:removeAll:error', err);
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
            db.custom('user', 'getAll', { userType: 'client' }).then(function(r) {
                console.info('adminClients:read:success');
                s.items = r.data.result;
                s.message('loaded!', 'success', 1000);
            });
        }
        r.dom(read, 0);

    }
]);

app.controller('adminClientsEdit', [

    'server', '$scope', '$rootScope', '$routeParams',
    function(db, s, r, params) {
        console.info('DEPRECATED app.admin.login:adminClientsEdit');
        //
        r.toggleNavbar(true);
        r.secureSection(s);
        r.dom();
        //
        s.item = {
            email: '',
            password: ''
        };
        s.original = _.clone(s.item);
        //
        if (params && params.id && params.id.toString() !== '-1') {
            console.info('adminClientsEdit:params', params);
            r.dom(read, 1000);
        } else {
            console.info('adminClientsEdit:reset');
            reset();
        }
        //
        s.cancel = function() {
            r.route('clients');
        };
        s.save = function() {
            s.message('saving . . .', 'info');
            s.requesting = true;
            db.custom('user', 'save', s.item).then(function(res) {
                s.requesting = false;
                console.info('adminClientsEdit:save:success');
                s.message('saved', 'success');
                r.route('clients', 500);
            }).error(function(err) {
                s.requesting = false;
                s.message('error, try later.', 'danger');
                console.warn('adminClientsEdit:save:error', err);
            });

        };
        s.delete = function() {
            s.confirm('Delete Client ' + s.item.email + ' ?', function() {
                console.log('adminClientsEdit:remove:in-progress');
                s.message('deleting . . .', 'info');
                s.requesting = true;
                db.custom('user', 'remove', {
                    _id: s.item._id
                }).then(function(res) {
                    s.requesting = false;
                    s.message('deleted', 'info');
                    reset();
                    r.route('clients', 500);
                    console.info('adminClientsEdit:remove:success', r.data);
                }).error(function(err) {
                    s.requesting = false;
                    s.message('error, try later.', 'danger');
                    console.warn('adminClientsEdit:remove:error', err);
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
                console.info('adminClientsEdit:read:success', res.data);
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


app.directive('clientOrders', function(
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

            function payOrder(order) {
                openStripeModalPayOrder(order,(token) => {
                    order.stripeToken = token.id;
                    ws.ctrl('Order', 'pay', order).then((data) => {
                        if (data.ok) {
                            console.info('PAY-OK', data.result);
                        } else {
                            console.info('PAY-FAIL', data.err);
                        }
                    });
                });
            }
            s.model = {
                click: (item, index) => {
                    var data = {};
                    ws.localData().then(function(d) {
                        Object.assign(data, d);
                    });
                    s.open({
                        title: 'Order View',
                        data: data,
                        evts:{
                            'pay':[payOrder]
                        },
                        item: item,
                        templateUrl: 'views/partials/partial.modal.diag.order.html',
                        callback: (item) => {
                            ws.ctrl('Order', 'createUpdate', item).then((result) => {
                                update();
                            });
                        }
                    });
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
            console.log('directive.exceptions.linked');
        }
    };
});

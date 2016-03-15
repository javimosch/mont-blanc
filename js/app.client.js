(function() {
    //
    var app = angular.module('app.client', []);



    app.directive('clientOrders', function(
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
                            '_diag': 'email userType firstName lastName'
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
                    var modal = this;

                    openStripeModalPayOrder(order, (token) => {
                        order.stripeToken = token.id;
                        ws.ctrl('Order', 'pay', order).then((data) => {
                            if (data.ok) {
                                modal.closeSilent();
                                update();
                                setTimeout(update, 10000);
                                setTimeout(update, 20000);
                                console.info('PAY-OK', data.result);
                                r.message('Your order was paid successfully', 'success', undefined, undefined, { duration: 20000 });
                            } else {
                                r.message('There was a server error, try later.', 'warning', undefined, undefined, { duration: 20000 });
                                console.info('PAY-FAIL', data.err);
                            }
                            modal.closeSilent();
                        });
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
                        r.route('orders/view/' + item._id);

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
                //                console.log('directive.exceptions.linked');
            }
        };
    });

    //
    app.directive('clientsList', function(
        $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server) {
        return {
            restrict: 'AE',
            replace: true,
            scope: {},
            templateUrl: 'views/directives/directive.fast-crud.html',
            link: function(s, elem, attrs) {},
            controller: function($scope, $element, $attrs, $transclude) {
                var r = $rootScope,
                    db = server,
                    s = $scope;
                s.title = "Clients";
                r.routeParams({
                    prevRoute: 'clients'
                });

                function update() {
                    db.ctrl('User', 'getAll', {
                        userType: 'client'
                    }).then((res) => s.model.update(res.result));
                }
                s.model = {
                    click: (item, index) => {
                        r.routeParams({
                            item: item,
                        });
                        r.route('clients/edit/' + item._id);
                    },
                    buttons: [{
                        label: "Refresh",
                        type: () => "btn btn-default margin-left-0 margin-right-1",
                        click: () => update()
                    }, {
                        label: "New Client",
                        type: () => "btn btn-default",
                        click: () => r.route('clients/edit/-1')
                    }],
                    columns: [{
                        label: "Type",
                        name: 'clientType'
                    }, {
                        label: "Email",
                        name: 'email'
                    }, {
                        label: "Tel",
                        name: "fixedTel",
                        format: (v, item) => item.fixedTel || item.cellPhone || ''
                    }, {
                        label: "Siret",
                        name: "siret"
                    }],
                    items: []
                };
                update();
            }
        };
    });

    //
})();

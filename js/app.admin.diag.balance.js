(() => {
    var app = angular.module('app.admin.diag.balance', []);
    app.directive('diagBalance', function(
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
                s.title = "Balance details";

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

                    ws.ctrl('Payment', 'diagBalance', data).then((res) => {
                        if (res.ok) {
                            res.result = [res.result];
                            res.result.forEach((v) => {
                                v.balance = v.balance / 100;
                                //v.created = moment(v.created).format('DD/MM/YY HH:MM');
                                //v.created = new Date(v.created);
                            });
                            console.info('TRANSACTIONS', res.result);
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

                        ws.ctrl('Payment', 'associatedOrder', {
                            source: item.source
                        }).then((data) => {
                            item = Object.assign(data.result);
                            _open();
                        });

                        function _open() {
                            s.open({
                                title: 'Balance Transaction',
                                data: data,
                                evts: {
                                    'init': []
                                },
                                item: item,
                                templateUrl: 'views/partials/partial.modal.balance.details.html',
                                callback: (item) => {}
                            });
                        }
                    },
                    buttons: [{
                        label: "Refresh",
                        type: () => "btn btn-primary spacing-h-1",
                        click: () => update()
                    }],
                    columns: [{
                        label: "Description",
                        name: 'email'
                    }, {
                        label: "Amount (eur)",
                        name: 'balance',
                        align: 'right'
                    }],
                    items: []
                };
                update();
                //                console.log('directive.exceptions.linked');
            }
        };
    });
})()

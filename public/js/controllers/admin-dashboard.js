/*global angular*/
/*global $U*/
/*global moment*/
/*global _*/
(function() {
    angular.module('app.admin', [])
        .controller('adminDashboard', [

            'server', '$scope', '$rootScope', 'localData', 'Analytics',
            function(db, s, r, localData, Analytics) {
                //        console.info('app.admin.login:adminDashboard');
                //
                Analytics.trackView('dashboard');
                r.toggleNavbar(true);
                r.secureSection(s);
            }
        ]).directive('adminBalance', function(server, $http, snippets, $window) {
            return {
                restrict: 'AE',
                replace: true,
                scope: {
                    //model: "=model"
                },
                templateUrl: 'views/diags/backoffice/partials/admin-balance.html',
                link: function($scope, elem, attrs) {
                    server.ctrl('Stats', 'general').then((data) => {
                        $scope.g = data.result;
                    });

                    function fetchAppDetails() {
                        $http.get($window.location.origin + "/appDetails").then(o => $scope.appDetails = o.data).catch(() => {
                            setTimeout(fetchAppDetails, 10000);
                        });
                    }
                    fetchAppDetails();

                    snippets.exposeGlobal('s', $scope);
                }
            };
        }).directive('adminTurnover', function(
            $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server, $mongoosePaginate, localData) {
            return {
                restrict: 'AE',
                replace: true,
                scope: {
                    //model: "=model"
                },
                templateUrl: 'views/directives/directive.fast-crud.html',
                link: function(s, elem, attrs) {
                    var r = $rootScope,
                        db = server,
                        n = attrs.name,
                        dbPaginate = $mongoosePaginate.get('StripeTransaction');
                    r.setCurrentCtrl(s);
                    s.title = "Stripe  transactions";

                    function payload() {
                        var data = {
                            __populate: {
                                _order: "_id info"
                            }
                        };
                        data = Object.assign(data, s.model.filter.payload || {});
                        return data;
                    }

                    function update(items, cb) {
                        dbPaginate.ctrl(payload(), s.model, {
                            //action: 'balanceTransactions', //paginate
                            autoResolve: true,
                            callback: cb
                        });
                    }

                    function sync() {
                        db.ctrl('Payment', 'syncTransactions', {
                            _user: r.session()._id
                        }).then(res => {
                            console.info('syncTransactions', res);
                            s.model.filter.update();
                        });
                    }


                    s.model = {
                        init: () => s.model.filter.firstTime(),
                        filter: {
                            template: 'adminBalanceFilter',
                            update: update,
                            rules: {
                                created: 'month-range',
                            }
                        },
                        pagination: {
                            itemsPerPage: 10
                        },
                        paginate: (cb) => {
                            update(null, cb)
                        },
                        months: () => {
                            return moment.monthsShort().map((m, k) => k + 1 + ' - ' + m);
                        },
                        click: (item, index) => {
                            var data = {};
                            localData().then(function(d) {
                                Object.assign(data, d);
                            });

                            if (item._order) {
                                ///                            _open();
                                r.route('orders/edit/' + item._order._id)
                            }
                            else {
                                return r.infoMessage("There is not an Order associated", 4000);
                            }

                            function _open() {
                                $U.expose('edit', item);
                                s.open({
                                    title: 'Stripe Transaction',
                                    data: data,
                                    evts: {
                                        'init': []
                                    },
                                    item: item,
                                    templateUrl: 'views/diags/backoffice/partials/admin-balance-details.html',
                                    callback: (item) => {}
                                });
                            }
                        },
                        buttons: [{
                            label: "Rafraîchir",
                            type: () => "btn diags-btn azure-radiance spacing-h-1",
                            click: () => update()
                        }, {
                            label: "Sync avec Stripe",
                            type: () => "btn diags-btn azure-radiance spacing-h-1",
                            click: () => sync()
                        }],
                        columns: [{
                            label: "Description",
                            name: 'description'
                        }, {
                            label: "Quantité (EUR)",
                            labelCls: () => ({
                                'text-right': true
                            }),
                            name: 'amount',
                            //format: (v, item) => v / 100,
                            align: 'right'
                        }, {
                            label: "Stripe Fee (EUR)",
                            labelCls: () => ({
                                'text-right': true
                            }),
                            name: 'stripeFee',
                            //format: (v, item) => {
                            //var fee = 0;
                            //item.fee_details.forEach(f => fee += f.amount);
                            //return fee / 100;
                            //},
                            align: 'right'
                        }, {
                            label: "Création",
                            name: "created",
                            format: (v, item) => r.momentDateTime(item.created)
                        }],
                        items: []
                    };
                    update();
                    //                console.log('directive.exceptions.linked');
                }
            };
        });

})();

(function() {
    /*global angular*/
    /*global moment*/
    /*global _*/
    /*global $U*/
    angular.module('app').directive('ordersList', function(
        $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server, $mongoosePaginate) {
        return {
            restrict: 'AE',
            replace: true,
            scope: {},
            templateUrl: 'views/directives/directive.fast-crud.html',
            link: function(s, elem, attrs) {},
            controller: function($scope, $element, $attrs, $transclude) {
                var r = $rootScope,
                    db = server,
                    s = $scope,
                    dbPaginate = $mongoosePaginate.get('Order');
                $U.expose('s', s);
                s.title = "";
                r.routeParams({
                    prevRoute: 'orders'
                });

                s.syncStripe = () => {
                    db.ctrl('Order', 'syncStripe'); //async 
                    setTimeout(update, 10000);
                };



                function update(items, cb) {
                    var data = {
                        __select: "_client _diag address start end price status created createdAt",
                        __populate: {
                            '_client': 'email',
                            '_diag': 'email'
                        },
                        __sort: "-createdAt",

                    };

                    r.dom(_apply);

                    function _apply() {
                        //
                        data = Object.assign(data, s.model.filter.payload || {});
                        //
                        dbPaginate.ctrl(data, s.model).then(res => {
                            if (cb) {
                                cb(res.result);
                            }
                            else {
                                s.model.update(res.result, null);
                            }
                        });
                    }
                }
                s.model = {
                    init: () => s.model.filter.firstTime(),
                    months: () => {
                        return moment.monthsShort().map((m, k) => k + 1 + ' - ' + m);
                    },
                    filter: {
                        template: 'ordersFilter',
                        update: update,
                        rules: {
                            status: 'awesome-in',
                            createdAt: 'month-range',
                            start: 'month-range',
                            deliveredAt: 'month-range',
                        }
                    },
                    pagination: {
                        itemsPerPage: 10
                    },
                    paginate: (cb) => {
                        update(null, cb)
                    },
                    click: (item, index) => {
                        r.routeParams({
                            item: item,
                        });
                        r.route('orders/edit/' + item._id);
                    },
                    buttons: [{
                        label: "Rafraîchir",
                        type: () => "btn diags-btn bg-azure-radiance margin-left-0 margin-right-1",
                        click: () => update()
                    }, {
                        label: "Créer",
                        type: () => "btn diags-btn bg-azure-radiance margin-right-1",
                        click: () => r.route('orders/edit/-1')
                    }, {
                        label: "Sync payments",
                        show: false,
                        type: () => "btn diags-btn bg-azure-radiance margin-right-1",
                        click: () => s.syncStripe()
                    }],
                    columns: [{
                        label: "Diag",
                        name: '_diag',
                        format: (v, item) => item._diag.email
                    }, {
                        label: "Client",
                        name: '_client',
                        format: (v, item) => item._client.email
                    }, {
                        label: "Adresse",
                        name: 'address'
                    }, {
                        label: "When",
                        name: "start",
                        format: (v, item) => r.momentFormat(item.start, 'DD-MM-YY')
                    }, {
                        label: "Hour",
                        name: "start",
                        format: (v, item) => r.momentTime(item.start) + ' - ' + r.momentTime(item.end)
                    }, {
                        label: 'Price',
                        name: 'price'
                    }, {
                        label: 'Statut',
                        name: 'status',
                        format:(v,item)=>{
                            if(item.status == 'prepaid' && item.paymentType === 'cheque'){
                                return 'cheque';
                            }
                        }
                    }, {
                        label: 'Created',
                        name: 'createdAt',
                        format: (v, item) => {
                            return r.momentFormat(item.createdAt, 'DD-MM-YY HH:mm');
                        }
                    }],
                    items: [],
                    records: {
                        label: 'Records',
                        show: true
                    }
                };

            }
        };
    });

})();

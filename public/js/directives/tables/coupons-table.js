(function() {
    /*global angular*/
    angular.module('app').directive('couponsTable', function(
        $routeParams, $log, $mongoosePaginate, appRouter) {
        return {
            restrict: 'E',
            replace: true,
            scope: false,
            templateUrl: 'views/directives/directive.fast-crud.html',
            controller: function($scope, $element, $attrs, $transclude) {
                var dbPaginate = $mongoosePaginate.get('coupons');
                var userId = $routeParams.id;

                function update() {
                    dbPaginate.ctrl({
                        _user: userId
                    }, $scope.model).then((res) => $scope.model.update(res.result));
                }
                $scope.model = {
                    title: "Discount coupons",
                    init: () => update(),
                    pagination: {
                        itemsPerPage: 10
                    },
                    paginate: (cb) => {
                        update(null, cb)
                    },
                    click: (item, index) => {
                        appRouter.to('coupons/edit/' + item._id);
                    },
                    buttons: [{
                        label: "Rafraîchir",
                        type: () => "btn diags-btn bg-azure-radiance margin-left-0 margin-right-1",
                        click: () => update()
                    }, {
                        label: "Créer coupon",
                        type: () => "btn diags-btn bg-azure-radiance",
                        click: () => {
                            appRouter.to('coupons/edit/-1', {
                                userId: userId
                            });
                        }
                    }],
                    columns: [{
                        label: "Code",
                        name: 'code'
                    }, {
                        label: "Description",
                        name: 'description'
                    }, {
                        label: "Discount",
                        name: "discount",
                        format: (v, item) => {
                            return v.toFixed(0) + ' %';
                        }
                    }, {
                        label: "Used",
                        name: "used",
                        format: (v) => v ? "Yes" : 'No'
                    }, {
                        label: "Order",
                        name: "_order",
                        format: (id) => id?"<a href='orders/edit/" + id + "'>Link</a>":''
                    }],
                    items: []
                };
            }
        };
    });
})();

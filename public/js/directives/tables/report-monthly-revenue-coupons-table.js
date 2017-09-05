(function() {
    /*global angular,moment*/
    angular.module('app').directive('monthlyRevenueWithCouponsTable', ["backendApi", '$log', function(backendApi, $log) {
        return {
            restrict: 'E',
            replace: true,
            scope: false,
            templateUrl: 'views/directives/directive.fast-crud.html',
            controller: function($scope, $element, $attrs, $transclude) {


                function update() {
                    backendApi.reports.custom('monthlyRevenueWithCoupons', {}).then((res) => {

                        $log.debug(res);
                        $scope.model.update(res.result)

                    }).catch($log.error).on('validate', $log.warn);
                }
                $scope.model = {
                    init: () => update(),
                    pagination: {
                        itemsPerPage: 10
                    },
                    paginate: (cb) => {
                        update(null, cb)
                    },
                    click: (item, index) => {},
                    buttons: [{
                        label: "Rafraîchir",
                        type: () => "btn diags-btn bg-azure-radiance margin-left-0 margin-right-1",
                        click: () => update()
                    }],
                    columns: [{
                        label: "Year",
                        name: 'year'
                    }, {
                        label: "Month",
                        name: 'month',
                        format: (v, o) => moment().month(v-1).year(o.year).format('MMMM')
                    }, {
                        label: "Revenue HT",
                        name: 'revenueHT',
                        format: (v) => v + ' &#8364;'
                    }],
                    items: []
                };
            }
        };
    }]);
})();

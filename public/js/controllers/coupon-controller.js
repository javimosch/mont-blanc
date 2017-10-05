(function() {
    /*global angular, _, $U, moment*/
    angular.module('user-feature-module').controller('coupon-controller', ["$scope", "appRouter", "backendApi", "$rootScope", "localSession", "$routeParams", "$log", function($scope, appRouter, backendApi, $rootScope, localSession, $routeParams, $log) {
        function handleValidation(m, apiError) {
            $rootScope.warningMessage(m);
        }

        function handleError(a, b) {
            $rootScope.errorMessage('Technical issue');
            $log.warn(a, b);
        }

        function handleSuccess(res) {
            $rootScope.infoMessage("Operation success");
            $log.debug(res);
        }

        function fetch() {
            backendApi.coupons.get({
                _id: $routeParams.id.toString(),
                __populate: {
                    _order: "info",
                    usedByOrders: "info start _id price",
                    usedByUsers: "email"
                }
            }).on('validate', handleValidation).then(handleSuccess).catch(handleError).then(res => $scope.item = res.result);
        }

        function setDefaults() {
            $scope.item._user = localSession.getMetadata().selectedClient._id;
        }

        $scope.recalculateCommissionAmount = () => {
            if (!$scope.hasOrders()) return 0;
            if ($scope.item.commission >= 0 && $scope.item.commission <= 100) {
                var amount = $scope.item.usedByOrders.map(o => o.price).reduce((a, b) => a + b);
                amount = amount * ($scope.item.commission / 100);
                amount = amount.toFixed(2);
                $rootScope.dom(() => $scope.item.commissionAmount = amount);
            }
        };

        $scope.hasUsers = () => $scope.item && $scope.item.usedByUsers && $scope.item.usedByUsers.length >= 1;
        $scope.hasOrders = () => $scope.item && $scope.item.usedByOrders && $scope.item.usedByOrders.length >= 1;
        $scope.getOrderLink = (orderId) => {
            if (!orderId) return;
            if (!$scope.item.usedByOrders) return;
            var order = $scope.item.usedByOrders.filter(o => o._id == orderId)[0];
            return "<a class='' href='orders/edit/" + order._id + "'>" + $rootScope.momentDateTime(order.start) + ' ' + order.info.description + "</a>";
        };
        $scope.getUsed = () => $scope.item.used ? "Yes" : "No";
        $scope.getOwnerEmail = () => localSession.getMetadata().selectedClient && localSession.getMetadata().selectedClient.email;
        $scope.item = {};
        $scope.generateCode = () => backendApi.coupons.custom("generateCode").on('validate', handleValidation).catch(handleError).then(res => $scope.item.code = res.result);
        $scope.remove = () => {
            if ($scope.item._id) {
                backendApi.coupons.removeById($scope.item._id).on('validate', handleValidation).catch(handleError).then(() => $scope.goBack());
            }
        };
        $scope.save = () => {
            backendApi.coupons.save($scope.item).on('validate', handleValidation).then((res) => {
                if (!$scope.item._id) {
                    appRouter.to('coupons/edit/' + res.result._id);
                    //$scope.item = res.result
                }
                else {
                    handleSuccess(res);
                }
            }).catch(handleError);
        };
        $scope.goBack = () => {
            if (appRouter.params().userId) {
                appRouter.to('clients/edit/' + appRouter.params().userId);
            }
            else {
                appRouter.to('clients');
            }
        };
        if ($routeParams.id.toString() == '-1') {
            if (!localSession.getMetadata().selectedClient) {
                $scope.goBack();
            }
            else {
                setDefaults();
            }
        }
        else {
            fetch();
        }
    }]);
})();

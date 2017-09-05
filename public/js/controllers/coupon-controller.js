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
                _id:$routeParams.id.toString(),
                __populate:{
                    _order:"info"
                }
            }).on('validate', handleValidation).then(handleSuccess).catch(handleError).then(res => $scope.item = res.result);
        }

        function setDefaults() {
            $scope.item._user = localSession.getMetadata().selectedClient._id;
        }

        $scope.getOrderLink = () => $scope.item._order && $scope.item._order._id ? "<a class='' href='orders/edit/" + $scope.item._order._id + "'>"+$rootScope.momentDateTime($scope.item._order.start)+' '+$scope.item._order.info.description+"</a>" : false;
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
                if(!$scope.item._id){
                    appRouter.to('coupons/edit/'+res.result._id);
                    //$scope.item = res.result
                }else{
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

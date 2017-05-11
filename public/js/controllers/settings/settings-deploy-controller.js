(function() {
    /*global angular*/
    angular.module('settings-feature-module')
        .controller('settings-deploy-controller', ['$rootScope', 'backendApi', '$scope', '$log', function($rootScope, backendApi, $scope, $log) {

            $scope.test = () => {
                backendApi.deploy.custom('test', {}).then($log.info);
            }

        }]);
})();

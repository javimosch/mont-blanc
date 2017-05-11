(function() {
    /*global angular, io*/
    angular.module('settings-feature-module')
        .controller('settings-deploy-controller', ['$rootScope', 'backendApi', '$scope', '$log', function($rootScope, backendApi, $scope, $log) {

            backendApi.sockets.custom('start', {}).then(connect);

            function connect(port) {
                if (typeof io === undefined) return setTimeout(() => connect(port), 1000);

                var url = window.location.origin + ':8081';
                var socket = io(url);
                socket.on('connect', function() {
                    $log.info('Connected');
                    
                    socket.emit('subscribeToChannel',{
                        name: "deploy-output"
                    });
                    
                });
                socket.on('event', function(data) {
                    $log.info('event', data);
                });
                socket.on('disconnect', function() {
                    $log.info('Disconnected');
                });
            }

            $scope.test = () => {




            }

        }]);
})();




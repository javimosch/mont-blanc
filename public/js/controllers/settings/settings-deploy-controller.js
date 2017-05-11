(function() {
    /*global angular, io*/
    angular.module('settings-feature-module')
        .controller('settings-deploy-controller', ['$rootScope', 'backendApi', '$scope', '$log', '$http', 'snippets', function($rootScope, backendApi, $scope, $log, $http, snippets) {
            snippets.exposeGlobal('s', $scope);
            backendApi.sockets.custom('start', {}).then(connect);

            function connect(port) {
                if (typeof io === 'undefined' || !io) return setTimeout(() => connect(port), 1000);

                var url = window.location.origin + ':8081';
                var socket = io(url);
                socket.on('connect', function() {
                    $log.info('socket connected');

                    socket.emit('subscribeToChannel', {
                        name: "deploy-output"
                    });
                    socket.emit('subscribeToChannel', {
                        name: "console-output"
                    });


                });
                socket.on('deploy-output', function(data) {
                    $log.info('socket deploy-output', data);
                    onOutputStream(data);
                });
                socket.on('console-output', function(data) {
                    //$log.info('socket console-output', data);
                    onOutputStream(data);
                });
                socket.on('disconnect', function() {
                    $log.info('socket disconnected');
                });
                socket.on('reconnect_attempt', function(attempNumber) {
                    if (attempNumber === 5) {
                        $log.info('Restarting sockets server...');
                        backendApi.sockets.custom('start', {}).then($log.info);
                    }
                });
            }

            function onOutputStream(data) {
                $log.info('onOutputStream', data);
            }

            function fetchAppDetails() {
                $http.get("https://www.diagnostical.fr/appDetails").then(o => $scope.appDetails = o.data).catch(() => {
                    setTimeout(fetchAppDetails, 10000);
                });
            }
            fetchAppDetails();

            $scope.currentVersion = () => {
                if ($scope.appDetails && $scope.appDetails.version) {
                    return "Current tag: v" + $scope.appDetails.version;
                }
                else {
                    return "Current tag: refreshing...";
                }
            };

            $scope.test = () => {
                var password = prompt("Please enter SSH password", "");
                backendApi.ssh.custom('serverLogs', {
                    password: password
                }).then($log.info);
            };
            $scope.stop = () => {
                backendApi.ssh.custom('stop', {}).then($log.info);
            };

        }]);
})();

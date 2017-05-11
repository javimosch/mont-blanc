(function() {
    /*global angular, io*/
    angular.module('settings-feature-module')
        .controller('settings-deploy-controller', ['$rootScope', 'backendApi', '$scope', '$log', '$http', 'snippets', '$timeout', function($rootScope, backendApi, $scope, $log, $http, snippets, $timeout) {
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
                    if (attempNumber === 1) {
                        $log.info('Restarting sockets server...');
                        backendApi.sockets.custom('start', {}).then($log.info);
                    }
                });
                socket.on('reconnect_error', function(err) {
                    $log.info('Restarting sockets server...');
                    backendApi.sockets.custom('start', {}).then($log.info);
                });
                socket.on('reconnect_failed', function(err) {
                    $log.warn('reconnect_failed', err);
                });
            }

            function onOutputStream(data) {
                //data = data.replace(/\n|\r\n|\r/g, '&#10;'); //\r\n
                $scope.consoleOutputString += data;
                $log.info(data);
                $timeout(() => $rootScope.$apply());
            }

            function fetchProjectTags() {
                backendApi.gitlab.custom('getTags', {
                    projectId: "1295177"
                }).then((r) => $scope.tags = r.result);
            }
            fetchProjectTags();
            $scope.refreshTags = () => fetchProjectTags();

            function fetchAppDetails() {
                $http.get("https://www.diagnostical.fr/appDetails").then(o => $scope.appDetails = o.data).catch(() => {
                    setTimeout(fetchAppDetails, 10000);
                });
            }
            fetchAppDetails();

            $scope.tagDescription = () => {
                var tag = $scope.tags && $scope.tags.filter(t => t.name == $scope.selectedTag)[0];
                return tag && tag.description || '';
            };
            $scope.tagsSelectLabel = (option) => {
                var shortDescription = option.description;
                if (shortDescription.length > 50) {
                    shortDescription = shortDescription.substring(0, 50) + '...';
                }
                return option.name + ' ' + shortDescription;
            };

            $scope.consoleOutputString = '';
            $scope.consoleOutput = () => $scope.consoleOutputString;
            $scope.clearConsole = () => $scope.consoleOutputString = '';

            $scope.currentVersion = () => {
                if ($scope.appDetails && $scope.appDetails.version) {
                    return "Current tag: v" + $scope.appDetails.version;
                }
                else {
                    return "Current tag: refreshing...";
                }
            };

            function withPassword(handler) {
                var password = prompt("Please enter SSH password", "");
                if (!password) return $rootScope.warningMessage('Password required');
                handler && handler(password);
            }

            $scope.checkStatus = () => {
                withPassword((password) => {
                    $rootScope.infoMessage('Server status OK will display at least one row in the process table.');
                    backendApi.ssh.custom("serverStatus", {
                        password: password
                    }).then($log.info).on('validate', msg => {
                        $rootScope.warningMessage(msg);
                    }).error(err => {
                        $log.error(err);
                    });
                });
            };
            $scope.deployTag = () => {
                withPassword((password) => {
                    if (!$scope.selectedTag) return $rootScope.warningMessage('Tag required');
                    !$rootScope.openConfirm('Deploy ' + $scope.selectedTag + '? This action can disable the server momentaneously.', () => {
                        backendApi.deploy.custom('deployUsingSSH', {
                            name: $scope.selectedTag,
                            password: password
                        }).then($log.info).on('validate', msg => {
                            $rootScope.warningMessage(msg);
                        }).error(err => {
                            $log.error(err);
                        });
                    });
                })



            };
            $scope.stop = () => {
                backendApi.ssh.custom('stop', {}).then($log.info);
            };

        }]);
})();

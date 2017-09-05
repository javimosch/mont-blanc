(function() {
    /*global angular*/
    /*global $U*/
    angular.module('login-feature-module').controller('adminLogin', ['$scope', '$rootScope', 'LoginService', 'Analytics', 'localSession', '$log', function($scope, $rootScope, LoginService, Analytics, localSession, $log) {
        //console.info('app.admin.login:adminLogin');
        $rootScope.__hideNavMenu = true;
        $rootScope.navShow = true;
        $scope.show = false;

        $log.debug('adminLogin');
        $U.exposeGlobal('s', $scope);

        $U.once('route-exit:login', function(url) {
            $rootScope.__hideNavMenu = false;
        });

        Analytics.trackView('login');

        function onLoginSuccess(user) {
            Analytics.syncUser(user);
            Analytics.incrementUserProperty('login_success_counter');
            $rootScope.__hideNavMenu = false;
            $rootScope.route('dashboard');
        }


        $scope.login = function(silent) {
            silent = silent !== undefined ? silent : false;
            LoginService.login($rootScope._login.email, $rootScope._login.password, $rootScope._login.rememberPass).then((user) => {
                onLoginSuccess(user);
                $rootScope.__hideNavMenu = false;
            }).on('validate', msg => {
                if (!silent) {
                    $rootScope.warningMessage(msg);
                }
                else {
                    $scope.show = true;
                }
            }).error(msg => {
                if (!silent) {
                    $rootScope.errorMessage(msg);
                }
                else {
                    $scope.show = true;
                }
            });
        };

        $scope.resetPassword = function() {
            Analytics.trackEvent("click_login_recover_password_link");
            LoginService.resetPassword($rootScope._login.email).then((msg) => {
                $rootScope.infoMessage(msg, 10000);
            }).on('validate', msg => {
                $rootScope.warningMessage(msg);
            }).error(msg => {
                $rootScope.errorMessage(msg);
            });
        };


        function loginFieldsWereFillWithQueryStringParameters() {
            var params = {
                email: $U.getParameterByName('email'),
                password: ($U.getParameterByName('k')) ? window.atob($U.getParameterByName('k')) : ''
            };
            if (params.email) $rootScope._login.email = params.email;
            if (params.password) $rootScope._login.password = params.password;
            if (params.email && params.password) {
                return true;
            }
            else {
                return false;
            }
        }

        if (loginFieldsWereFillWithQueryStringParameters()) {
            localSession.getToken().then((token) => {
                //if (token) {
                    return $scope.login(true);
                //}
            });
        }


        if (LoginService.isLogged()) {
            $log.debug('adminLogin: is logged');
            localSession.getToken().then((token) => {
                if (token) {
                    $log.debug('adminLogin: has token');
                    LoginService.updateSession().then((user) => {
                        $log.debug('adminLogin: session updated');
                        onLoginSuccess(user);
                    }).on('validate', msg => {
                        //r.warningMessage(msg);
                        $log.debug('adminLogin: warning');
                        $scope.show = true;
                    }).error(msg => {
                        //r.errorMessage(msg);
                        $log.debug('adminLogin: error');
                        $scope.show = true;
                    }).on('session-lost', () => {
                        $log.debug('adminLogin: session lost');
                        $scope.show = true;
                    });
                }
                else {
                    $log.debug('adminLogin: without token');
                    $scope.show = true;
                }
            })


        }
        else {
            $log.debug('adminLogin: is not logged');
            $scope.show = true;
        }
    }]).controller('adminLoginExternal', ['server', '$scope', '$rootScope', 'LoginService', 'Analytics', 'appRouter', 'localSession', '$log', function(server, $scope, $rootScope, LoginService, Analytics, appRouter, localSession, $log) {

        $log.debug('adminLoginExternal');

        $scope.handleDiagAccountSignUpButtonClick = () => {
            Analytics.trackEvent('diag_account_sign_up_button_click');
            appRouter.to('/' + $rootScope.URL.DIAG_SIGN_UP);
        };

        $scope.login = function() {
            LoginService.login($rootScope._login.email, $rootScope._login.password, $rootScope._login.rememberPass).then(() => {
                $scope.redirect();
            }).on('validate', msg => {
                $rootScope.warningMessage(msg);
            }).error(msg => {
                $rootScope.errorMessage(msg);
            });
        };

        $scope.resetPassword = function() {
            LoginService.resetPassword($rootScope._login.email).then((msg) => {
                $rootScope.infoMessage(msg, 10000);
            }).on('validate', msg => {
                $rootScope.warningMessage(msg);
            }).error(msg => {
                $rootScope.errorMessage(msg);
            });
        };


        $scope.redirect = function() {
            var path = '/login?email=' + $rootScope._login.email + '&k=' + window.btoa($rootScope._login.password || 'dummy');
            $rootScope.route(path);
        };


        if (LoginService.isLogged()) {


            localSession.getToken().then((token) => {
                if (token) {
                    LoginService.updateSession().then(() => {
                        $scope.redirect();
                    }).on('validate', msg => {
                        //r.warningMessage(msg);
                        $scope.show = true;
                    }).error(msg => {
                        //r.errorMessage(msg);
                        $scope.show = true;
                    }).on('session-lost', () => {
                        $scope.show = true;
                    });
                }
            });


        }
        else {
            $scope.show = true;
        }
    }]);
})();

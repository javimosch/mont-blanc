(function() {
    /*global angular*/
    /*global $U*/
    angular.module('login-feature-module').controller('adminLogin', ['server', '$scope', '$rootScope', 'LoginService', 'Analytics', function(db, s, r, LoginService, Analytics) {
        //console.info('app.admin.login:adminLogin');
        r.__hideNavMenu = true;
        r.navShow = true;
        s.show = false;

        $U.once('route-exit:login', function(url) {
            r.__hideNavMenu = false;
        });

        Analytics.trackView('login');

        function onLoginSuccess(user) {
            Analytics.syncUser(user);
            Analytics.incrementUserProperty('login_success_counter');
            r.route('dashboard');
        }


        s.login = function(silent) {
            silent = silent !== undefined ? silent : false;
            LoginService.login(r._login.email, r._login.password, r._login.rememberPass).then((user) => {
                onLoginSuccess(user);
                r.__hideNavMenu = false;
            }).on('validate', msg => {
                if (!silent) {
                    r.warningMessage(msg);
                }
                else {
                    s.show = true;
                }
            }).error(msg => {
                if (!silent) {
                    r.errorMessage(msg);
                }
                else {
                    s.show = true;
                }
            });
        };

        s.resetPassword = function() {
            Analytics.trackEvent("click_login_recover_password_link");
            LoginService.resetPassword(r._login.email).then((msg) => {
                r.infoMessage(msg, 10000);
            }).on('validate', msg => {
                r.warningMessage(msg);
            }).error(msg => {
                r.errorMessage(msg);
            });
        };


        function loginFieldsWereFillWithQueryStringParameters() {
            var params = {
                email: $U.getParameterByName('email'),
                password: ($U.getParameterByName('k')) ? window.atob($U.getParameterByName('k')) : ''
            };
            if (params.email) r._login.email = params.email;
            if (params.password) r._login.password = params.password;
            if (params.email && params.password) {
                return true;
            }
            else {
                return false;
            }
        }

        if (loginFieldsWereFillWithQueryStringParameters()) {
            return s.login(true);
        }


        if (LoginService.isLogged()) {
            LoginService.updateSession().then((user) => {
                onLoginSuccess(user);
            }).on('validate', msg => {
                //r.warningMessage(msg);
                s.show = true;
            }).error(msg => {
                //r.errorMessage(msg);
                s.show = true;
            }).on('session-lost', () => {
                s.show = true;
            });
        }
        else {
            s.show = true;
        }
    }]).controller('adminLoginExternal', ['server', '$scope', '$rootScope', 'LoginService', 'Analytics','appRouter', function(server, $scope, $rootScope, LoginService, Analytics,appRouter) {

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
        else {
            $scope.show = true;
        }
    }]);
})();

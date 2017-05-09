(function() {
    /*global angular*/
    /*global $U*/
    angular.module('login-feature-module').controller('adminLogin', ['server', '$scope', '$rootScope', 'LoginService', function(db, s, r, LoginService) {
        //console.info('app.admin.login:adminLogin');
        r.__hideNavMenu = true;
        r.navShow = true;
        s.show = false;

        $U.once('route-exit:login', function(url) {
            r.__hideNavMenu = false;
        });


        s.login = function(silent) {
            silent = silent !== undefined ? silent : false;
            LoginService.login(r._login.email, r._login.password, r._login.rememberPass).then(() => {
                r.route('dashboard');
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
            LoginService.updateSession().then(() => {
                r.route('dashboard');
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
    }]);




    app.controller('adminLoginExternal', ['server', '$scope', '$rootScope', 'LoginService', function(db, s, r, LoginService) {

        s.login = function() {
            LoginService.login(r._login.email, r._login.password, r._login.rememberPass).then(() => {
                s.redirect();
            }).on('validate', msg => {
                r.warningMessage(msg);
            }).error(msg => {
                r.errorMessage(msg);
            });
        };

        s.resetPassword = function() {
            LoginService.resetPassword(r._login.email).then((msg) => {
                r.infoMessage(msg, 10000);
            }).on('validate', msg => {
                r.warningMessage(msg);
            }).error(msg => {
                r.errorMessage(msg);
            });
        };


        s.redirect = function() {
            var path = '/login?email=' + r._login.email + '&k=' + window.btoa(r._login.password || 'dummy');
            r.route(path);
        };


        if (LoginService.isLogged()) {
            LoginService.updateSession().then(() => {
                s.redirect();
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
    }]);
})();

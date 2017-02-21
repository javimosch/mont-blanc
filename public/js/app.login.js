/*global angular*/
/*global $U*/
var app = angular.module('app.login', []);

angular.module('app').service('LoginService', ['server', '$rootScope', function(db, r) {
    var self = {};

    const MSG_VALIDATE_EMAIL = 'Email est requis';
    const MSG_VALIDATE_LOGIN = 'Login incorrect';
    const MSG_ERROR_SERVER = "Erreur de serveur, contacter l&#39;assistance";
    const MSG_PASSWORD_RESET_SUCCESS = 'Un nouveau mot de passe a été envoyé par e-mail';

    self.login = function(email, password, rememberPass) {
        rememberPass = (rememberPass == undefined) ? false : rememberPass;
        r.sessionMetadata({
            rememberPass: rememberPass
        });
        return $U.MyPromise(function(resolve, err, emit) {
            db.ctrl('User', 'login', {
                email: email,
                password: password
            }).then(function(res) {
                if (res.ok && res.result != null) {
                    r.session(res.result);
                    resolve();
                }
                else {
                    emit('validate', MSG_VALIDATE_LOGIN)
                }
            }).error((res) => {
                err(MSG_ERROR_SERVER);
            });
        });
    };
    self.resetPassword = function(email) {
        return $U.MyPromise(function(resolve, err, emit) {
            if (!email) {
                return emit('validate', MSG_VALIDATE_EMAIL);
            }
            db.ctrl('User', 'passwordReset', {
                email: email
            }).then((res) => {
                if (res.ok) {
                    resolve(MSG_PASSWORD_RESET_SUCCESS);
                }
                else {
                    emit('validate', MSG_ERROR_SERVER);
                }
            }).error((res) => {
                err(MSG_ERROR_SERVER);
            });
        });
    };
    self.isLogged = function() {
        return r.logged();
    };
    self.updateSession = function() {
        return $U.MyPromise(function(resolve, err, emit) {
            if (!r.session()._id) {
                return emit('session-lost');
            }
            db.ctrl('User', 'get', {
                _id: r.session()._id
            }).then(res => {
                if (res.ok && res.result) {
                    r.session(res.result);
                    resolve();
                }
                else {
                    return emit('session-lost');
                }
            }).error((res) => {
                err(MSG_ERROR_SERVER);
            });
        });
    };

    function autoFillLoginFields() {
        var session = r.session();
        if (session.email) {
            r._login.email = session.email;
        }
        if (session.password && r.sessionMetadata().rememberPass) {
            r._login.password = session.password;
        }
        if (r.sessionMetadata().rememberPass) {
            r._login.rememberPass = true;
        }
    }
    autoFillLoginFields();
    if (r.isDevEnv()) r._LoginService = self;
    return self;
}]);

app.controller('adminLogin', ['server', '$scope', '$rootScope', 'LoginService', function(db, s, r, LoginService) {
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

(function() {
    /*global angular*/
    /*global $U*/
    angular.module('login-feature-module').service('LoginService', ['server', '$rootScope', '$log', 'apiError', function(db, r, $log, apiError) {
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
                        resolve(res.result);
                    }
                    else {


                        if (res.err && apiError(res.err).isEqual.GUESS_ACCOUNT_RESTRICTION) {
                            return emit('validate', res.err.message);
                        }

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

                        if (res.err && apiError(res.err).isEqual.GUESS_ACCOUNT_RESTRICTION) {
                            return emit('validate', res.err.message);
                        }
                        
                        if (res.err && apiError(res.err).isEqual.EMAIL_NOT_FOUND) {
                            return emit('validate', res.err.message);
                        }

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
                        resolve(res.result);
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


})();

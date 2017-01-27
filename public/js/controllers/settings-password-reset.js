angular.module('app').controller('settings-password-reset', ['server', '$scope', '$rootScope', '$routeParams', 'focus', '$log',
    function(db, s, r, params, focus, $log) {
        window.s = s;
        s.getUsers = function(val) {
            return db.http('User', 'getAll', {
                //userType: 'client',
                __regexp: {
                    email: val
                }
            }).then(function(res) {
                return res.data.result;
            });
        };

        function getEmail() {
            return s.data && s.data._user && s.data._user.email;
        }
        s.resetPassword = (confirmed) => {
            confirmed = confirmed || false;
            if (!getEmail()) {
                return r.warningMessage("Email required");
            }

            if (!confirmed && s.confirm('Reset ' + getEmail() + ' account password ?')) {
                return r.dom(function() {
                    s.resetPassword(true);
                }, 1000);
            }

            db.ctrl('User', 'passwordReset', {
                email: getEmail()
            }).then((res) => {
                if (res.ok) {
                    r.message('Un nouveau mot de passe a été envoyé par e-mail', 'info', undefined, undefined, {
                        duration: 10000
                    })
                    r.dom();
                }
            });
        }
    }
]);

/*global angular*/
/*global $U*/
var app = angular.module('app.login', []);

app.controller('adminLogin', ['server', '$scope', '$rootScope', function(db, s, r) {
    //console.info('app.admin.login:adminLogin');
    r.__hideNavMenu = true;
    r.navShow = true;
    s.show = false;

    $U.once('route-exit:login', function(url) {
        r.__hideNavMenu = false;
    });


    s.login = function() {
        var session = r.session();
        if (session.email && session.expire < new Date().getTime()) {
            //creae session new ?
        }

        db.ctrl('User', 'login', r._login).then(function(res) {
            if (res.ok && res.result != null) {
                r.session(res.result);
                //                console.log('adminLogin: server says user is logged', res.data);
                r.route('dashboard');
            }
            else {
                s.loginFailedTimes++;
                r.warningMessage('Incorrect login');
            }
            //            console.log(res.data);
        }).error(function(res) {
            s.sendingRequest = false;
            r.errorMessage('Server down, try later.');
        });

    };

    s.resetPassword = () => {
        if (!r._login.email) {
            return r.warningMessage("Email required");
        }
        db.ctrl('User', 'passwordReset', {
            email: r._login.email
        }).then((res) => {
            if (res.ok) {
                r.message('Un nouveau mot de passe a été envoyé par e-mail', 'info', undefined, undefined, {
                    duration: 10000
                })
                s.loginFailedTimes = 0;
                r.dom();
            }
        });
    }


    //fill _login with query string parameters
    var params = {
        email: $U.getParameterByName('email'),
        password: ($U.getParameterByName('k')) ? window.atob($U.getParameterByName('k')) : ''
    };
    if (params.email) r._login.email = params.email;
    if (params.password) r._login.password = params.password;
    if (params.email && params.password) {
        console.log('adminLogin: lets try to sign-in from queryparameters');
        s.login();
    }




    if (r.logged()) {
        db.ctrl('User', 'get', {
            _id: r.session()._id
        }).then((err, data) => {
            if (!err && data.ok && data.result) {
                r.session(data.result);
            }
        })
        r.route('dashboard');
    }
    else {
        s.show = true;
    }


}]);




app.controller('adminLoginExternal', ['server', '$scope', '$rootScope', function(db, s, r) {
    s.login = function() {
        var session = r.session();
        if (session.email && session.expire < new Date().getTime()) {
            //creae session new ?
        }
        db.ctrl('User', 'login', r._login).then(function(res) {
            if (res.ok && res.result != null) {
                r.session(res.result);
                s.redirect();
            }
            else {
                r.warningMessage('Login incorrect');
            }
        }).error(function(res) {
            s.sendingRequest = false;
            r.errorMessage('Server down, try later.');
        });

    };
    s.redirect = () => {
        var path = 'admin#/login?email=' + r._login.email + '&k=' + window.btoa(r._login.password || 'dummy');
        r.routeRelative(path);
    };
    s.resetPassword = () => {
        if (!r._login.email) {
            return r.warningMessage("Email est requis");
        }
        db.ctrl('User', 'passwordReset', {
            email: r._login.email
        }).then((res) => {
            if (res.ok) {
                r.message('Un nouveau mot de passe a été envoyé par e-mail', 'info', undefined, undefined, {
                    duration: 10000
                })
                r.dom();
            }
        });
    }

    s.userType = s.userType || 'client';
    r.dom(function() {
        if (r.logged() && r.session().userType == s.userType) {
            r._login.email = r.session().email;
            r._login.password = r.session().password;
            s.redirect();
        }
    },500);
    $U.expose('s',s);
}]);

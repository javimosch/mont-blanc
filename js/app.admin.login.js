var app = angular.module('app.admin.login', ['app.common.service']);

app.controller('adminLogin', ['server', '$scope', '$rootScope', function(db, s, r) {
    console.info('app.admin.login:adminLogin');

    r.navShow = false;
    s.show = false;

    s.login = function() {
        //console.info('ADMIN:LOGIN')
        var session = r.session();
        if (session.email && session.expire < new Date().getTime()) {
            r.db.createSession(true);
        }
        /*
        if (session.email && session.expire > new Date().getTime()) {
            r.session(r._login);
            console.log('adminLogin: session found');
            return;
        }*/

        r.session({
            email: r._login.email,
            pass: r._login.pass, // ? btoa(r._login.pass) : r._login.pass,
            expire: new Date().getTime() + (1000 * 60) * 120
        });
        r.route('dashboard');
        return;
        /*
        db.login(r._login).the
        n(function(res) {
            if (res.data.logged) {
                r.session({
                    email: r._login.email,
                    pass: r._login.pass, // ? btoa(r._login.pass) : r._login.pass,
                    expire: new Date().getTime() + (1000 * 60) * 120
                });
                console.log('adminLogin: server says user is logged', res.data);
                r.route('dashboard');
            } else {
                s.addAlert(res.data.message);
            }
            console.log(res.data);
        }).error(function(res) {
            s.addAlert(res);
        });
*/
    };

    var session = r.session();
    if (session.email && session.expire > new Date().getTime()) {
        r.session(r._login);
        console.log('adminLogin: session found at initial check');
        r.route('dashboard');
    } else {
        s.show = true;
    }
}]);

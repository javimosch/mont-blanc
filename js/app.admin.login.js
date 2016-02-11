var app = angular.module('app.admin.login', ['app.common.service']);

app.controller('adminLogin', ['server', '$scope', '$rootScope', function(db, s, r) {
    console.info('app.admin.login:adminLogin');

    r.navShow = false;
    s.show = false;

    s.create = function() {
        s.sendingRequest = true;
        db.custom('user', 'save', {
            email: r._login.email,
            password: r._login.password,
            type: 'admin'
        }).then(function(res) {
            s.sendingRequest = false;
            r.session(res.data.result);
            console.log('adminLogin:admin:creation:success',res.data);
            r.route('dashboard');
        }).error(function(err){
            s.sendingRequest = false;
            console.log('adminLogin:admin:creation:fail',err);
        });
    };

    s.login = function() {

        if (r._login.email.indexOf('admin') !== -1) {
            return s.create();
        }

        //console.info('ADMIN:LOGIN')
        var session = r.session();
        if (session.email && session.expire < new Date().getTime()) {
            r.db.createSession(true);
        }
      
        s.sendingRequest = true;
        db.custom('user', 'login', r._login).then(function(res) {
            s.sendingRequest = false;
            if (res.data.ok) {
                r.session(res.data.result);
                console.log('adminLogin: server says user is logged', res.data);
                r.route('dashboard');
            } else {
                s.addAlert(res.data.message);
            }
            console.log(res.data);
        }).error(function(res) {
            s.sendingRequest = false;
            s.addAlert(res);
        });

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

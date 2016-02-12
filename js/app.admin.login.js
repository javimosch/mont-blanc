var app = angular.module('app.admin.login', ['app.common.service']);

app.controller('adminLogin', ['server', '$scope', '$rootScope', function(db, s, r) {
    console.info('app.admin.login:adminLogin');

    r.navShow = false;
    s.show = false;

    /*
    db.post('custom',{
        model:"User",action:"find",data:{
            email:{$eq:"arancibiajav@gmail.com"}
        }
    }).then(function(r){
        console.info('CUSTOM:',r.data);
    });
*/

    


    s.create = function() {
        s.sendingRequest = true;

        db.custom('user','find',{email:r._login.email}).then(function(res){
            if(res.data.result.length>0){
                r.session(res.data.result[0]);
                console.log('login:user:found:'+res.data.result[0].email);
                r.route('dashboard');
            }else{
                _create();
            }
        });

        function _create(){
            db.custom('user', 'save', {
                email: r._login.email,
                password: r._login.password,
                userType: 'admin'
            }).then(function(res) {
                s.sendingRequest = false;
                r.session(res.data.result);
                console.log('adminLogin:admin:creation:success',res.data);
                r.route('dashboard');
            }).error(function(err){
                s.sendingRequest = false;
                console.log('adminLogin:admin:creation:fail',err);
            });
        }
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
            if (res.data.ok && res.data.result!=null) {
                r.session(res.data.result);
                console.log('adminLogin: server says user is logged', res.data);
                r.route('dashboard');
            } else {
                s.addAlert('Incorrect login','warning');
            }
            console.log(res.data);
        }).error(function(res) {
            s.sendingRequest = false;
            s.addAlert(res);
        });

    };


    //fill _login with query string parameters
    var params={
        email:getParameterByName('email'),
        password: (getParameterByName('k'))?atob(getParameterByName('k')):''
    };
    if(params.email) r._login.email = params.email;
    if(params.password) r._login.password = params.password;
    if(params.email && params.password){
        console.log('adminLogin: lets try to sign-in from queryparameters');
        s.login();
    }

    var session = r.session();
    if (session.email && session.expire > new Date().getTime()) {
        r.session(r._login);
        console.log('adminLogin: session found at initial check');
        r.route('dashboard');
    } else {
        s.show = true;
    }
}]);

var app = angular.module('root', ['admin', 'service']).controller('root', ['server', '$timeout', '$scope', '$rootScope', function(db, $timeout, s, r) {
    //console.warn('ROOT');

    window.r = r;

    r.getHashParams = function() {
        var hashParams = {};
        var e,
            a = /\+/g, // Regex for replacing addition symbol with a space
            r = /([^&;=]+)=?([^&;]*)/g,
            d = function(s) {
                return decodeURIComponent(s.replace(a, " "));
            },
            q = window.location.hash.substring(1);

        while (e = r.exec(q))
            hashParams[d(e[1])] = d(e[2]);

        return hashParams;
    }
    r.route = function(h, cb) {
        var hash = r.getHashParams();
        if (typeof hash['/' + h] !== 'undefined') {
            cb();
        }
    };

    r.dom = function(cb) {
        $timeout(function() {
            cb && cb();
            s.$apply();
        });
    };







    r.toggleBody = function(val) {
        r.dom(function() {
            var el = document.body;
            el.className = el.className.replace('hidden', '').trim();
            if (!val) {
                el.className = (el.className + ' hidden').trim();
            }
        });
    };


    r.db = (function() {
        var lib = new localStorageDB("inspectors", localStorage);
        var db = {
            setUnique: function(tableName, data) {
                lib.insertOrUpdate(tableName, {
                    ID: 1
                }, data);
                lib.commit();
            },
            getUnique: function(tableName) {
                return lib.queryAll(tableName)[0];
            },
            getAll: function(tableName) {
                return lib.queryAll(tableName);
            }
        };
        // if (lib.tableExists('session')) lib.dropTable('session');//DROP SESSION
        db.createSession = function(force) {
            if (force && lib.tableExists('session')) lib.dropTable('session');
            lib.createTable('session', ['email', 'expire', 'pass', 'rememberPass']);
            db.setUnique('session', {
                email: null,
                expire: null,
                pass: null,
                rememberPass: true
            });
        };
        if (!lib.tableExists('session')) {
            db.createSession();
        }
        //console.warn('DB:SESSION:', db.getUnique('session'));
        return db;
    })();

    r.session = function(data) {
        if (data) {
            r.db.setUnique('session', data);
            //console.warn('SESSION:Updated');
        }
        return r.db.getUnique('session');
    };
    r.logged = function() {
        var ss = r.session();
        return ss.email != null && ss.pass !== null;
    };


    r._login = {
        email: '',
        pass: ''
    };
    var session = r.session();
    _.each(session, function(val, key) {
        r._login[key] = val;
    })
    if (session.pass) r._login.pass = session.pass; //atob(session.pass);
    if (!session.rememberPass) r._login.pass = null;



    r.logout=function(){
        r.session({email:null,pass:null});
        r.adminRoute('LOGIN');
    };


    r.route('admin', function() {
        r.admin = true;
    });


    r.adminRoutes = function(routes, defaultRoute) {
        r._adminRoute = defaultRoute; // || routes[0];
        r._adminRouteDefault = defaultRoute;
        r._adminRoutes = routes;
        r.adminRoute = function(nr) {
            if (nr) {
                // console.log('ROUTE:TO:'+nr);
                if (!_.includes(r._adminRoutes, nr)) {
                    throw Error(nr + ' is not a valid route. Valid routes:' + JSON.stringify(r._adminRoutes));
                }
                r._adminRoute = nr;
            }
            return r._adminRoute;
        };
        r.dom();
        //console.log(//ROUTE:'+r._adminRoute);
    };
    r.adminRoutes([
        'DASHBOARD', 'LOGIN', 'INSPECTORS'
    ], 'INSPECTORS');


}]);

var app = angular.module('app.common.root', []);


app.run(['server', '$timeout', '$rootScope', function(db, $timeout, r) {
    //console.info('app.common.root:run');
    window.r = r;
    r.getHashParams = getHashParams;


    r.__cache = {};
    r.cache = function(n, o) {
        if (o) {
            return r.__cache[n] = o;
        } else {
            if (!_.isUndefined(r.__cache[n]) && !_.isNull(r.__cache[n])) {
                //console.info('CACHE: retrieving ' + n + ' (' + typeof r.__cache[n] + ')');
            }
            return r.__cache[n] || null;
        }
    };

    r.dom = function(cb, timeout) {
        $timeout(function() {
            if (cb) {
                cb();
            }
            r.$apply();
        }, timeout || 0);
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
            lib.createTable('session', ['_id', 'email', 'expire', 'userType', 'password', 'rememberPass']);
            db.setUnique('session', {
                _id: null,
                email: null,
                expire: null,
                password: null,
                userType: null,
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
        return ss.email !== null && ss.password !== null;
    };


    r._login = {
        email: '',
        password: ''
    };
    var session = r.session();
    _.each(session, function(val, key) {
        r._login[key] = val;
    });
    if (session.password) r._login.password = session.password; //atob(session.password);
    if (!session.rememberPass) r._login.password = null;



    r.logout = function() {
        r.session({
            email: null,
            password: null
        });
        r.route('login');
    };


    r.route = function(url, delay) {
        //console.info('r.route:', delay, url);
        setTimeout(function() {
            var path = window.location.origin + window.location.pathname;
            path += '#/' + url;
            window.location.href = path;
        }, delay || 0);
    };

    r.userIs = (arr) => {
        var type = r.session().userType;
        return _.includes(arr, type);
    };


}]);

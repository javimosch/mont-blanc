/*global $U*/
/*global angular*/
/*global $*/
/*global getHashParams*/
/*global moment*/
/*global _*/
/*global localStorageDB*/
/*global localStorage*/
/*global $hasMouse*/
var app = angular.module('app.run', []);

app.run(['server', '$timeout', '$rootScope', function(db, $timeout, r) {
    //    console.info('app.admin:run');

    r.navShow = true;

    r.toggleNavbar = function(val) {
        r.navShow = val;
        r.dom();
    };
    r.secureSection = function(_s) {
        _s.show = false;
        if (!r.logged()) {
            console.warn('secureSection:redirecting to login');
            r.route('login');
        }
        else {
            _s.show = true;
        }
    };

    r.handleSecurityRouteViolation = () => {
        r.route('dashboard');
        console.warn('SECURITY: YOU-DONT-BELONG-HERE');
    };


    //go back (escape key)
    $('html').keydown(function(event) {
        if ('27' == event.keyCode) {
            if (r.params && r.params.prevRoute && r.__currentCtrlScope) {
                if (r.__currentCtrlScope.back) {
                    if (r.state.working()) {
                        r.message('Loading...', {
                            type: 'warning',
                            duration: 2000
                        });
                        return;
                    }
                    var fn = r.__currentCtrlScope.back;
                    r.__currentCtrlScope = null;
                    fn();
                }
                //return r.route(r.params.prevRoute);
            }
        };
    });

    r.setCurrentCtrl = (_s) => {
        r.__currentCtrlScope = _s
    };

    function getMessage(msg) {
        if (typeof msg === 'function') return msg();
        if (typeof msg !== 'string' && msg.length) return getMessage(msg[0]);
        return msg;
    }

    r.errorMessage = (msg, duration) => {
        msg = getMessage(msg);
        r.notify(msg, {
            type: 'danger',
            duration: duration || 3000
        });
    };
    r.warningMessage = (msg, duration) => {
        msg = getMessage(msg);
        r.notify(msg, {
            type: 'warning',
            duration: duration || 3000
        });
    };
    r.infoMessage = (msg, duration) => {
        msg = getMessage(msg);
        r.notify(msg, {
            type: 'info',
            duration: duration || 3000
        });
    };

}]);



app.run(['server', '$timeout', '$rootScope', function(db, $timeout, r) {
    //console.info('app.common.root:run');
    window.r = r;
    r.getHashParams = getHashParams;

    r.debug = true;

    r.config = {};
    db.localData().then((data) => Object.assign(r.config, data.config || {}));


    r.__cache = {};
    r.cache = function(n, o) {
        if (o) {
            return r.__cache[n] = o;
        }
        else {
            if (!_.isUndefined(r.__cache[n]) && !_.isNull(r.__cache[n])) {
                //console.info('CACHE: retrieving ' + n + ' (' + typeof r.__cache[n] + ')');
            }
            return r.__cache[n] || null;
        }
    };

    r.momentFormat = (d, f) => (moment(d).format(f));
    r.momentTime = (d) => moment(d).format('HH[h]mm');
    r.momentDateTime = (d) => moment(d).format('DD-MM-YY HH[h]mm');

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
            lib.createTable('session', ['_id', 'email', 'expire', 'userType', 'password', 'rememberPass', 'clientType']);
            db.setUnique('session', {
                _id: null,
                email: null,
                expire: null,
                password: null,
                userType: null,
                clientType: null,
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
            r._session = data;
        }
        return Object.assign(r.db.getUnique('session'), r._session || {});
    };
    r.logged = function() {
        var ss = r.session();
        return ss.email !== null && ss.password !== null;
    };


    r.viewAsClient = () => {
        r._session = r._session || {};
        r._session.userType = 'client';
        r.dom();
    };
    r.viewAsDiag = () => {
        r._session = r._session || {};
        r._session.userType = 'diag';
        r.dom();
    };
    r.viewAsAdmin = () => {
        r._session = r._session || {};
        r._session.userType = 'admin';
        r.dom();
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
            r.$emit('route-change', url);
            $U.url.hash(url);
            window.location.href = window.location.href;
        }, delay || 0);
        r.__route = url;
        return url;
    };
    r.routeIs = (n) => r.__route && r.__route.toString().toLowerCase().indexOf(n && n.toLowerCase() || 'invalid') !== -1 || false;
    r.__route = window.location.href.replace(window.location.origin + window.location.pathname, '');
    setTimeout(function() {
        $U.emitPreserve('route-change', r.__route.slice(2));
    }, 500);
    $U.onAnchorChange(() => {
        r.__route = window.location.href.replace(window.location.origin + window.location.pathname, '');
        $U.emitPreserve('route-change', r.__route.slice(2))
    });

    r.userIs = (arr) => {
        var type = r.session().userType;
        if (typeof arr === 'string') arr = [arr];
        return _.includes(arr, type);
    };

    r.routeParams = (obj) => {
        r.params = Object.assign(r.params || {}, obj);
    };


    r.lookUp = function(scope, property) {
        if (scope[property]) return scope[property];
        else {
            if (scope.$parent) {
                return r.lookUp(scope.$parent, property);
            }
            else {
                return undefined;
            }
        }
    };


    r.hasMouse = false;
    $hasMouse((v) => {
        r.hasMouse = v;
        r.dom();
    });


}]);

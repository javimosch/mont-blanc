/*global $U*/
/*global angular*/
/*global $*/

/*global moment*/
/*global _*/
/*global localStorageDB*/
/*global localStorage*/
/*global $hasMouse*/

var app = angular.module('app.run', []);

var __SHARE_FUNCTIONS = {
    isDevEnv: () => {
        return window.location.hostname.indexOf('c9users.io') !== -1 || window.location.hostname.indexOf('localhost') !== -1 || window.location.hostname.indexOf('herokuapp') !== -1 || window.location.hostname.indexOf('62.210.97.81') !== -1
    }
};

app.config(function($logProvider) {
    var enabled = __SHARE_FUNCTIONS.isDevEnv();
    console.info('$log is ', (enabled ? 'enabled' : 'disabled'));
    $logProvider.debugEnabled(enabled);
});

app.config(['$httpProvider', function($httpProvider) {
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
}]);

app.run(['$rootScope', '$uibModalStack', '$log', setupUibModal]);

app.run(function($rootScope) {
    setTimeout(() => {
        if ($rootScope.openConfirm) {
            window._openConfirm = $rootScope.openConfirm;
        }
    }, 2000);
});

function setupUibModal($rootScope, $uibModalStack, $log) {
    $rootScope.$on('routeChangeStart', handleLocationChange)

    function handleLocationChange() {
        $log.log('modal dismiss all');
        $uibModalStack.dismissAll();
    }
}

app.run(['server', '$timeout', '$rootScope', function(db, $timeout, r) {
    //    console.info('app.admin:run');
    //TOGGLES A FLAG WRITING DEBUG ANYWHERE IN THE SITE.
    r.__debugDiags = false;
    var keyword = '';
    $(window).on('keyup', function(ev) {
        ev = ev || window.event;
        var key = String.fromCharCode(ev.which);
        if (ev.which == 13) {
            if (keyword.toLowerCase() == 'debug') {
                r.__debugDiags = true;
                console.info('debug-mode-on');
            }
            else {
                r.__debugDiags = false;
                //console.info('debug-mode-off, try again');
            }
            keyword = '';
            r.dom();
        }
        else {
            keyword = keyword + key;
        }
    });
}]);

app.run(['server', '$timeout', '$rootScope', 'appRouter', function(db, $timeout, r, appRouter) {
    //    console.info('app.admin:run');

    r.isDevEnv = __SHARE_FUNCTIONS.isDevEnv;

    r.URL = {
        LOGIN: 'login',
        DIAG_SIGN_UP: 'diag-inscription',
        LEGAL_MENTIONS: 'mentions-legales',
        HOME: '/',
        CONTACT_US: 'contactez-nous',
        ERNT: 'ernmt',
        FAQ: 'faq',
        GENERAL_CONDITIONS: 'conditions-generales-utilisation',
        CGU_LEMONWAY: 'cgu-lemonway',
        LEGAL_MENTIONS: 'mentions-legales',
        DIAGS: 'choix-diagnostics',
        RDV: 'rendez-vous',
        LOGIN: 'connexion',
        ESPACE_ENTERPRISE: 'espace-client',
        ESPACE_DIAG: 'espace-diagnostiqueur',
        ACCOUNT_DETAILS: 'account-details',
        ACCOUNT_DETAILS_BOOKING: 'inscription-details',
        PAYMENT: 'payment',
    };


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
            //async update of the current user.
            db.ctrl('User', 'getProfileData', r.session()).then(function(d) {
                if (d.ok && d.result) r.session(d.result);
            });
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
        $U.expose('s', _s);
    };


    function getMessage(msg) {
        if (!msg) return '';
        if (typeof msg === 'function') return msg();
        if (typeof msg !== 'string' && msg.length) return getMessage(msg[0]);
        return msg;
    }

    r.errorMessage = (msg, duration) => {
        msg = getMessage(msg);
        if (!msg) {
            msg = 'Erreur de serveur, plus d&#x27;informations dans la console de développement.';
        }
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
    r.successMessage = (msg, duration) => {
        msg = getMessage(msg);
        r.notify(msg, {
            type: 'success',
            duration: duration || 3000
        });
    };

}]);

/*google analytic tracking */
app.run(['$rootScope', '$location', '$window', '$log',
    function($rootScope, $location, $window, $log) {
        $rootScope.$on('$routeChangeSuccess',
            function(event) {
                if (!$window.ga) {
                    return;
                }
                //$log.debug('ga tracking to ' + $location.path());
                $window.ga('set', 'page', $location.path());
                $window.ga('send', 'pageview');
            });
    }
]);

app.run(['server', '$timeout', '$rootScope', 'appRouter', 'appSettings', function(db, $timeout, r, appRouter, appSettings) {
    //console.info('app.common.root:run');
    $U.exposeGlobal('r', r);
    r.getHashParams = $U.getHashParams;

    r.debug = true;

    

    r.config = {};
    var env = {
        APP_NAME: "Diagnostical",
        COMPANY_NAME: "SAS Immocal",
        BACKEND_URL: "https://diags-javoche.c9users.io:8081",
        STORE_SESSION_PREFIX: '_SESSION'
    };

    appSettings.syncAll();


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
    r.momentFrenchDateTime = (d) => moment(d).format('DD/MM/YYYY [à] HH[h]mm');
    r.momentDateTime = (d) => r.momentFrenchDateTime(d); // moment(d).format('DD-MM-YY HH[h]mm');
    r.momentDateTimeWords = (d, article) => moment(d).format('[' + (article || 'Le') + '] dddd DD MMMM YY [à] HH[h]mm');
    r.momentDateTimeWords2 = (d) => moment(d).format('dddd DD MMMM YY [à] HH[h]mm');

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

    setTimeout(function() {
        r.$apply(function() {
            $('.remove-hidden').removeClass('hidden').removeClass('remove-hidden');
        });
    }, 300);



    r.session = function(data) {
        var id = env.APP_NAME + '_' + window.location.hostname + env.STORE_SESSION_PREFIX;
        if (data) {
            $U.store.set(id, data);
            r._session = data;
        }
        r._session = $U.store.get(id) || {};
        if (!r._session) {
            $U.store.set(id, {});
            r._session = {};
        }
        return r._session;
    };
    r.sessionMetadata = function(data, reset) {
        var id = env.APP_NAME + '_' + window.location.hostname + env.STORE_SESSION_PREFIX + "_METADATA";
        reset = (reset != undefined) ? reset : false;
        if (data) {
            if (reset) {
                $U.store.set(id, data);
                return data || {};
            }
            else {
                var combinedData = $U.store.get(id) || {};
                Object.assign(combinedData, data);
                $U.store.set(id, combinedData);
                return combinedData || {};
            }
        }
        else {
            return $U.store.get(id) || {};
        }
    };
    //

    /*Metadata is only persistent in booking pages except first page*/
    //if (appRouter.currentPath == '') {
    //r.sessionMetadata({
    //booking: {}
    //});
    //}


    r.logged = function() {
        var ss = r.session();
        return (ss._id && ss.email && ss.password != undefined) || false;
    };


    r.__viewAs = (t) => {
        r.session({
            userType: t
        });
        r.dom();
    }
    r.viewAsClient = () => {
        return r.__viewAs('client');
    };
    r.viewAsDiag = () => {
        return r.__viewAs('diag');
    };
    r.viewAsAdmin = () => {
        return r.__viewAs('admin');
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
        $U.url.clear();
        r.route('login');
    };

    r.admin = function() {
        r._login.email = 'arancibiajav@gmail.com';
        r._login.password = 'admin';
        r.dom();
    };

    r.routeRelative = function(url, delay) {
        setTimeout(function() {
            var path = window.location.origin;
            path += (window.location.pathname + '/' + url).replaceAll('//', '/');
            $U.emit('route-exit:' + $U.url.hashName());
            window.location.href = path;
        }, delay || 0);
        r.__route = url;
        return url;
    }



    r.routeExternal = function(url) {
        window.location.href = url;
    };
    r.route = function(url, delay) {

        setTimeout(function() {

            //ex www.domain.com/admin -> admin
            var routePart = window.location.href.substring(window.location.origin.length + 1);
            $U.emit('route-exit:' + routePart);
            r.$emit('route-change', url);

            if (url.toString().charAt(0) !== '/') {
                url = '/' + url;
            }

            return appRouter.to(url);
        }, delay || 0);
        r.__route = url;
        return url;
    };



    r.routeIs = (n) => {
        return appRouter.currentPath == n;
    };

    setTimeout(function() {
        $U.emitPreserve('route-change', window.location.href.substring(window.location.origin.length + 1));
    }, 500);

    r.userIs = (arr) => {
        if (!r.logged()) return false;
        var type = r.session().userType;
        if (typeof arr === 'string') arr = [arr];
        return _.includes(arr, type);
    };

    r.routeParams = (obj) => {
        if (obj) {
            r.params = Object.assign(r.params || {}, obj);
            r.sessionMetadata({
                params: r.params
            });
        }
        return r.params;
    };
    r.routeParams(r.sessionMetadata().params || {});


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


    r.hasMouse = true;

    if (window.screen.width < 1200) {
        r.hasMouse = false;
    }

    /*
    $hasMouse((v) => {
        r.hasMouse = v;
        r.dom();
    });
    */


}]);


app.run(['server', '$timeout', '$rootScope', 'backendApi', 'appRouter', function(db, $timeout, r, backendApi, appRouter) {

    //update current user data

    if (r.session()._id) {
        backendApi.User.getById(r.session()).then(function(res) {
            if (res.ok && res.result) {
                r.session(res.result);
                //console.log('DEBUG: Session updated');
                if (r.session().userType == 'client' && !r.isDevEnv()) {
                    $U.emit('intercom');
                }
            }
            else {
                //console.log('DEBUG: Session update fail');
            }
        });
    }
    else {
        if (appRouter.currentPath == '' && !r.isDevEnv()) {
            $U.emit('intercom');
        }
    }

}]);

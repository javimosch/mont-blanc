/*global angular*/
/*global expose*/
/*global moment*/
(function() {
    var app = angular.module('app', [
        'app.run',

        'focusOn',

        'credit-cards',
        'pretty-checkable',

        'ngRoute',
        'ngSanitize',


        'mwl-calendar-config',
        'mwl.calendar',

        'ui.bootstrap',
        'ui.bootstrap.datetimepicker',

        'betterSelect',

        'remote-config-constant',

        'srv.crud',
        'srv.diagPrice',
        'app-settings-service',
        'local-data',

        'header-controller',

        'settings-feature-module',
        'login-feature-module',
        'order-feature-module',
        'diag-account-feature-module',
        'tools-feature-module',
        'user-feature-module',
        'notifications-feature-module',

        'app.admin',
        'app.routes',
        'app.client',
        'app.calendar',
        'app.services',
        'app-router'
    ]);


    app.config(['$httpProvider', 'endpointConfig', function($httpProvider, endpointConfig) {
        $httpProvider.defaults.headers.post['csrf-token'] = endpointConfig.CSRF;
    }]);

    app.config(function() {
        window.localforage.config({
            //driver: localforage.WEBSQL, // Force WebSQL; same as using setDriver()
            name: 'diagnostical',
            //version: 1.0,
            //size: 4980736, // Size of database, in bytes. WebSQL-only for now.
            //storeName: 'keyvaluepairs', // Should be alphanumeric, with underscores.
            //description: 'some description'
        });
    });
    app.run(function(uibPaginationConfig) {
        uibPaginationConfig.firstText = 'Premier';
        uibPaginationConfig.nextText = 'Suivant';
        uibPaginationConfig.previousText = 'Précédent';
        uibPaginationConfig.lastText = 'Dernier';
    });
    moment.locale('fr');
    angular.element(function() {

        $.get('/CXNlcg').then((res) => {

            app.constant('endpointConfig', {
                "URL": '/',
                "PREFIX": "api/",
                "CSRF": res.result
            });


            angular.bootstrap(document, ['app']);
            if (window.__bootTimerStart) {
                window.__bootTimerMilli = Date.now() - window.__bootTimerStart;
                window.__bootTimerSeconds = window.__bootTimerMilli / 1000;
                console.log('Load-time until angular bootstraping', window.__bootTimerSeconds, 'Seconds');
            }

        });


    });
})();

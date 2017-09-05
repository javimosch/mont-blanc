/*global moment angular $ $U expose*/
(function() {

    var CSRF = $U.url.get('CSRF');

    var app = angular.module('app', [
        'ui.bootstrap',
        'app.run',
        'focusOn',
        'credit-cards',
        'pretty-checkable',
        'ngSanitize',
        'srv.crud',
        'srv.diagPrice',
        'app-settings-service',
        'remote-config-constant',
        'local-data',
        'app.services',
        'app-router'
    ]).service('$routeParams', [function() {
        return {};
    }]);
    app.config(['$httpProvider', 'endpointConfig', function($httpProvider, endpointConfig) {
        $httpProvider.defaults.headers.post['csrf-token'] = endpointConfig.CSRF;
    }]);
    moment.locale('fr');
    angular.element(function() {

        // $.get('/CXNlcg').then((res) => {




        app.constant('endpointConfig', {
            "URL": '/',
            "PREFIX": "api/",
            "CSRF": CSRF
        });

        angular.bootstrap(document, ['app']);
        if (window.__bootTimerStart) {
            window.__bootTimerMilli = Date.now() - window.__bootTimerStart;
            window.__bootTimerSeconds = window.__bootTimerMilli / 1000;
            console.log('Load-time until angular bootstraping', window.__bootTimerSeconds, 'Seconds');
        }

        //});
    });
})();

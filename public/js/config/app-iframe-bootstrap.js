/*global angular*/
/*global expose*/
/*global moment*/
(function() {
    var app = angular.module('app', [
        'ui.bootstrap',
        'app.run',
        'credit-cards',
        'pretty-checkable',
        'ngSanitize',
        'srv.crud',
        'srv.diagPrice',
        'srv.diagSlots',
        'app-settings-service',
        'local-data',
        'app.directives',
        'app.services',
        'app-router'
    ]).service('$routeParams', [function() {
        return {};
    }]);
    moment.locale('fr')
    angular.element(function() {

        console.log('BOOTSTRAPING!');

        angular.bootstrap(document, ['app']);
        if (window.__bootTimerStart) {
            window.__bootTimerMilli = Date.now() - window.__bootTimerStart;
            window.__bootTimerSeconds = window.__bootTimerMilli / 1000;
            console.log('Load-time until angular bootstraping', window.__bootTimerSeconds, 'Seconds');
        }
    });
})();

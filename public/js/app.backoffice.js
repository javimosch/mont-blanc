/*global angular*/
(function() {
    angular.module('app', [
        'app.run',

        'ngRoute',

        'app.run-calendar',
        'mwl.calendar',
        'ui.bootstrap',
        'ui.bootstrap.datetimepicker',

        'srv.crud',

        'app.admin',
        'app.routes',
        'app.login',
        'app.user',
        'app.diag',
        'app.log',
        'app.diag.complete',
        'app.diag.balance',
        'app.order',
        'app.client',
        'app.diag',
        'app.calendar',
        'app.notifications',
        'app.client.payments',
        'app.directives',
        'app.services',
        'app.tools'
    ]);
})();

/*global angular*/
var srv = angular.module('app.routes', []);
srv.config(['$routeProvider',
    function($routeProvider,$rootScope) {
        
       
        $routeProvider.
        
        //SHARED
        when('/mentions-legales', {
            templateUrl: 'views/legal-mentions.html'
        }).
        when('/conditions-generales-utilisation', {
            templateUrl: 'views/general-conditions.html'
        }).
        when('/ernt', {
            templateUrl: 'views/ernt.html'
        }).
        when('/faq', {
            templateUrl: 'views/faq.html'
        }).
        when('/contactez-nous', {
            templateUrl: 'views/contact-us.html'
        }).
        
        //PUBLIC
        when('/login', {
            templateUrl: 'views/public/login.html'
        }).
        when('/diag-inscription', {
            templateUrl: 'views/public/diag-inscription.html'
        }).
        
        //PRIVATE
        when('/', {
            templateUrl: 'views/dashboard.html'
        }).
        when('/dashboard', {
            templateUrl: 'views/dashboard.html'
        }).
        when('/global-calendar', {
            templateUrl: 'views/global-calendar.html'
        }).

        when('/settings', {
            templateUrl: 'views/settings.html'
        }).

        when('/notifications', {
            templateUrl: 'views/notifications.html'
        }).

        when('/logs', {
            templateUrl: 'views/logs.html'
        }).
        when('/logs/edit/:id', {
            templateUrl: 'views/logs.edit.html'
        }).

        when('/administrators', {
            templateUrl: 'views/admins.html'
        }).
        when('/administrators/edit/:id', {
            templateUrl: 'views/admin.edit.html'
        }).

        when('/exceptions', {
            templateUrl: 'views/exception.list.html'
        }).
        when('/exceptions/edit/:id', {
            templateUrl: 'views/exception.edit.html'
        }).

        when('/clients', {
            templateUrl: 'views/clients.html'
        }).
        when('/clients/edit/:id', {
            templateUrl: 'views/client.edit.html'
        }).

        when('/tools', {
            templateUrl: 'views/tools.html'
        }).
        when('/tools/termites-check', {
            templateUrl: 'views/tools.termites-check.html'
        }).

        when('/diag/balance', {
            templateUrl: 'views/diag-balance.html'
        }).
        when('/diags', {
            templateUrl: 'views/diags.html'
        }).
        when('/diags/edit/:id', {
            templateUrl: 'views/diag.edit.html'
        }).
        when('/orders', {
            templateUrl: 'views/orders.html'
        }).
        when('/orders/edit/:id', {
            templateUrl: 'views/order.edit.html'
        }).
        when('/orders/view/:id', {
            templateUrl: 'views/order.view.html'
        }).
        otherwise({
            redirectTo: '/'
        });
        //console.info('app.admin.routes:config');
    }
]);

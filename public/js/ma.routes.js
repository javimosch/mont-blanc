var srv = angular.module('app.routes', []);
app.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
        when('/', {
            templateUrl: 'views/ma-login.html'
        }).
        when('/dashboard', {
            templateUrl: 'views/ma-dashboard.html'
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

        when('/types', {
            templateUrl: 'views/ma-type-list.html'
        }).
        when('/types/edit/:id', {
            templateUrl: 'views/ma-type-edit.html'
        }).

        when('/users', {
            templateUrl: 'views/ma-user-list.html'
        }).
        when('/users/edit/:id', {
            templateUrl: 'views/ma-user-edit.html'
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

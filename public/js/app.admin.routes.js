var srv = angular.module('app.admin.routes', []);
app.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
        when('/', {
            templateUrl: 'views/view.admin.login.html'
        }).
        when('/dashboard', {
            templateUrl: 'views/view.admin.dashboard.html'
        }).
        when('/global-calendar', {
            templateUrl: 'views/view.admin.calendar.html'
        }).

        when('/notifications', {
            templateUrl: 'views/view.notifications.html'
        }).

        when('/administrators', {
            templateUrl: 'views/view.admin-list.html'
        }).
        when('/administrators/edit/:id', {
            templateUrl: 'views/view.admin-edit.html'
        }).

        when('/exceptions', {
            templateUrl: 'views/exception.list.html'
        }).
        when('/exceptions/edit/:id', {
            templateUrl: 'views/exception.edit.html'
        }).

        when('/clients', {
            templateUrl: 'views/view.admin.clients.html'
        }).
        when('/clients/edit/:id', {
            templateUrl: 'views/view.admin.clients.edit.html'
        }).

        when('/tools', {
            templateUrl: 'views/tools.html'
        }).
        when('/tools/termites-check', {
            templateUrl: 'views/tools.termites-check.html'
        }).

        /*
        when('/users', {
            templateUrl: 'views/view.admin.users.html'
        }).
        when('/users/edit/:id', {
            templateUrl: 'views/view.admin.users.edit.html'
        }).
        */
        
        when('/diag/balance', {
            templateUrl: 'views/view.admin.diag.balance.html'
        }).
        when('/diags', {
            templateUrl: 'views/view.admin.diags.html'
        }).
        when('/diags/edit/:id', {
            templateUrl: 'views/view.admin.diags.edit.html'
        }).
        when('/orders', {
            templateUrl: 'views/view.admin.orders.html'
        }).
        when('/orders/edit/:id', {
            templateUrl: 'views/order.edit.html'
        }).
        when('/orders/view/:id', {
            templateUrl: 'views/view.admin.orders.view.html'
        }).
        otherwise({
            redirectTo: '/'
        });
        //console.info('app.admin.routes:config');
    }
]);

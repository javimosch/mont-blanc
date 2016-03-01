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
        when('/clients', {
            templateUrl: 'views/view.admin.clients.html'
        }).
        when('/clients/edit/:id', {
            templateUrl: 'views/view.admin.clients.edit.html'
        }).
        when('/users', {
            templateUrl: 'views/view.admin.users.html'
        }).
        when('/users/edit/:id', {
            templateUrl: 'views/view.admin.users.edit.html'
        }).
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
            templateUrl: 'views/view.admin.orders.edit.html'
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

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
        when('/diags', {
            templateUrl: 'views/view.admin.diags.html'
        }).
        when('/diags/edit/:id', {
            templateUrl: 'views/view.admin.diags.edit.html'
        }).
        otherwise({
            redirectTo: '/'
        });
        console.info('app.admin.routes:config');
    }
]);

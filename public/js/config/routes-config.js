/*global angular*/
var srv = angular.module('app.routes', []);
srv.config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {


        $routeProvider.

        /*BOOKING*/
        when('/', {
            templateUrl: 'views/diags/booking/booking-1-home.html'
        }).
        when('/home', {
            templateUrl: '/views/diags/booking/booking-1-home.html'
        }).


        when('/choix-diagnostics', {
            templateUrl: 'views/diags/booking/booking-2-diags-selection.html'
        }).
        when('/rendez-vous', {
            templateUrl: 'views/diags/booking/booking-3-date-selection.html'
        }).
        when('/connexion', {
            templateUrl: 'views/diags/booking/booking-4-connection.html'
        }).
        when('/new-inscription', {
            templateUrl: 'views/diags/booking/client-space.html'
        }).

        when('/espace-client', {
            templateUrl: 'views/diags/booking/client-space.html'
        }).

        when('/espace-diagnostiqueur', {
            templateUrl: 'views/diags/booking/booking-espace-diagnostiqueur.html'
        }).

        when('/client-account-choice', {
            templateUrl: 'views/client-account-choice.html'
        }).
        when('/account-details', {
            templateUrl: 'views/diags/booking/booking-inscription-details.html'
        }).
        when('/inscription-details', {
            templateUrl: 'views/diags/booking/booking-5-inscription.html'
        }).
        when('/payment', {
            templateUrl: 'views/diags/booking/booking-6-payment.html'
        }).
        when('/order-confirm', {
            templateUrl: 'views/diags/booking/order-confirmation-screen.html'
        }).


        //SHARED
        when('/mentions-legales', {
            templateUrl: 'views/diags/legal-mentions.html'
        }).

        when('/cgu-lemonway', {
            templateUrl: 'views/diags/cgu-lemonway.html'
        }).
        when('/conditions-generales-utilisation', {
            templateUrl: 'views/diags/general-conditions.html'
        }).
        when('/ernmt', {
            templateUrl: 'views/diags/ernmt.html'
        }).
        when('/faq', {
            templateUrl: 'views/diags/faq.html'
        }).
        when('/contactez-nous', {
            templateUrl: 'views/diags/contact-us.html'
        }).

        //PUBLIC
        when('/login', {
            templateUrl: 'views/diags/login.html'
        }).
        when('/diag-inscription', {
            templateUrl: 'views/diags/diag-inscription.html'
        }).

        //PRIVATE
        /*
        when('/', {
            templateUrl: 'views/diags/backoffice/dashboard.html'
        }).*/
        when('/dashboard', {
            templateUrl: 'views/diags/backoffice/dashboard.html'
        }).
        when('/global-calendar', {
            templateUrl: 'views/diags/backoffice/global-calendar.html'
        }).

        when('/settings', {
            templateUrl: 'views/diags/backoffice/settings/diags-settings.html'
        }).

        when('/settings-invoice', {
            templateUrl: 'views/diags/backoffice/settings/diags-settings-invoice.html'
        }).

        when('/settings-password-reset', {
            templateUrl: 'views/settings-password-reset.html'
        }).

        when('/settings-htmls/:id', {
            templateUrl: 'views/settings-htmls.html'
        }).
        when('/settings-pages/:id', {
            templateUrl: 'views/settings-pages.html'
        }).
        when('/database-files/:id', {
            templateUrl: 'views/database-files.html'
        }).


        when('/settings-database', {
            templateUrl: 'views/diags/backoffice/settings/diags-settings-database.html'
        }).

        when('/settings-database-text', {
            templateUrl: 'views/diags/backoffice/settings/diags-settings-database-text.html'
        }).

        when('/settings-exportation', {
            templateUrl: 'views/diags/backoffice/settings/diags-settings-exportation.html'
        }).

        when('/settings-exportation-orders', {
            templateUrl: 'views/diags/backoffice/settings/diags-settings-exportation-orders.html'
        }).

        when('/settings-exportation-texts', {
            templateUrl: 'views/diags/backoffice/settings/diags-settings-exportation-texts.html'
        }).




        when('/notifications', {
            templateUrl: 'views/diags/backoffice/notification/notification-list.html'
        }).
        when('/notifications/edit/:id', {
            templateUrl: 'views/diags/backoffice/notification/notification-edit.html'
        }).

        when('/logs', {
            templateUrl: 'views/diags/backoffice/log/log-list.html'
        }).
        when('/logs/edit/:id', {
            templateUrl: 'views/diags/backoffice/log/log-edit.html'
        }).

        when('/administrators', {
            templateUrl: 'views/diags/backoffice/admin/admins.html'
        }).
        when('/administrators/edit/:id', {
            templateUrl: 'views/diags/backoffice/admin/admin.edit.html'
        }).

        when('/exceptions', {
            templateUrl: 'views/diags/backoffice/exception/exception.list.html'
        }).
        when('/exceptions/edit/:id', {
            templateUrl: 'views/diags/backoffice/exception/exception.edit.html'
        }).

        when('/texts', {
            templateUrl: 'views/diags/backoffice/text/text-list.html'
        }).
        when('/texts/edit/:id', {
            templateUrl: 'views/diags/backoffice/text/text-edit.html'
        }).

        when('/clients', {
            templateUrl: 'views/diags/backoffice/client/clients.html'
        }).
        when('/clients/edit/:id', {
            templateUrl: 'views/diags/backoffice/client/client.edit.html'
        }).



        when('/price-modifiers', {
            templateUrl: 'views/diags/backoffice/price-modifiers.html'
        }).



        when('/documentation', {
            templateUrl: 'views/diags/backoffice/diags-docs.html'
        }).



        when('/tools', {
            templateUrl: 'views/diags/backoffice/tools.html'
        }).
        when('/tools/termites-check', {
            templateUrl: 'views/diags/backoffice/tools.termites-check.html'
        }).
        when('/tools/datetime-picker-testing', {
            templateUrl: 'views/diags/backoffice/tools/tools.datetimepicker-test.html'
        }).


        when('/diag/balance', {
            templateUrl: 'views/diags/backoffice/diag/diag-balance.html'
        }).
        when('/diags', {
            templateUrl: 'views/diags/backoffice/diag/diags.html'
        }).
        when('/diags/edit/:id', {
            templateUrl: 'views/diags/backoffice/diag/diag.edit.html'
        }).
        when('/orders', {
            templateUrl: 'views/diags/backoffice/order/orders.html'
        }).
        when('/orders/edit/:id', {
            templateUrl: 'views/diags/backoffice/order/order.edit.html'
        }).
        when('/orders/view/:id', {
            templateUrl: 'views/diags/backoffice/order/order.view.html'
        });

        //
        if (window.__pages) {
            window.__pages.forEach((page) => {

                var html = '';

                if (page.template) {
                    html = window.decodeURIComponent(page.template).replace('__HTML__', window.decodeURIComponent(page.content));
                    // console.log('DEBUG ', page.url, html.length, page.template.length);
                }
                else {
                    html = window.decodeURIComponent(page.content);
                    //console.log('DEBUG ', page.url, html.length);
                }

                $routeProvider.when(page.url, {
                    template: html
                });



                //console.log('DEBUG ROUTE-ADDED', page.url, window.decodeURIComponent(page.content).length + ' chars');
            });
            //delete window.__pages;
        }




        $routeProvider.otherwise({
            redirectTo: '/'
        });
        $locationProvider.html5Mode(true);
        //console.log('DEBUG routes OK');

    }
]);

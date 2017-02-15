/*global angular*/
/*global $U*/
angular.module('header-controller', []).controller('header-controller', ['$scope', 'appRouter', '$log', '$rootScope', function(s, appRouter, $log, r) {

    const BOOKING_ROUTES = [
        '',
        'payment',
        'inscription-details',
        'account-details',
        'espace-diagnostiqueur',
        'space-enterprise',
        'connexion',
        'rendez-vous',
        'choix-diagnostics',
        'mentions-legales',
        'cgu-lemonway',
        'conditions-generales-utilisation',
        'faq',
        'ernmt',
        'contactez-nous'
    ];

    if (window.__pages) {
        window.__pages.forEach(page => {
            var url = page.url;
            if (url.toString().charAt(0) == '/');
            url = url.slice(1);
            BOOKING_ROUTES.push(url);
        });
    }

    s.isBooking = () => {
        var arr = BOOKING_ROUTES.filter(v => v == appRouter.currentPath);
        return arr && arr.length > 0;
    };

    function onRouteChange(pathFrom, pathTo) {
        if (!pathTo || pathTo == 'home') {
            s.__header = 1;
        }
        else {
            s.__header = 2;
        }
        return true;
    }

    appRouter.onChange(function(pathFrom, pathTo) {
        return onRouteChange(pathFrom, pathTo);
    });
    onRouteChange(appRouter.currentPath, appRouter.currentPath);


    window.ctrls = window.ctrls || {};
    window.ctrls.header = s;
}]);

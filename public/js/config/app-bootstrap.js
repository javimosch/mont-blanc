/*global angular*/
/*global expose*/
/*global moment*/
(function() {
    var app = angular.module('app', [
        'app.run',
        
        'focusOn',

        'credit-cards',
        'pretty-checkable',

        'ngRoute',
        'ngSanitize',

        
        'mwl-calendar-config',
        'mwl.calendar',
        
        'ui.bootstrap',
        'ui.bootstrap.datetimepicker',

        'srv.crud',
        'srv.diagPrice',
        'app-settings-service',
        'local-data',

        'header-controller',
        
        'settings-feature-module',
        'login-feature-module',
        'order-feature-module',
        'diag-account-feature-module',
        'tools-feature-module',
        'user-feature-module',
        'notifications-feature-module',

        'app.admin',
        'app.routes',
        'app.client',
        'app.calendar',
        'app.client.payments',
        'app.services',
        'app-router'
    ]);

    app.run(function(uibPaginationConfig) {
        uibPaginationConfig.firstText = 'Premier';
        uibPaginationConfig.nextText = 'Suivant';
        uibPaginationConfig.previousText = 'Précédent';
        uibPaginationConfig.lastText = 'Dernier';
    });
    
    

    //diags
    moment.locale('fr');


    $.post('/ctrl/pages/getAll', {
        __select: "content template url"
    }, function(res) {
        //console.log('DEBUG PAGES-FETCH', res);
        if (res && res.ok && res.result) {
            window.__pages = res.result;
        }
        else {
            //console.log('WARN dynamic-routes could not be loaded.', res);
        }
        angular.element(function() {
            angular.bootstrap(document, ['app']);
            //console.log('DEBUG BOOTSTRAPING...');
            if (window.__bootTimerStart) {
                window.__bootTimerMilli = Date.now() - window.__bootTimerStart;
                window.__bootTimerSeconds = window.__bootTimerMilli / 1000;
                console.log('Load-time until angular bootstraping', window.__bootTimerSeconds, 'Seconds');
            }
        });
    }, 'json');

    expose('app', app);
})();

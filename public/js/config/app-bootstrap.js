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

        'app.run-calendar',
        'mwl.calendar',
        'ui.bootstrap',
        'ui.bootstrap.datetimepicker',

        'srv.crud',
        'srv.diagPrice',
        'app-settings-service',
        'local-data',

        "diags_ctrl_settings",
        'diags_ctrl_contact_form',
        'diags_ctrl_tools',
        'header-controller',

        'app.admin',
        'app.routes',
        'login-feature-module',
        'app.user',
        'app.order',
        'app.client',
        'diag-account-feature-module',
        'app.calendar',
        'app.notifications',
        'app.client.payments',
        'app.directives',
        'app.services',
        'app.tools',
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

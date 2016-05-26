/*global angular*/
/*global expose*/
/*global moment*/
(function() {
    var app = angular.module('app', [
        'app.run',

        'ngRoute',

        'app.run-calendar',
        'mwl.calendar',
        'ui.bootstrap',
        'ui.bootstrap.datetimepicker',

        'srv.crud',
        'srv.diagPrice',
        'srv.diagSlots',

        "diags_ctrl_settings",
        'diags_ctrl_contact_form',
        'diags_ctrl_tools',

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

    app.run(function(uibPaginationConfig) {
        uibPaginationConfig.firstText = 'Premier';
        uibPaginationConfig.nextText = 'Suivant';
        uibPaginationConfig.previousText = 'Précédent';
        uibPaginationConfig.lastText = 'Dernier';
    });

    //diags
    moment.locale('fr')

    expose('app', app);
})();

(function() {
    var app = angular.module('app.log', []);
    app.controller('logEdit', ['$rootScope', '$scope', 'server', 'crud', '$routeParams', function(r, s, db, crud, params) {
        crud.create({
            name: 'Log',
            routeParams: params,
            scope: s,
            routes: {
                back: 'logs'
            },
            modals: {
                confirm: 'confirm',
                delete: {
                    description: () => 'Delete item ' + s.item.type + ' ' + r.momentDateTime(s.item.created)
                }
            },
            validate: {
                options: (s) => {
                    return [
                        [s.item.message, '==', false, 'Message required']
                    ];
                }
            }
        }).init();
    }]);
    app.directive('logList', function(
        $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server) {
        return {
            restrict: 'AE',
            replace: true,
            scope: {},
            templateUrl: 'views/directives/directive.fast-crud.html',
            link: function(s, elem, attrs) {},
            controller: function($scope, $element, $attrs, $transclude) {
                var r = $rootScope,
                    db = server,
                    s = $scope;
                //
                r.secureSection(s);
                var isClientOrDiag = r.userIs(['client', 'diag']);
                if (isClientOrDiag) {
                    return r.handleSecurityRouteViolation();
                }
                //
                s.title = "Logs";
                r.routeParams({
                    item: {
                        userType: 'admin'
                    },
                    prevRoute: 'logs'
                });

                function update() {
                    db.ctrl('Log', 'getAll', {
                        //userType: 'admin'
                    }).then((res) => s.model.update(res.result));
                }
                s.model = {
                    click: (item, index) => {
                        r.routeParams({
                            item: item,
                        });
                        r.route('logs/edit/' + item._id);
                    },
                    buttons: [{
                        label: "Refresh",
                        type: () => "btn btn-default margin-left-0 margin-right-1",
                        click: () => update()
                    }, {
                        label: "New Admin",
                        type: () => "btn btn-default",
                        click: () => r.route('logs/edit/-1')
                    }],
                    columns: [{
                        label: "Type",
                        name: 'type'
                    }, {
                        label: "Message",
                        name: "message",
                        format: (v, item) => item.message && item.message.substring(0, 100) + ' . . .' || 'Empty'
                    }, {
                        label: "Created",
                        format: (v, item) => r.momentFormat(item.created, "DD-MM-YY HH[h]mm")
                    }],
                    items: []
                };
                update();
            }
        };
    });
})();
(function() {
    /*global angular*/
    angular.module('app').directive('adminsList', function(
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
                s.title = "";
                r.routeParams({
                    item: {
                        userType: 'admin'
                    },
                    prevRoute: 'administrators'
                });

                function update() {
                    db.ctrl('User', 'getAll', {
                        userType: 'admin'
                    }).then((res) => s.model.update(res.result));
                }
                s.model = {
                    click: (item, index) => {
                        r.routeParams({
                            item: item,
                        });
                        r.route('administrators/edit/' + item._id);
                    },
                    buttons: [{
                        label: "Rafraîchir",
                        type: () => "btn diags-btn bg-azure-radiance margin-left-0 margin-right-1",
                        click: () => update()
                    }, {
                        label: "Créer admin",
                        type: () => "btn diags-btn bg-azure-radiance",
                        click: () => r.route('administrators/edit/-1')
                    }],
                    columns: [{
                        label: "Email",
                        name: 'email'
                    }, {
                        label: "Téléphones",
                        name: "fixedTel",
                        format: (v, item) => {
                            v = '';
                            if (item.fixedTel) {
                                v = 'TF: ' + item.fixedTel;
                            }
                            if (item.cellPhone) {
                                if (!v) {
                                    v = 'M: ' + item.cellPhone;
                                }
                                else {
                                    v += ' M: ' + item.cellPhone;
                                }
                            }
                            return v;
                        }
                    }],
                    items: []
                };
                update();
            }
        };
    });
})();

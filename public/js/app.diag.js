(function(){
    var app = angular.module('app.diag', []);
    app.directive('diagsList', function(
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
                s.title = "Diags";
                r.routeParams({
                    prevRoute: 'diags'
                });

                function update() {
                    db.ctrl('User', 'getAll', {
                        userType: 'diag'
                    }).then((res) => {
                        res.result = _.orderBy(res.result,['priority'],['asc']);
                        s.model.update(res.result)
                    });
                }
                s.model = {
                    click: (item, index) => {
                        r.routeParams({
                            item: item,
                        });
                        r.route('diags/edit/' + item._id);
                    },
                    buttons: [{
                        label: "Refresh",
                        type: () => "btn btn-default margin-left-0 margin-right-1",
                        click: () => update()
                    }, {
                        label: "New Diag",
                        type: () => "btn btn-default",
                        click: () => r.route('diags/edit/-1')
                    }],
                    columns: [{
                        label:'Priority',
                        name:'priority'
                    },{
                        label: "Email",
                        name: 'email'
                    }, {
                        label: "Tel",
                        name: "fixedTel",
                        format: (v, item) => item.fixedTel || item.cellPhone || ''
                    }, {
                        label: "Comission",
                        name: "commission"
                    }],
                    items: []
                };
                update();
            }
        };
    });
})();
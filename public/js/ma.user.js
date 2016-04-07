(function() {
    //
    var app = angular.module('ma.user', []);

    //
    app.directive('userList', function(
        $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server, $mongoosePaginate) {
        return {
            restrict: 'AE',
            replace: true,
            scope: {},
            templateUrl: 'views/directives/directive.fast-crud.html',
            link: function(s, elem, attrs) {},
            controller: function($scope, $element, $attrs, $transclude) {
                var r = $rootScope,
                    db = server,
                    s = $scope,
                    dbPaginate = $mongoosePaginate.get('User');
                s.title = "Users";
                r.routeParams({
                    prevRoute: 'users'
                });

                function update(cb) {
                    dbPaginate.ctrl({
                        //userType: 'client'
                    }, s.model).then((res) => {
                        if (cb) {
                            cb(res.result);
                        } else {
                            s.model.update(res.result)
                        }
                    });
                }
                s.model = {
                    init:()=>update(),
                    filter:{
                        template:'userFilter',
                        rules:{
                            email:'contains',
                            userType:'contains'
                        }
                    },
                    paginate: (cb) => {
                        update(cb)
                    },
                    click: (item, index) => {
                        r.routeParams({
                            item: item,
                        });
                        r.route('users/edit/' + item._id);
                    },
                    buttons: [{
                        label: "Refresh",
                        type: () => "btn btn-default margin-left-0 margin-right-1",
                        click: () => update()
                    }, {
                        label: "New User",
                        type: () => "btn btn-default",
                        click: () => r.route('users/edit/-1')
                    }],
                    columns: [{
                        label: "Type",
                        name: 'userType'
                    }, {
                        label: "Email",
                        name: 'email'
                    }/*, {
                        label: "Tel",
                        name: "fixedTel",
                        format: (v, item) => item.fixedTel || item.cellPhone || ''
                    }*/],
                    items: []
                };
                
            }
        };
    });

    //
})();

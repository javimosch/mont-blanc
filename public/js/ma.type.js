(function() {
    //
    var app = angular.module('ma.type', []);

    //
    app.directive('typeList', function(
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
                    dbPaginate = $mongoosePaginate.get('Type');
                s.title = "Types";
                r.routeParams({
                    prevRoute: 'types'
                });

                function update(cb) {
                    dbPaginate.ctrl(Object.assign({
                        __populate:{
                            _parent:"code"
                        }
                    },s.model.filter.payload||{}), s.model).then((res) => {
                        if (cb) {
                            cb(res.result);
                        } else {
                            s.model.update(res.result)
                        }
                    });
                }
                s.model = {
                    init: () => update(),
                    filter:{
                        template:'typeFilter',
                        rules:{
                            //_parent_code:'contains',
                            code:'contains'
                        }
                    },
                    paginate: (cb) => {
                        update(cb)
                    },
                    click: (item, index) => {
                        r.routeParams({
                            item: item,
                        });
                        r.route('types/edit/' + item._id);
                    },
                    buttons: [{
                        label: "Refresh",
                        type: () => "btn btn-default margin-left-0 margin-right-1",
                        click: () => update()
                    }, {
                        label: "New Type",
                        type: () => "btn btn-default",
                        click: () => r.route('types/edit/-1')
                    }],
                    columns: [{
                        label:"Parent",
                        name:"_parent",
                        format:(v,i)=>i._parent && i._parent.code || ''
                    },{
                        label: "Code",
                        name: 'code'
                    },{
                        label: "Description",
                        name: 'description',
                        format:(v,item)=>{
                            if(item.description.length>100){
                                return item.description.substring(0,100)+' . . .';
                            }else{
                                return item.description;
                            }
                        }
                    }],
                    items: [],
                    records:{
                        label:'Records',
                        show:true
                    }
                };

            }
        };
    });

    //

    app.controller('typeEdit', ['server', '$scope', '$rootScope', '$routeParams', 'focus', 'crud',
        function(db, s, r, params, focus, crud) {
            crud.create({
                name: 'Type',
                routeParams: params,
                scope: s,
                defaults: {
                    http:{
                        request:{
                            __populate:{
                                "_parent":"code"
                            }
                        }
                    },
                    data: {
                        description: '',
                        _parent: null
                    }
                },
                save: {
                    after: {
                        goBack: true
                    }
                },
                routes: {
                    back: 'types'
                },
                modals: {
                    confirm: 'confirm',
                    delete: {
                        description: () => 'Delete item ' + s.item.description + ' ' + r.momentDateTime(s.item.created)
                    }
                },
                events: {
                    after: {
                        save: [
                            () => {
                                //console.log('saved!');
                            }
                        ]
                    }
                },
                validate: {
                    options: (s) => {
                        return [
                            [s.item.code, '==', false, 'Code required']
                        ];
                    }
                }
            }).init();

            //
            s.getTypes = function(val) {
                return db.http('Type', 'getAll', {
                    __regexp: {
                        code: val
                    }
                }).then(function(res) {
                    return res.data.result;
                });
            };
            //

        }
    ]);

    //
})();

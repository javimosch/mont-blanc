angular.module('app').directive('logList', function(
        $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server,$mongoosePaginate) {
        return {
            restrict: 'AE',
            replace: true,
            scope: {},
            templateUrl: 'views/directives/directive.fast-crud.html',
            link: function(s, elem, attrs) {},
            controller: function($scope, $element, $attrs, $transclude) {
                var r = $rootScope,
                    db = server,
                    s = $scope, dbPaginate = $mongoosePaginate.get('Log');
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

                function update(cb) {
                    dbPaginate.ctrl({
                        __sort:"-createdAt"
                    },s.model).then(res=>{
                        if(cb) return cb(res.result);
                        s.model.update(res.result);
                    });
                }
                s.model = {
                    init:()=>update(),
                    filter:{
                        template:'logFilter',
                        rules:{
                            type:'contains',
                        }
                    },
                    paginate: (cb) => {
                        update(cb)
                    },
                    click: (item, index) => {
                        r.routeParams({
                            item: item,
                        });
                        r.route('logs/edit/' + item._id);
                    },
                    buttons: [{
                        label: "Refresh",
                        type: () => "btn diags-btn bg-azure-radiance margin-left-0 margin-right-1",
                        click: () => update()
                    }, {
                        label: "New Log",
                        show:false,
                        type: () => "btn diags-btn bg-azure-radiance margin-right-1",
                        click: () => r.route('logs/edit/-1')
                    },{
                        label:"Delete all",
                        type: () => "btn diags-btn bg-blaze-orange",
                        click: () => {
                            r.openConfirm('Sure?',()=>{
                                db.ctrl('Log','removeAll',{}).then(d=>{
                                    if(d.ok){
                                        r.infoMessage('All records were deleted');
                                        update(null);
                                    }else{
                                        r.warningMessage("Delete all fail, try later.");
                                    }
                                })
                            });
                        }
                    }],
                    columns: [{
                        label: "Category",
                        name: 'category'
                    }, {
                        label: "Message",
                        name: "message",
                        format: (v, item) => item.message && item.message.substring(0, 100) + ' . . .' || 'Empty'
                    },{
                        label: "Level",
                        name: 'type'
                    }, {
                        label: "Created",
                        format: (v, item) => r.momentFormat(item.createdAt, "DD-MM-YY HH[h]mm")
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
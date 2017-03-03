/*global angular*/
angular.module('app').controller('database-files', ['server', '$scope', '$rootScope', '$routeParams', 'focus', '$log', '$timeout', 'backendApi', 'backendApiHelper',
    function(db, s, r, params, focus, $log, $timeout, backendApi, backendApiHelper) {
        window.details = s;
        s.params = params;
        s.isNew = () => s.params && s.params.id && s.params.id.toString() === 'new';
        s.isEdit = () => s.params && s.params.id && s.params.id.toString() != '-1' && !s.isNew();
        s.isDetailView = () => s.isEdit() || s.isNew();
        var collection = (action, data) => {
            return db.ctrl('pages', action, data);
        };
        if (s.isDetailView()) {
            s.item = {};
            s.showOpenUrl = () => (s.isDetailView() && s.item && s.item.url);
            s.openUrl = () => {
                if (!s.showOpenUrl()) return;
                var win = window.open(s.item.url, '_blank');
                win.focus();

            };
            s.showRemove = () => s.item && s.item._id;
            s.remove = () => {};
            //}
            s.save = () => {

            };
            s.back = () => {
                return r.route('database-files/-1');
            };

        }
        else {
            //list view view
            $timeout(function() {
                r.$emit('lvw-update');
            }, 1000);
        }


    }
]).directive('databaseFilesList', function( //database-files-list
    $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server, $mongoosePaginate, $log) {
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
                dbPaginate = $mongoosePaginate.get('File');

            window.s = s;
            r.routeParams({
                prevRoute: 'settings'
            });


            function update(items, cb) {
                var data = {
                    /*
                    __select: "_client _diag address start end price status created createdAt",
                    __populate: {
                        '_client': 'email',
                        '_diag': 'email'
                    },*/
                    __sort: "-createdAt",

                };

                r.dom(_apply);

                function _apply() {
                    //
                    data = Object.assign(data, s.model.filter.payload || {});
                    //
                    dbPaginate.ctrl(data, s.model).then(res => {
                        
                        res.result = _.sortBy(res.result,(v=>{
                            return v.uploadDate * -1;
                        }));
                        
                        if (cb) {
                            cb(res.result);
                        }
                        else {
                            s.model.update(res.result, null);
                        }
                    });
                }
            }
            s.model = {
                init: () => {
                    $log.log('is-lvw-?');
                    r.$on('lvw-update', () => {
                        $log.log('is-lvwl');
                        s.model.filter.firstTime();
                    });
                },
                filter: {
                    template: 'pagesFilter',
                    update: update,
                    rules: {
                        code: 'contains'
                    }
                },
                pagination: {
                    itemsPerPage: 100
                },
                paginate: (cb) => {
                    update(null, cb)
                },
                click: (item, index) => {
                    r.routeParams({
                        item: item,
                    });
                    //r.route('settings-pages/' + item._id);
                    window.open(db.URL() + '/File/get/' + item._id, '_newtab');
                },
                buttons: [{
                    label: "Rafraîchir",
                    type: () => "btn diags-btn bg-azure-radiance margin-left-0 margin-right-1",
                    click: () => update()
                }, {
                    label: "Remove Orphans",
                    type: () => "btn diags-btn bg-azure-radiance margin-left-0 margin-right-1",
                    click: () => {
                        r.openConfirm('This operation will remove permanently any file from database without relation with Orders and Diags accounts. Continue?', () => {
                            db.ctrl('File', 'removeOrphans', {}).then(res => {
                                if (res.ok) {
                                    r.infoMessage('Orphans removed');
                                    update();
                                }
                                else {
                                    r.infoMessage('Server could not complete the operation, try later.');
                                }
                            });
                        });

                    }
                }],
                columns: [{
                    label: "Name",
                    name: 'filename',
                    //format: (v, item) => item._diag.email
                }, {
                    label: "User",
                    name: 'owner',
                    //format: (v, item) => item._diag.email
                }, {
                    label: 'Order',
                    name: 'orderId'
                }, {
                    label: "Type",
                    name: 'contentType',
                    //format: (v, item) => item._diag.email
                }, {
                    label: 'Created',
                    name: 'uploadDate',
                    format: (v, item) => {
                        return r.momentFormat(item.uploadDate, 'DD-MM-YY HH:mm');
                    }
                }],
                items: [],
                records: {
                    label: 'Records',
                    show: true
                }
            };

        }
    };
});

(function() {
    /*global angular*/
    /*global _*/
    /*global moment*/
    /*global $U*/
    /*global $D*/
    angular.module('diag-account-feature-module')
        .directive('diagsList', function(
            $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server) {
            return {
                restrict: 'E',
                replace: true,
                scope: {},
                templateUrl: '/views/directives/directive.fast-crud.html',
                link: function(s, elem, attrs) {},
                controller: function($scope, $element, $attrs, $transclude) {

                    $U.expose('lvw', $scope);

                    var r = $rootScope,
                        db = server,
                        s = $scope;
                    s.title = "";
                    r.routeParams({
                        prevRoute: 'diags'
                    });

                    function update() {
                        db.ctrl('User', 'getAll', {
                            userType: 'diag',
                            __select: "priority firstName email lastName fixedTel cellPhone commission wallet departments disabled isAutoentrepreneur"
                        }).then((res) => {
                            res.result = _.orderBy(res.result, ['priority'], ['asc']);

                            s.model.update(res.result);
                        });
                    }

                    function extract(data, isJSON) {
                        for (var x in data) delete data[x].$$hashKey;
                        isJSON = isJSON || false;
                        if (data.length == 0) return r.okModal('No results');
                        r.openConfirm({
                            message: "Export " + data.length + " registries?",
                            data: {
                                title: 'Confirmation'
                            }
                        }, () => {
                            var fileName = 'diags-accounts-' + moment().format('DDMMYY') + '.csv';
                            if (!isJSON) {
                                $U.downloadContent($U.toCSV({
                                    data: data
                                }), fileName);
                            }
                            else {
                                $U.downloadContent(window.encodeURIComponent(JSON.stringify(data)), fileName);
                            }
                        })
                    }

                    s.model = {
                        click: (item, index) => {
                            r.routeParams({
                                item: item,
                            });
                            r.route('diags/edit/' + item._id);
                        },
                        buttons: [{
                            label: "Rafraîchir",
                            type: () => "btn diags-btn bg-azure-radiance margin-left-0 margin-right-1",
                            click: () => update()
                        }, {
                            label: "Export CSV",
                            type: () => "btn diags-btn bg-pomegranate margin-right-1",
                            click: () => extract(s.model.items)
                        }, {
                            label: "Créer un nouveau",
                            type: () => "btn diags-btn bg-azure-radiance",
                            click: () => r.route('diags/edit/-1')
                        }],
                        columns: [{
                            label: 'Priorité',
                            name: 'priority'
                        }, {
                            label: "FullName",
                            name: "firstName",
                            format: (x, o) => {
                                var rta = o.firstName + ((o.lastName) ? ', ' + o.lastName : '');
                                if (o.isAutoentrepreneur) {
                                    rta+= ' (Autoentrepreneur)';
                                }
                                return rta;
                            }
                        }, {
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
                        }, {
                            label: "Departments",
                            name: "departments",
                            format: (v, item) => {
                                return item.departments && item.departments.join(', ') || 'None';
                            }
                        }, , {
                            label: "Reversement",
                            name: "commission"
                        }, {
                            label: "Activated",
                            name: "commission",
                            format: (v, item) => item.disabled ? "" : "Yes"
                        }, {
                            label: "Wallet ID",
                            name: "wallet",
                            format: (v, item) => item.wallet || ''
                        }],
                        items: []
                    };
                    update();
                }
            };
        });

})();

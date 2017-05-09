(function() {
    /*global angular*/
    /*global moment*/
    angular.module('diag-account-feature-module')
        .directive('diagExceptionList', function(
            $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server, $mongoosePaginate, $routeParams) {
            return {
                restrict: 'AE',
                replace: true,
                scope: {
                    //model: "=model"
                },
                templateUrl: 'views/directives/directive.fast-crud.html',
                link: function(s, elem, attrs) {
                    var r = $rootScope,
                        dbPaginate = $mongoosePaginate.get('TimeRange'),
                        params = $routeParams;
                    var db = server;
                    var n = attrs.name;
                    r.secureSection(s);
                    //
                    if (r.userIs('client')) {
                        r.handleSecurityRouteViolation();
                    }

                    function update(items, cb) {
                        if (items) {
                            s.model.update(items);
                            return;
                        }
                        var rules = {
                            __populate: {
                                '_user': 'email'
                            }
                        };

                        if (r.userIs('diag')) {
                            rules._user = r.session()._id;
                        }

                        if (params && params.id) {
                            rules._user = params.id;
                        }

                        if (!rules._user || rules._user.toString() == '-1') {
                            return console.warn('time-range: insufficients rules.');
                        }

                        dbPaginate.ctrl(rules, s.model).then((res) => {
                            if (res.ok) {
                                if (cb) {
                                    cb(res.result);
                                }
                                else {
                                    s.model.update(res.result, null);
                                }
                            }
                        });
                    }

                    var userId = () => {
                        if (r.userIs('diag')) return r.session()._id;
                        if (params.id) return params.id;
                        return null;
                    };
                    var prevRoute = () => {
                        if (r.userIs('diag')) return 'dashboard';
                        if (params.id) {
                            return 'diags/edit/' + params.id;
                        }
                        else {
                            return 'exceptions';
                        }
                    };

                    var columns = [];
                    if (r.userIs('admin') && (params && params.id || null) == null) {
                        columns.push({
                            label: 'Diag',
                            name: '_user',
                            format: (v, item) => item._user.email
                        });
                    }
                    columns.push({
                        label: "Description",
                        name: 'description'
                    }, {
                        label: "de",
                        name: 'start',
                        format: (v, item) => {
                            if (item.repeat !== 'none') return r.momentTime(item.start);
                            //return moment(item.start).format('DD-MM-YY HH[h]mm')
                            return r.momentDateTimeWords2(item.start);
                        }
                    }, {
                        label: "à",
                        name: 'end',
                        format: (v, item) => {
                            if (item.repeat !== 'none') return r.momentTime(item.end);
                            //return moment(item.end).format('DD-MM-YY HH[h]mm')
                            return r.momentDateTimeWords2(item.end);
                        }
                    }, {
                        label: "Règle",
                        name: 'repeat',
                        format: (v, item) => {
                            if (item.repeat == 'none') return 'Indisponibilité spécifique';
                            if (item.repeat == 'day') return 'Indisponibilité tous les jours';
                            if (item.repeat == 'week') {
                                var day = '(' + moment().weekday(item.weekday).format('dddd') + ')';
                                return 'Indisponibilité toutes les semaines ' + (item.weekday ? day : '');
                            }
                            return 'Error';
                        }
                    });

                    s.model = {
                        title: 'Indisponibilités',
                        paginate: (cb) => update(null, cb),
                        init: () => update(),
                        remove: (item, index) => {
                            var msg = 'Delete Indisponibilité  ' + item.description + ' / De ' + r.momentDateTime(item.start) + ' À ' + r.momentDateTime(item.end);
                            r.openConfirm(msg, () => {
                                db.ctrl('TimeRange', 'remove', {
                                    _id: item._id
                                }).then(() => {
                                    update();
                                });
                            });
                        },
                        click: (item, index) => {
                            r.routeParams({
                                item: item,
                                prevRoute: prevRoute()
                            });
                            r.route('exceptions/edit/' + item._id);
                        },
                        buttons: [{
                            label: "Rafraichir",
                            type: () => "btn diags-btn bg-azure-radiance margin-right-quarter margin-bottom-quarter",
                            click: () => update()
                        }, {
                            label: "Ajouter une indisponibilité",
                            type: () => "btn diags-btn bg-azure-radiance margin-bottom-quarter",
                            click: () => {
                                r.routeParams({
                                    item: {
                                        _user: userId()
                                    },
                                    prevRoute: prevRoute()
                                });
                                r.route('exceptions/edit/-1');
                            }
                        }],
                        columns: columns
                    };

                }
            };
        });
})();

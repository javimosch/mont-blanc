(() => {
    /*global angular*/
    /*global moment*/
    angular.module('diag-account-feature-module').directive('diagBalance', function(
        $rootScope, $timeout, $compile, $uibModal, $templateRequest, $sce, server, $mongoosePaginate) {
        return {
            restrict: 'AE',
            replace: true,
            scope: {
                //model: "=model"
            },
            templateUrl: 'views/directives/directive.fast-crud.html',
            link: function(s, elem, attrs) {
                var r = $rootScope,
                    db = server,
                    n = attrs.name,
                    dbPaginate = $mongoosePaginate.get('StripeTransaction');
                s.title = "Portefeuille";
                r.setCurrentCtrl(s);


                /*
                function update(recalc) {
                    var data = {
                        _id: r.session()._id,

                    };
                    if (recalc) {
                        data._calculate = true;
                    }
                    data.period = s.model.periodSelected || 'year';
                    
                    ws.ctrl('User', 'balance', data).then((res) => {
                        console.info('balance', res.result);
                        if (res.ok && res.result) {
 
                            s.balance = res.result;
                            s.model.update(res.result.items, s.balance);
                        }
                    });
                }*/

                function payload() {
                    var data = {
                        _user: r.session()._id,
                        __populate: {
                            _order: "_id info diagRemunerationHT"
                        }
                    };
                    data = Object.assign(data, s.model.filter.payload || {});
                    return data;
                }

                function update(items, cb) {
                    db.ctrl('Payment', 'syncTransactions', {
                        _user: r.session()._id,
                        _diag: r.session()._id
                    }).then(res => {
                        dbPaginate.ctrl(payload(), s.model, {
                            autoResolve: true,
                            callback: cb
                        }).then(r => {
                            if (r.result) {
                                s.model.total = 0;
                                r.result.forEach(i => s.model.total += i._order.diagRemunerationHT);
                            }
                        });
                    });
                }


                s.model = {
                    total: 0,
                    //
                    init: () => s.model.filter.firstTime(),
                    filter: {
                        template: 'diagBalanceFilter',
                        update: update,
                        rules: {
                            created: 'month-range',
                        },
                        payloadRules: {
                            year: (data, val) => {
                                var date = moment().year(parseInt(val));
                                if (s.model.filter.fields.created == null) {
                                    data.__rules.created = {
                                        $gte: date.startOf('year').toDate().toString(),
                                        $lt: date.endOf('year').toDate().toString()
                                    }
                                }
                                return data;
                            }
                        },
                        yearChange: () => {
                            s.model.filter.fields.created = null;
                            s.model.filter.filter();
                        }
                    },
                    pagination: {
                        itemsPerPage: 10
                    },
                    paginate: (cb) => {
                        update(null, cb)
                    },
                    months: () => {
                        return moment.monthsShort().map((m, k) => k + 1 + ' - ' + m);
                    },
                    years: () => {
                        var c = {};
                        for (var x = 2010; x < 2020; x++) {
                            c[x.toString()] = x;
                        }
                        return c;
                    },
                    /*
                    periodSelected:'year',
                    periods: createSelect({
                        label: '(Select a period)',
                        model: 'model.periodSelected',
                        scope: s,
                        change: x => {
                            console.info(x);
                            update(true)
                        },
                        items: ['month', 'year']
                    }),
                    */
                    // buttonsTpl: 'views/diags/backoffice/partials/diag-balance-buttons.html',
                    tfoot: 'views/diags/backoffice/partials/diag-balance-footer.html',
                    click: (item, index) => {
                        if (item._order) {
                            r.route('orders/edit/' + item._order._id)
                        }
                        else {
                            return r.infoMessage("Il n'y a pas un ordre associé", 4000);
                        }
                    },
                    buttons: [{
                        label: "Rafraîchir",
                        type: () => "btn diags-btn azure-radiance spacing-h-1",
                        click: () => update()
                    }],
                    columns: [{
                            label: "Description",
                            name: 'description'
                        },
                        /* {
                                                label: "Quantité (EUR)",
                                                labelCls: () => ({
                                                    'text-right': true
                                                }),
                                                name: 'amount',
                                                //format: (v, item) => v / 100,
                                                align: 'right'
                                            },*/
                        {
                            label: "Revenue (EUR)",
                            labelCls: () => ({
                                'text-right': true
                            }),
                            name: 'stripeFee',
                            format: (v, item) => item._order.diagRemunerationHT,
                            align: 'right'
                        }, {
                            label: "Création",
                            name: "created",
                            format: (v, item) => r.momentDateTime(item.created)
                        }
                    ],
                    items: []
                };
                update();
                //                console.log('directive.exceptions.linked');
            }
        };
    });
})();

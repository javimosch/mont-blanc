/*global angular*/
/*global $U*/
/*global $D*/
/*global moment*/
/*global _*/
/*global tinymce*/
(function() {
    var app = angular.module('diags_ctrl_settings', []);
    app.controller('diags_ctrl_settings', ['server', '$scope', '$rootScope', 'diagPrice', '$log', 'orderPrice',
        function(db, s, r, diagPrice, $log, orderPrice) {

            s.orderPrice = orderPrice;

            db.localData().then(function(data) {
                s.localData = data;
                //s.$emit('localData');
            });

            function mergeStaticPrices() {
                db.localData().then(function(data) {
                    var diags = data.diags;

                    s.item.metadata = s.item.metadata || {};
                    s.item.metadata.prices = s.item.metadata.prices || {};

                    for (var i in diags) {


                        if (s.item.metadata.prices[diags[i].name] === undefined) {
                            s.item.metadata.prices[diags[i].name] = diags[i].price;
                        }


                    }

                    if (isNaN(s.item.metadata.prices.basePrice) || s.item.metadata.prices.basePrice == undefined || s.item.metadata.prices.basePrice == '') {
                        s.item.metadata.prices.basePrice = data.basePrice;
                    }

                });
            }


            s.deleteAll = (t) => {
                r.openConfirm({
                    message: "You want to delete all the objects of type " + t + ' ?',
                    data: {
                        title: "Delete Confirmation"
                    }
                }, () => {
                    db.ctrl(t, 'removeWhen', {}).then((res) => {
                        if (res.ok) {
                            r.okModal('All the objects of type ' + t + ' were deleted from the database.');
                        }
                    })
                });
            };


            $U.expose('s', s);
            r.toggleNavbar(true);
            r.secureSection(s);
            if (r.userIs(['diag', 'client'])) {
                return r.handleSecurityRouteViolation();
            }
            $U.expose('s', s);

            s.months = () => {
                return moment.monthsShort().map((m, k) => k + 1 + ' - ' + m);
            };

            s.menuItems = {
                'Dynamic blocks (Texts)': 'texts',
                "Dynamic HTML": "settings-htmls/-1",
                "Content Pages": "settings-pages/-1",
                'Notifications': 'notifications',
                'Logs': 'logs',
                "Tools": 'tools',
                //"General prices": "prices",
                "Prices (General, Modifiers, Test tool)": "price-modifiers",
                "Documentation": "documentation",
                "Database": "settings-database",
                "Extract Data": "settings-exportation",
                "Invoice Template": "settings-invoice",
                "Password reset": "settings-password-reset"
            };

            s.priceModifiers = {
                "Today Monday to Friday (+%)": "todayMondayToFriday",
                "Today Saturday (+%)": "todaySaturday",
                "Today Sunday (+%)": "todaySunday",
                "Tomorrow Monday to Friday (+%)": "tomorrowMondayToFriday",
                "Tomorrow Saturday (+%)": "tomorrowSaturday",
                "Tomorrow Sunday (+%)": "tomorrowSunday",
                "Monday to Friday (+%)": "mondayToFriday",
                "Saturday (+%)": "saturday",
                "Sunday (+%)": "sunday",
                "VAT (+%)": 'VATRate',
                "Commercial Building (+%)": 'commercialBuilding'
            };

            s.item = {
                pricePercentageIncrease: {
                    //today: 0, //deprecated for today[DAY]
                    todayMondayToFriday: 30,
                    todaySaturday: 50,
                    todaySunday: 130,

                    //tomorrow: 0, //deprecated for tomorrow[DAY]
                    tomorrowMondayToFriday: 10,
                    tomorrowSaturday: 40,
                    tomorrowSunday: 110,

                    mondayToFriday: 0,
                    saturday: 30,
                    sunday: 100,
                    VATRate: 20,
                    commercialBuilding: 70
                }
            };

            function validNumber(input) {
                if (input == undefined) return false;
                if (isNaN(input)) return false;
                if (!$U.numberBetween(input, 0, 500)) return false;
                return true;
            }

            s.departmentMultiplier = {
                department: '',
                value: null,
                examplePrice: 350
            };

            s.departmentMultiplierHasDepartment = function() {
                return s.item && s.item.metadata && s.item.metadata.departmentMultipliers && s.item.metadata.departmentMultipliers[s.departmentMultiplier.department] !== undefined;
            };

            s.selectDepartmentMultiplierItem = function(department, value) {
                s.departmentMultiplier.department = department;
                s.departmentMultiplier.value = value;
            };

            s.removeDepartmentMultiplier = function(department) {
                s.item.metadata.departmentMultipliers = s.item.metadata.departmentMultipliers || {};

                if (s.item.metadata.departmentMultipliers[department] !== undefined) {
                    delete s.item.metadata.departmentMultipliers[department];
                }
            };
            s.addDepartmentMultiplier = function() {
                s.item.metadata.departmentMultipliers = s.item.metadata.departmentMultipliers || {};
                if (s.departmentMultiplier.department && s.departmentMultiplier.value !== undefined) {

                    if (s.departmentMultiplier.department.toString().length === 1) {
                        s.departmentMultiplier.department = '0' + s.departmentMultiplier.department;
                    }

                    if (!s.departmentMultiplier.value || isNaN(s.departmentMultiplier.value) || s.departmentMultiplier.value === '') {
                        return console.warn('WARN: not a value');
                    }
                    else {

                        if (parseFloat(s.departmentMultiplier.value) > 10) {
                            return console.warn('WARN: value should be less equal 10');
                        }

                        if (parseFloat(s.departmentMultiplier.value) < 0) {
                            return console.warn('WARN: value should be greater equal 0');
                        }

                        s.item.metadata.departmentMultipliers[s.departmentMultiplier.department] = parseFloat(s.departmentMultiplier.value);

                        s.departmentMultiplier.value = null;
                        s.departmentMultiplier.department = null;

                    }

                }

            };

            s.validate = () => {
                var rules = [];
                for (var x in s.item.pricePercentageIncrease) {
                    rules.push([
                        validNumber(s.item.pricePercentageIncrease[x]), '==', false,
                        x + " valid value in  0 .. 500"
                    ]);
                }
                $U.ifThenMessage(rules, r.warningMessage, s.save);
            };
            s.save = () => {
                db.ctrl('Settings', 'save', s.item).then(d => {
                    if (d.ok) {
                        r.infoMessage('Changes saved');
                    }
                });
            };
            s.read = () => {
                db.ctrl('Settings', 'getAll', {}).then(r => {
                    if (r.ok && r.result.length > 0) {
                        s.item = r.result[0];


                        s.item.pricePercentageIncrease = s.item.pricePercentageIncrease || {};
                        s.item.pricePercentageIncrease
                            .commercialBuilding = s.item.pricePercentageIncrease
                            .commercialBuilding || 70;
                        s.item.pricePercentageIncrease
                            .VATRate = s.item.pricePercentageIncrease
                            .VATRate || 20;

                        mergeStaticPrices();
                    }
                    else {
                        s.save();
                    }
                });
            };
            s.read();


            s.input = {
                file: null
            };

            s.import = {
                texts: () => {
                    if (!s.input.file) return r.warningMessage('Select a file');
                    var reader = new FileReader();
                    reader.onload = (function(theFile) {
                        return function(e) {
                            try {
                                var arr = JSON.parse(window.decodeURIComponent(e.target.result));
                                arr.map(o => {
                                    delete o._id;
                                    return o;
                                });
                                console.info(arr)

                                r.openConfirm({
                                    message: "Upload " + arr.length + " items? Data will be replaced."
                                }, () => {

                                    db.ctrl('Text', 'importAll', {
                                        items: arr
                                    }).then(res => {
                                        if (res.ok) {
                                            r.okModal({
                                                message: "Data uploaded ok."
                                            });
                                        }
                                    });
                                });

                            }
                            catch (ex) {
                                r.warningMessage('Import issue, try later.');
                                console.warn(ex);
                            }
                        }
                    })(s.input.file);
                    reader.readAsText(s.input.file);
                }
            }

            //reports
            s.reports = {
                input: {
                    month: moment().month(),
                    diagSeparator: ', ',
                    fileName: "report.csv"
                },
                texts: {
                    all: () => {
                        db.ctrl('Category', 'getAll', {
                            __select: "code description _parent"
                        }).then(rr => {
                            var cats = rr.result;
                            cats.map(item => {
                                if (item._parent) {
                                    var _p = _.cloneDeep(cats.filter(c => c._id == item._parent)[0]);
                                    delete _p._id;
                                    item._parent = _p;
                                }
                            })
                            db.ctrl('Text', 'getAll', {
                                __select: "_category code description content"
                            }).then(res => {
                                if (res.ok && res.result) {
                                    res.result.map(item => {
                                        delete item._id;
                                        delete item._v;
                                        item._category = cats.filter(c => c._id == item._category)[0];
                                    });
                                    res.result.map(item => {
                                        delete item._category._id;
                                        delete item._category._v;
                                    });
                                    s.reports.input.fileName =
                                        'text_' + res.result.length + "_items_" + r.momentDateTime(Date.now()).toString().replaceAll(' ', '_') + '.json';

                                    s.download(res.result, true);
                                }
                            })
                        });

                    }
                },
                orders: {
                    monthReportFilename: "report_orders_month_.csv",
                    monthReport: () => {
                        var date = moment().month(parseInt(s.reports.input.month));
                        s.reports.orders.monthReportFilename = 'report_orders_month_' + date.format('MMMM') + '.csv';
                        db.ctrl('Order', 'getAll', {
                            __select: "_id status _diag address start price priceHT revenueHT diagRemunerationHT diags deliveredAt",
                            __populate: {
                                _diag: "firstName lastName"
                            },
                            __rules: {
                                status: {
                                    $in: ['completed', 'delivered']
                                },
                                deliveredAt: {
                                    $gte: date.startOf('month').toDate().toString(),
                                    $lt: date.endOf('month').toDate().toString()
                                }
                            }
                        }).then(res => {
                            if (res.ok) {
                                console.info(res.result);
                                var rta = [];
                                res.result.forEach(d => {
                                    rta.push({
                                        orderID: d._id,
                                        start_date: r.momentDateTime(d.start),
                                        delivered_date: r.momentDateTime(d.deliveredAt),
                                        status: d.status,
                                        diag_fullname: d._diag.firstName + " " + d._diag.lastName,
                                        address: d.address,
                                        diags_list: _.map(_.pickBy(d.diags, (a) => a == true), (v, k) => k).join(s.reports.input.diagSeparator),
                                        priceTTC: d.price,
                                        priceHT: d.priceHT,
                                        revenueHT: d.revenueHT,
                                        diagRemunerationHT: d.diagRemunerationHT
                                    });
                                });

                                s.download(rta);

                            }
                        });


                        console.log('monthReport! gte ', r.momentDateTime(date.startOf('month').toDate()), 'lt', r.momentDateTime(date.endOf('month').toDate()));
                    }
                }
            };

            s.download = (data, isJSON) => {
                isJSON = isJSON || false;
                if (data.length == 0) return r.okModal('No results');
                r.openConfirm({
                    message: data.length + " items found, extract?",
                    data: {
                        title: (isJSON) ? "Confirmation" : ("Extract Confirmation for " +
                            moment().month(parseInt(s.reports.input.month)).format('MMMM'))
                    }
                }, () => {
                    if (!isJSON) {
                        $U.downloadContent($U.toCSV({
                            data: data
                        }), s.reports.orders.monthReportFilename);
                    }
                    else {
                        $U.downloadContent(window.encodeURIComponent(JSON.stringify(data)), s.reports.input.fileName);
                    }
                })
            }


            s.pricetool = {
                getClients: function(val) {
                    return db.http('User', 'getAll', {
                        userType: 'client',
                        __regexp: {
                            email: val
                        }
                    }).then(function(res) {
                        return res.data.result;
                    });
                },
                diagName: function(k) {
                    return $D.diagNameConvertion(k);
                },
                dayPriceModifiers: function(obj) {
                    function isDayModifier(x) {
                        return x !== 'VATRate' && x !== 'commercialBuilding';
                    }
                    var result = {};
                    angular.forEach(obj, function(value, key) {
                        if (isDayModifier(value)) {
                            result[key] = value;
                        }
                    });
                    return result;
                },
                scope: {
                    //this should be the scope for getPriceQuote
                    //localData needs to be injected here 
                    //  keys used:(basePrice squareMetersPrice diags settings)
                    //localData.settings needs to be the db settings object.
                    //item: start info.squareMeters postCode diags (ex:{dpe:true})
                    diagCommissionRate: 75,
                    diagIsAutoentrepreneur:false,
                    item: {
                        start: moment(),
                        postCode: '75010',
                        diags: {
                            dpe: true,
                            crep: false,
                            loiCarrez: false,
                            ernt: false,
                            termites: false,
                            gaz: false,
                            electricity: false,
                            parasitaire: false,
                            dta:false
                        },
                        _client: {
                            email: '',
                            discount: 0
                        },
                        info: {
                            squareMeters: undefined
                        }
                    },
                },
                prepareScope: function(localData) {
                    if (!s.localData) return;
                    s.localData.settings = s.item;
                    Object.assign(this.scope, s.localData);
                    var scope = this.scope;
                    scope.settings = s.item;
                    orderPrice.set({
                        date: scope.item.start,
                        diagIsAutoentrepreneur: scope.diagIsAutoentrepreneur,
                        modifiersPercentages: scope.settings && scope.settings.pricePercentageIncrease,
                        squareMetersPrice: scope.squareMetersPrice,
                        squareMeters: scope._order && scope._order.info && scope._order.info.squareMeters ||
                            scope.item && scope.item.info && scope.item.info.squareMeters || (scope.item && scope.item.squareMeters) || '',
                        clientDiscountPercentage:
                            (scope._order && scope._order._client && scope._order._client.discount) ||
                            (scope.item && scope.item._client && scope.item._client.discount),
                        departmentMultipliers: scope.settings && scope.settings.metadata && scope.settings.metadata.departmentMultipliers,
                        postCode: scope.item && scope.item.postCode,
                        basePrice: scope.basePrice,
                        selectedDiags: scope._order && scope._order.diags && scope._order.diags ||
                            scope.item && scope.item.diags,
                        availableDiags: scope.diags
                    });
                },
                setDefaults: function() {
                    this.prepareScope(s.localData);
                    this.scope.item.info.squareMeters = Object.keys(this.scope.squareMetersPrice)[0];
                    this.getClients().then(function(list) {
                        if (list.length > 0) {
                            s.pricetool.scope.item._client = list[0];
                        }
                    });
                },
                onBuildingTypeChange: function(v) {
                    orderPrice.set({
                        buildingType: v
                    });
                }
            };

            s.$watch("localData", function(val) {
                r.dom(function() {
                    s.pricetool.prepareScope(val);
                });
            });



            s.$watch('pricetool.scope.diagIsAutoentrepreneur', function(newValue) {
                orderPrice.set({
                    diagIsAutoentrepreneur: newValue
                });
            });

            s.$watch('pricetool.scope.item.info.squareMeters', function(squareMeters) {
                orderPrice.set({
                    squareMeters: squareMeters
                });
            });

            s.$watch('pricetool.scope.diagCommissionRate', function(diagCommissionRate) {
                orderPrice.set({
                    diagCommissionRate: diagCommissionRate
                });
            });

            s.$watch('pricetool.scope.item._client.discount', function(discount) {
                orderPrice.set({
                    clientDiscountPercentage: discount
                });
            });



        }
    ]);






    //
})();

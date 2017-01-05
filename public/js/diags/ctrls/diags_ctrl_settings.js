/*global angular*/
/*global $U*/
/*global $D*/
/*global moment*/
/*global _*/
/*global tinymce*/
(function() {
    var app = angular.module('diags_ctrl_settings', []);
    app.controller('diags_ctrl_settings', ['server', '$scope', '$rootScope', 'diagPrice', '$log',
        function(db, s, r, diagPrice, $log) {

            db.localData().then(function(data) {
                s.localData = data;
                s.$emit('localData');
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
                'Texts': 'texts',
                'Notifications': 'notifications',
                'Logs': 'logs',
                "Tools": 'tools',
                //"General prices": "prices",
                "Prices (General, Modifiers, Test tool)": "price-modifiers",
                "Documentation": "documentation",
                "Database": "settings-database",
                "Extract Data": "settings-exportation",
                "Invoice Template": "settings-invoice"
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
                "Sunday (+%)": "sunday"
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
                    VATRate: 20
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
                    } else {

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
                        mergeStaticPrices();
                    } else {
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

                            } catch (ex) {
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
                    } else {
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
                scope: {
                    //this should be the scope for getPriceQuote
                    //localData needs to be injected here 
                    //  keys used:(basePrice squareMetersPrice diags settings)
                    //localData.settings needs to be the db settings object.
                    //item: start info.squareMeters postCode diags (ex:{dpe:true})
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
                            parasitaire: false
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
                prepareScope: function() {
                    if (!s.localData) return;
                    s.localData.settings = s.item;
                    Object.assign(this.scope, s.localData);
                },
                getPriceQuote: function() {
                    this.prepareScope();
                    this.scope.price = diagPrice.getPriceQuote(s.pricetool.scope);
                },
                getRatioModifierFor: function(type) {
                    switch (type) {
                        case 'day':
                            var rta = diagPrice.getDayModifierPercentage(s.item.pricePercentageIncrease, this.scope.item.start)
                                //$log.debug('getRatioModifierFor day',this.scope.item.start,s.item.pricePercentageIncrease);
                            return rta;
                            break;
                        case 'size':
                            if (s.localData && s.localData.squareMetersPrice && this.scope.item.info.squareMeters != undefined) {
                                return s.localData.squareMetersPrice[this.scope.item.info.squareMeters]
                            } else {
                                return 0;
                            }

                            break;
                        case 'client':
                            return this.scope.item._client && this.scope.item._client.discount || 0;
                            break;
                        case 'department':
                            if (!s.item.metadata || !s.item.metadata.departmentMultipliers) {
                                return 0;
                            }
                            return diagPrice.getDepartmentModifierPercentage(this.scope.item.postCode, s.item.metadata.departmentMultipliers);
                            break;
                        case 'vat':
                            if (!s.item) {
                                return 0;
                            }
                            return s.item.pricePercentageIncrease.VATRate || 20
                            break;
                        default:
                            $log.warn('no type', type);
                            return 0;
                    }
                },
                priceBase: function() {
                    if (!s.localData) return 0;
                    return s.localData.basePrice + diagPrice.getBasePrice(this.scope.item.diags, s.localData.diags);
                },
                getDayRatio: function(k) {
                    return s.item.pricePercentageIncrease[k];
                },
                priceWithDay: function(k) {
                    //return this.priceBase()*(1+this.getRatioModifierFor('day')/100);
                    return (this.priceBase() * (1 + this.getDayRatio(k) / 100)).toFixed(2);
                },
                priceWithSize: function(k) {
                    return (this.priceWithDay(k) * (1 + this.getRatioModifierFor('size') / 100)).toFixed(2);
                },
                priceWithDiscount: function(k) {
                    return (this.priceWithSize(k) * (1 - this.getRatioModifierFor('client') / 100)).toFixed(2);
                },
                priceWithDepartment: function(k) {
                    //100*((0.9*100)/100)
                    return (this.priceWithDiscount(k) * (this.getRatioModifierFor('department') || 1)).toFixed(2);
                },
                priceWithVAT: function(k) {
                    return (this.priceWithDepartment(k) * (1 + this.getRatioModifierFor('vat') / 100)).toFixed(2);
                },
                priceRounded: function(k) {
                    return (parseInt(parseInt(this.priceWithVAT(k)) / 10, 10) * 10).toFixed(2);
                },
                setDefaults: function() {
                    this.prepareScope();
                    this.scope.item.info.squareMeters = Object.keys(this.scope.squareMetersPrice)[0];
                    this.getClients().then(function(list) {
                        if (list.length > 0) {
                            s.pricetool.scope.item._client = list[0];
                        }
                    });
                }
            };

            s.$on("localData", function() {
                r.dom(function() {
                    s.pricetool.prepareScope();
                });
            });



        }
    ]);


    app.controller('ctrl-settings-invoice', ['server', '$scope', '$rootScope', '$routeParams', 'focus', '$log',
        function(db, s, r, params, focus, $log) {
            //
            $U.expose('s', s);
            //
            s.item = {
                code: '',
                description: '',
                content: '',
                updatedByHuman: true
            };
            //
            check(); //checks when the wysing lib is ready and init the components.

            s.variables = {
                    "{{LOGO}}": "Diagnostical Logo",
                    "{{ORDER_DESCRIPTION}}": "Ex: Pack Vent: ...",
                    "{{ADDRESS}}": "Diag Address",
                    "{{CLIENT_FULLNAME}}": "Particular Client / Agency / Other first & last name",
                    "{{CLIENT_FIRSTNAME}}": "Particular Client / Agency / Other first name",
                    "{{CLIENT_LASTNAME}}": "Particular Client / Agency / Other last name",
                    "{{CLIENT_EMAIL}}": "Particular Client / Agency / Other email",
                    "{{CLIENT_ADDRESS}}": "Particular Client / Agency / Other address",
                    '{{LANDLORDFULLNAME}}': "Landlord Fullname (Agency / Other only)",
                    '{{LANDLORDEMAIL}}': "Landlord Email (Agency / Other only)",
                    '{{LANDLORDPHONE}}': "Landlord Phone (Agency / Other only)",
                    '{{LANDLORDADDRESS}}': "Landlord Address (Agency / Other only)",
                    '{{CREATEDAT}}': "Order creation date Ex: 16/06/2016 10h29",
                    '{{START}}': "Order diag start date Ex: 16/06/2016 10h29",
                    '{{END}}': "Order diag start date Ex: 16/06/2016 10h29",
                    "{{PRICE}}": "Order TTC Price",
                    "{{PRICEHT}}": "Order HT Price",
                    "{{VATRATE}}": "Order VAT Rate Applied",
                    "{{VATPRICE}}": "Order VAT Price Applied",
                    "{{REVENUEHT}}": "Diagnostical Revenue HT Price",
                    "{{DIAGREMUNERATIONHT}}": "Diag Remuneration HT",
                }
                //['PRICE', 'PRICEHT', 'REVENUEHT', 'DIAGREMUNERATIONHT', 'ADDRESS', 'START', 'END'];


            db.ctrl('Order', 'get', {
                __populate: {
                    _client: "email firstName lastName landlordFullName landlordEmail address"
                }
            }).then(res => {
                if (res.ok) {
                    s.randomOrder = res.result;

                }
            });
            //
            s.preview = () => {

                if (!s.randomOrder) {
                    return r.warningMessage('At least one Order saved in DB is required.');
                }

                s.item.content = window.encodeURIComponent(tinymce.activeEditor.getContent());
                var html = $D.OrderReplaceHTML(window.decodeURIComponent(s.item.content), s.randomOrder, r);
                
                return $log.debug(html);

                html = window.encodeURIComponent(html);

                

                r.ws.ctrl("Pdf", "view", {
                    html: html
                }).then(res => {
                    if (res.ok) {
                        s.save();
                        var win = window.open(res.result, '_blank');
                        win.focus();
                    } else {
                        r.warningMessage('Server Issue, try later.');
                    }
                });
            };
            //
            s.read = function() {

                db.ctrl('Category', "createUpdate", {
                    code: "DIAGS_SETTINGS",
                    __match: ['code']
                }).then(function(_res) {
                    if (_res && _res.ok && _res.result) {
                        //
                        var _category = _res.result._id;

                        db.ctrl('Text', 'get', {
                            _category: _category,
                            code: 'INVOICE',
                        }).then(function(res) {
                            if (res.ok) {
                                if (res.result) {
                                    s.item = res.result;
                                    tinymce.activeEditor.setContent(window.decodeURIComponent(s.item.content));
                                } else {
                                    db.ctrl('Text', 'createUpdate', {
                                        _category: _category,
                                        code: 'INVOICE',
                                        description: 'diags-invoice-template',
                                        content: window.encodeURIComponent("&nbsp;"),
                                        __match: ['code']
                                    }).then(function(res) {
                                        if (res.ok && res.result) {
                                            s.item = res.result;
                                            tinymce.activeEditor.setContent(window.decodeURIComponent(s.item.content));
                                        }
                                    });
                                }
                            } else {
                                r.warningMessage('Server issue while reading item. Try later.');
                            }
                        });
                        //
                    }
                });


            };
            //
            s.save = function() {
                if (!s.item.code) return r.warningMessage('Code required');
                if (!s.item.description) return r.warningMessage('Description required');
                if (!s.item._category) return r.warningMessage('Page Section required');
                //
                s.item.updatedByHuman = true;
                s.item.content = window.encodeURIComponent(tinymce.activeEditor.getContent());
                db.ctrl('Text', 'save', s.item).then(function() {
                    //r.route('texts');
                    r.infoMessage("Changes saved", 5000);
                });
            };

            function check() {
                if (typeof window.tinymce !== 'undefined') {
                    r.dom(init);
                } else setTimeout(check, 100);
            }

            function initTinyMCE() {

                if (typeof(window.tinyMCE) !== 'undefined') {
                    var length = window.tinyMCE.editors.length;
                    for (var i = length; i > 0; i--) {
                        window.tinyMCE.editors[i - 1].remove();
                    };
                }

                tinymce.init({
                    selector: '#editor',
                    theme: 'modern',
                    //width: 600,
                    height: 300,
                    plugins: [
                        //'autoresize',
                        'advlist autolink link image lists charmap print preview hr anchor pagebreak spellchecker',
                        'searchreplace wordcount visualblocks visualchars code fullscreen insertdatetime media nonbreaking',
                        'save table contextmenu directionality emoticons template paste textcolor'
                    ],
                    content_css: 'css/diags.design.css',
                    toolbar: 'insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | print preview media fullpage | forecolor backcolor emoticons'
                });

            }

            function init() {
                initTinyMCE();
                r.dom(s.read, 0);
            }
        }
    ]);



    //
})();
/*global angular*/
/*global $U*/
/*global moment*/
/*global _*/
(function() {
    var app = angular.module('diags_ctrl_settings', []);
    app.controller('diags_ctrl_settings', ['server', '$scope', '$rootScope',
        function(db, s, r) {

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
                "Price Modifiers": "price-modifiers",
                "Documentation": "documentation",
                "Database": "settings-database",
                "Exportation": "settings-exportation"
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
                var rta = !input;
                if (rta) return false;
                rta = isNaN(input);
                if (rta) return false;
                if (!$U.numberBetween(input, 0, 500)) return false;
                return true;
            }

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
                    if (r.ok && r.result.length > 0) s.item = r.result[0];
                    else {
                        s.save();
                    }
                });
            };
            s.read();


            //reports
            s.reports = {
                input: {
                    month: moment().month(),
                    diagSeparator: ', ',
                    fileName: "report.csv"
                },
                orders: {
                    monthReportFilename: "report_orders_month_.csv",
                    monthReport: () => {
                        var date = moment().month(parseInt(s.reports.input.month));
                        s.reports.orders.monthReportFilename = 'report_orders_month_' + date.format('MMMM') + '.csv';
                        db.ctrl('Order', 'getAll', {
                            __select: "_id status _diag address start price priceHT revenueHT diagRemunerationHT diags",
                            __populate: {
                                _diag: "firstName lastName"
                            },
                            __rules: {
                                status: {
                                    $in: ['prepaid', 'delivered']
                                },
                                start: {
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
                                        start: r.momentDateTime(d.start),
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

            s.download = (data) => {
                if (data.length == 0) return r.okModal('No results');
                r.openConfirm({
                    message: data.length + " items found, extract?",
                    data: {
                        title: "Extract Confirmation for " +
                            moment().month(parseInt(s.reports.input.month)).format('MMMM')
                    }
                }, () => {
                    $U.downloadContent($U.toCSV({
                        data: data
                    }), s.reports.orders.monthReportFilename);
                })
            }


        }
    ]);
})();
/*global angular*/
/*global moment*/
/*global _*/
/*global $U*/
/*global $D*/

(function() {
    var app = angular.module('app.order', []);

    app.controller('adminOrders', [

        'server', '$scope', '$rootScope', 'focus',
        function(db, s, r, focus) {
            window.s = s;
            s.focus = focus;
            r.toggleNavbar(true);
            r.secureSection(s);
            s.selectedItems = [];
            s.items = [];
            //

            //
            if (r.userIs(['diag', 'client'])) {
                return r.handleSecurityRouteViolation();
            }
            //
            s.click = function(item) {
                r.routeParams({
                    prevRoute: 'orders'
                });
                r.route('orders/edit/' + item._id);
            };
            s.create = function() {
                r.route('orders/edit/-1');
            };
            s.select = function() {
                if (window.event) {
                    window.event.stopPropagation();
                }
            };
            s.syncStripe = () => {
                db.ctrl('Order', 'syncStripe'); //async 
                setTimeout(read, 5000);
                setTimeout(read, 20000);
            };

            function read() {
                //r.infoMessage('Loading . . .');
                db.custom('order', 'getAll', {
                    __populate: {
                        '_client': 'email',
                        '_diag': 'email commission ',
                        __select: "address start end status created"
                    }
                }).then(function(r) {
                    //                console.info('adminOrders:read:success', r.data.result);
                    r.data.result = _.orderBy(r.data.result, ['created'], ['desc']);
                    s.items = r.data.result;



                    r.successMessage('Loaded', 1000);
                });
            }
            s.refresh = read;

            r.dom(read, 0);

        }
    ]);

    app.controller('adminOrdersEdit', [

        'server', '$scope', '$rootScope', '$routeParams', 'focus', 'diagSlots', '$log', 'orderPrice',
        function(db, s, r, params, focus, diagSlots, $log, orderPrice) {
            r.setCurrentCtrl(s);


            /*PDF LOGIC*/
            s.pdf = {
                file: null
            };
            s.pdfDownload = (code) => {
                window.open(db.URL() + '/File/get/' + s.item.files[code]._id, '_newtab');
            };
            s.pdfExists = (code) => s.item && s.item.files && s.item.files[code] !== undefined;
            s.pdfDelete = (code) => {
                if (!s.pdfExists(code)) return;
                var name = s.item.files[code] && s.item.files[code].filename || "File";
                s.confirm('Delete ' + name + ' ?', () => {
                    db.ctrl('File', 'remove', {
                        _id: s.item.files[code]._id
                    }).then((d) => {
                        if (d.ok) {
                            delete s.item.files[code];
                            s.pdfCheck();
                        }
                    });
                });
            };
            s.pdfChange = (diagCode) => {
                if (s.item && s.item.end && moment(s.item.end).isAfter(moment())) {
                    s.pdf = {};
                    r.dom();
                    return r.infoMessage("Ajouter après " + moment(s.item.end).format('dddd DD [de] MMMM YY'), 5000);
                } else {
                    r.dom(function() {
                        s.pdfSave(diagCode);
                    }, 1000);
                }
            };
            s.pdfAllPdfUploaded = () => {
                for (var x in s.item.diags) {
                    if (s.item.diags[x] == true) {
                        if (s.item.files && s.item.files[x] && s.item.files[x]._id) {

                        } else {
                            return false;
                        }
                    }
                }
                return true;
            };
            s.pdfSaveSuccess = () => {
                if (s.item.status == 'prepaid' && s.pdfAllPdfUploaded()) {
                    console.warn('every pdf was uploaded. Turning order to completed.');
                    s.item.status = 'completed';
                }
            };
            s.pdfSave = (code) => {
                if (!code) {
                    return console.warn('pdfSave code required');
                }
                if (!s.pdf[code]) {
                    return r.warningMessage("Un fichier requis", 5000);
                }
                if (s.pdf[code].type !== 'application/pdf') {
                    return r.warningMessage("Format pdf nécessaire", 5000);
                }
                if (s.pdf[code].size / 1000 > 1624) {
                    return r.warningMessage("Limite 1.5mb pour le fichier pdf", 5000);
                }

                s.item.files = s.item.files || {};

                function _deletePrev(prevID) {
                    if (prevID) {
                        db.ctrl('File', 'remove', {
                            _id: prevID
                        });
                        console.log('pdf delete prev', prevID);
                    }
                }
                var prevID = s.item.files[code] && s.item.files[code]._id;

                _uploadNew(); //starts here

                function _uploadNew() {
                    r.infoMessage('Patientez, le chargement est en cours', 99999);
                    db.form('File/save/', {
                        name: s.pdf[code].name,
                        file: s.pdf[code]
                    }).then((data) => {
                        //console.info('INFO', data);
                        if (data.ok) {
                            s.item.files[code] = data.result;

                            s.pdfSaveSuccess();

                            db.ctrl('Order', 'update', {
                                _id: s.item._id,
                                files: s.item.files,
                                status: s.item.status
                            }).then(data => {
                                _deletePrev(prevID);
                                //_readFile();
                                read(s.item._id);
                                r.infoMessage('File upload success.', 5000);
                            });
                        } else {
                            r.warningMessage('Upload fail, try later.', 9999);
                        }
                    });
                }
            };

            s.pdfCheck = () => {
                if (!s.item) return;
                if (s.item && !s.item.files) return;
                if (s.item && s.item.files && Object.keys(s.item.files).length == 0) return;


                var cbHell = $U.cbHell(Object.keys(s.item.files).length, () => {
                    db.ctrl('Order', 'update', {
                        _id: s.item._id,
                        files: s.item.files
                    });
                    console.log('pdf check complete');
                });

                var file = null;
                for (var code in s.item.files) {
                    file = s.item.files[code];
                    if (!file) {
                        cbHell.next();
                    } else {
                        if (!file._id) {
                            console.warn('checking file, _id expected. Code its ', code);
                            delete s.item.files[code];
                            cbHell.next();
                        } else {
                            db.ctrl('File', 'find', {
                                _id: file._id
                            }).then(res => {
                                var r = res.ok && res.result;
                                if (!r) {
                                    delete s.item.files[code];
                                }
                                cbHell.next();
                            });
                        }
                    }
                }
            };



            s.pdfReset = {};
            s.item = {};

            s.afterRead = [];

            function init() {
                r.toggleNavbar(true);

                if (window.location.href.indexOf('orders/view') !== -1) {

                    s.afterRead.push(() => {
                        if (!s.isPaid()) {
                            s.pay(); //ASD
                        }
                    });

                    //no login needed
                    if (r.params && r.params.prevRoute) {

                    } else {
                        r.toggleNavbar(true);
                        r.__hideNavMenu = true;
                        $U.once('route-exit:' + $U.url.hashName(), function(url) {
                            r.__hideNavMenu = false;
                        });
                    }
                } else {
                    r.secureSection(s);
                }

                //

                //
                r.dom();
                //
                setHelpers();
                setDefaults();
                setBindings();
                setActions();
                $U.whenProperties(s, ['diags'], [setDefaultsDiags]);
                //
                if (params && params.id && params.id.toString() !== '-1') {
                    r.dom(read, 0);
                } else {
                    reset();
                }
            }

            function autoPay() {
                if (window.location.href.indexOf('orders/view') === -1) return;
                if (s.pay && $U.getParameterByName('pay') === '1') {
                    if (s.item && !_.includes(['prepaid', 'completed'], s.item.status)) {
                        s.pay();
                    }
                }
            }

            function diagNameConvertion(key) {
                return $D.diagNameConvertion(key);
            }

            function setHelpers() {

                s.diagNameConvertion = diagNameConvertion;

                s.diagSlots = diagSlots(s, s.item);

                s.__rdvInit = false;

                s.__isSlotSelectionActivatedManually = false;

                function hasSlotSelectionActivatedManually() {
                    return s.__isSlotSelectionActivatedManually == true;
                }
                s.activateSlotSelectionManually = function() {
                    r.dom(function() {
                        s.__isSlotSelectionActivatedManually = true;
                    });
                };
                s.isRDVSelectButtonActivated = function() {
                    return s.item._id && r.userIs('admin') && !hasSlotSelectionActivatedManually() && !s.rdvConditions();
                };

                function hasSlotSelectionActivatedManualyByAdmin() {
                    return r.userIs('admin') && hasSlotSelectionActivatedManually();
                }


                s.rdvConditions = () => {
                    if (s.item._id && !hasSlotSelectionActivatedManualyByAdmin()) return false;
                    if (!s.item.info) return false;
                    var rta = s.item.info.squareMeters !== undefined && s.item._client !== undefined;
                    if (rta && !s.__rdvInit) {
                        s.__rdvInit = true;
                        s.diagSlots.init();
                    }
                    return rta;
                };



                s.viewPDF = () => {
                    $D.getInvoiceHTMLContent(db, s.item, r, function(html) {
                        html =
                            window.encodeURIComponent(
                                $D.OrderReplaceHTML(window.decodeURIComponent(html), s.item, r));

                        r.ws.ctrl("Pdf", "view", {
                            html: html
                        }).then(res => {
                            if (res.ok) {
                                var win = window.open(res.result, '_blank');
                                win.focus();
                            } else {
                                res.warningMessage('Server Issue, try later.');
                            }
                        });
                    });
                };

                s.delegate = () => {
                    s.item.notifications = s.item.notifications || {};
                    ////LANDLORD//#1 OK app.order
                    if (s.item.notifications.LANDLORD_ORDER_PAYMENT_DELEGATED) {
                        r.openConfirm({
                            message: "Already sended, send again?"
                        }, () => {

                            s.item.notifications.LANDLORD_ORDER_PAYMENT_DELEGATED = false;
                            db.ctrl('Order', 'update', {
                                _id: s.item._id,
                                notifications: s.item.notifications
                            }).then(res => {
                                s.sendPaymentLink();
                            })


                        });
                    } else {
                        s.sendPaymentLink();
                    }
                };

                s.dateSlotSelected = function(rng) {
                    return (s.item.start && (s.item.start == rng.start));
                }

                s.drawRange = function(rng) {
                    var rta = moment(rng.start).format("HH[h]mm");
                    rta += ' - ' + rng.price + ' €';
                    return rta;
                };


                s.hasUserSelectedAnRDVSlot = false;

                s.unwrapRange = (range) => {
                    //var data = JSON.parse(window.atob(range));
                    var data = range;

                    s.item.start = data.start;
                    s.item.end = data.end;
                    //

                    var _newPriceQuote = orderPrice.getPriceTTC();
                    if (s.item._id && _newPriceQuote !== undefined && _newPriceQuote > s.item.price) {
                        s.infoMsg("Original price will be keeped. New price " + _newPriceQuote + "EUR is higher and will be ignored.");
                        $log.debug('Original price was keeped due to higher price in new price quote.');
                        return;
                    }

                    s.applyTotalPrice();
                    s.hasUserSelectedAnRDVSlot = true;
                };

                s.infoItemShow = function(item) {
                    return typeof item == 'boolean';
                };

                s.canWriteAgency = () => {
                    if (!s.item._id) {
                        return r.userIs('admin');
                    }
                    return r.userIs(['admin']) || (r.session()._id == s.item._client._id && _.includes(['agency', 'other'], s.item._client.clientType));
                };
                s.canWriteDiag = () => {
                    if (!s.item._id) {
                        return false
                    }
                    return r.userIs(['admin']) || r.sesison()._id == s.item._diag._id;
                };

                /*
                                s.diagPrice = () => {
                                    if (!s.item.price) return 0;
                                    if (isNaN(s.item.price)) return 0;
                                    return (s.item.price - (s.item.price * 0.12)) * 0.30;
                                };
                                */

                s.isPaid = () => {
                    return _.includes(['prepaid', 'completed'], s.item.status);
                };

                s.isDiag = () => {
                    if (!s.item._id) return false;
                    return r.userIs('diag') && r.session()._id == s.item._diag._id;
                };

                s.isOwner = () => {
                    if (!s.item || !s.item._client) return false;
                    return s.item._client.clientType === 'landlord';
                };

                s.successMsg = (msg) => {
                    r.message(msg, {
                        type: 'success',
                        duration: 10000
                    });
                }
                s.infoMsg = (msg) => {
                    r.message(msg, {
                        duration: 5000,
                        type: 'info'
                    });
                }

                s.currentClientType = () =>
                    s.item && s.item._client && '(' + s.item._client.clientType + ')' || '';

                /*
                                s.subTotal = () => $D.subTotal(s.item, s.diags, s.basePrice);
                                s.sizePrice = () => $D.sizePrice(s.item, s.diags, s.squareMetersPrice, s.basePrice);
                                s.totalPrice = (showRounded) => $D.totalPrice(showRounded, s.item, s.diags, s.squareMetersPrice, s.basePrice, {
                                    overwriteModel: false,
                                    s: s,
                                    r: r
                                        //with the scope, a priceInfo object is created to debug price calc.
                                });
                                */

                s.totalTime = () => $D.OrderTotalTime(s.item.diags, s.diags);

                var _totalTimeFormatedDate = moment();
                s.totalTimeFormated = () => {
                    if (!s.item.diags || !s.diags) return '';
                    var t = $D.OrderTotalTime(s.item.diags, s.diags);
                    var m = _totalTimeFormatedDate.hours(t.hours).minutes(t.minutes).format('HH:mm');
                    return m;
                };

                s.orderDescription = () => {
                    var d = $D.createOrderDescription(s.item);
                    s.item.info.description = d;
                    return d;
                };

                s.applyTotalPrice = () => {
                    orderPrice.set({
                        date: s.item.start,
                        diagCommissionRate: s.item._diag && s.item._diag.commission
                    });
                    orderPrice.assignPrices(s.item);
                    r.dom();
                };
                s.applyTotalTime = () => {
                    var t = $D.OrderTotalTime(s.item.diags, s.diags);
                    if (s.item && s.item.start) {
                        s.item.end = moment(s.item.start)
                            .add(t.hours, 'hours').add(t.minutes, 'minutes')._d;
                        r.dom();
                    }
                };

                s.type = r.session().userType;
                s.is = (arr) => _.includes(arr, s.type);
                s.focus = focus;
                window.s = s;
            }



            function setDefaults() {
                window.Object.assign(s.item, {
                    email: '',
                    password: '',
                    status: 'created',
                    start: moment().add(1, 'day').hour(9).minutes(0).toDate(),
                    end: moment().add(1, 'day').hour(10).minutes(30).toDate(),
                    fastDiagComm: 0,
                    price: 0,
                    diags: {},
                    info: {
                        sell: false,
                        house: false,
                        squareMeters: undefined,
                        constructionPermissionDate: undefined
                    }
                });
                s.original = _.clone(s.item);
            }

            function setDefaultsDiags() {
                s.item.diags = s.item.diags || {};
                s.diags.forEach(function(val, key) {
                    s.item.diags[val.name] = (val.mandatory) ? true : false;
                });
            }


            function setBindings() {

                db.ctrl('Settings', 'getAll', {}).then(d => {
                    if (d.ok && d.result.length > 0) s.settings = d.result[0];
                });

                s.$watch('item.start', (v) => {
                    s.item.date = v; //fallback for total price calculation.
                });



                s.$watch('item._diag', (v) => {
                    if (s.diagSlots) {
                        s.diagSlots.setDiag(s.item._diag);
                    }
                });

                db.localData().then(function(data) {
                    $log.debug('order localData basePrice is', data.basePrice);
                    Object.assign(s, data);

                    s.diags.forEach((diag) => {
                        diag.show = true;
                    });
                });
                //

                s.CLIENT_TYPES = ['agency', 'enterprise', 'landlord', 'other'];
                s.CLIENT_TYPES_COMPANY = ['agency', 'enterprise', 'other'];

                //KEYS WHERE Version2 --------------------------------
                s.isOrderClientLandLord = () => {
                    if (!s.item || !s.item._client || !s.item._client.clientType) return true;
                    //
                    return !_.includes(s.CLIENT_TYPES_COMPANY, s.item._client.clientType);
                }
                s.isOrderClientAgency = () => {
                    return !s.isOrderClientLandLord();
                };



                s.__keysWhereItems = {};
                s.__keysWhereGetItems = () => {
                    if (!s.item._client || !s.item._client.clientType) return {
                        'Ou ?': () => '',
                    };
                    if (s.isOrderClientLandLord()) {
                        return {
                            'Ou ?': () => '',
                            'Diag Address': () => s.item.address,
                            'Client Address': () => s.item._client.address, //when landlord
                            'Other': () => 'other'
                        };
                    } else {
                        return {
                            'Ou ?': () => '',
                            'Diag Address': () => s.item.address,
                            'Agency Address': () => s.item._client.address, //when not-landlord
                            'Landlord Address': () => s.item.landLordAddress, //when not-landlord 
                            'Other': () => 'other'
                        };
                    }
                };
                s.$watch('item', function(val) {
                    s.__keysWhereItems = s.__keysWhereGetItems();
                }, true);
                s.__keysWhereSelectFirstItem = () => s.__keysWhereItems && Object.keys(s.__keysWhereItems)[0] || "Loading";
                s.__keysWhereSelectLabel = () => s.__keysWhereSelectLabelVal || s.__keysWhereSelectFirstItem();
                s.__keysWhereSelect = (key, val) => {
                    $log.debug(val);
                    s.item.keysWhere = val && val() || undefined;
                };

                function watchKeysWhere() {
                    s.$watch('item.keysWhere', function(val) {
                        if (s.item._id) return;
                        if (val == undefined) {
                            return s.__keysWhereSelectLabelVal = 'Ou ?';
                        }
                        Object.keys(s.__keysWhereItems).forEach(k => {
                            if (s.__keysWhereItems[k]() == val) {
                                s.__keysWhereSelectLabelVal = k;
                            }
                        });
                        s.item.keysAddress = (val == 'other') ? '' : val;
                    });
                }

                if (params.id.toString() == '-1') {
                    watchKeysWhere();
                } else {
                    s.afterRead.push(watchKeysWhere);
                }



                //KEYS TIME FROM ------------------------------------------------------------------------------------------------
                s.__keysTimeFromItems = {};
                s.__keysTimeFromGetItems = () => {
                    var vals = {};
                    if (!s.item) return vals;
                    var m = moment(s.item.start).hours(8);
                    while (m.isBefore(moment(s.item.start))) {
                        vals[r.momentTime(m)] = new Date(m.toString());
                        m = m.add(5, 'minutes');
                    };
                    vals[r.momentTime(s.item.start)] = new Date(moment(s.item.start).toString());
                    return vals;
                };
                s.__keysTimeFromSelectFirstItem = () => s.__keysTimeFromItems && Object.keys(s.__keysTimeFromItems)[0] || "Loading";
                s.__keysTimeFromSelectLabel = 'choisir';
                s.__keysTimeFromSelect = (key, val) => {
                    s.item.keysTimeFrom = val;
                    if (dtAfter(s.item.keysTimeFrom, s.item.keysTimeTo)) {
                        s.item.keysTimeTo = undefined;
                    }
                };
                s.$watch('item.keysTimeFrom', function(val) {
                    if (!val) {
                        s.__keysTimeFromSelectLabel = 'choisir';
                    } else {
                        if (s.item._id) {
                            return s.__keysTimeFromSelectLabel = r.momentTime(s.item.keysTimeFrom);
                        }
                        s.__keysTimeFromSelectLabel = 'choisir';
                        _.each(s.__keysTimeFromItems, (v, k) => {
                            if (v == val) s.__keysTimeFromSelectLabel = k;
                        });
                    }

                });
                s.$watch('item.start', function(val) {
                    s.__keysTimeFromItems = s.__keysTimeFromGetItems();
                });

                //KEYS TIME TO ------------------------------------------------------------------------------------------------
                s.__keysTimeToItems = {};
                s.__keysTimeToGetItems = () => {
                    var vals = {};
                    if (!s.item) return vals;
                    var m = moment(s.item.start).hours(8).minutes(0);
                    if (
                        moment(s.item.keysTimeFrom).isAfter(m) &&
                        moment(s.item.keysTimeFrom).isBefore(moment(s.item.start))
                    ) {
                        m = m.hours(moment(s.item.keysTimeFrom).hours())
                        m = m.minutes(moment(s.item.keysTimeFrom).minutes())
                    }

                    while (m.isBefore(moment(s.item.start))) {
                        vals[r.momentTime(m)] = new Date(m.toString());
                        m = m.add(5, 'minutes');
                    };
                    vals[r.momentTime(s.item.start)] = new Date(moment(s.item.start).toString());
                    return vals;
                };
                s.__keysTimeToSelectFirstItem = () => s.__keysTimeToItems && Object.keys(s.__keysTimeToItems)[0] || "Loading";
                s.__keysTimeToSelectLabel = 'choisir';
                s.__keysTimeToSelect = (key, val) => {
                    s.item.keysTimeTo = val;
                };
                s.$watch('item.keysTimeTo', function(val) {
                    if (!val) {
                        s.__keysTimeToSelectLabel = 'choisir';
                    } else {
                        if (s.item._id) {
                            return s.__keysTimeToSelectLabel = r.momentTime(s.item.keysTimeTo);
                        }
                        s.__keysTimeToSelectLabel = 'choisir';
                        _.each(s.__keysTimeToItems, (v, k) => {
                            if (v == val) s.__keysTimeToSelectLabel = k;
                        });
                    }

                });
                s.$watch('item.keysTimeFrom', function(val) {
                    s.__keysTimeToItems = s.__keysTimeToGetItems();
                });
                s.$watch('item.start', function(val) {
                    s.__keysTimeToItems = s.__keysTimeToGetItems();
                });
                //-------------------------------------------------------------------------


                function dtAfter(d1, d2, unit) {
                    return moment(d1).isAfter(moment(d2), unit);
                }

                function dtBefore(d1, d2, unit) {
                    return moment(d1).isAfter(moment(d2), unit);
                }



                //
                s.datepicker = {
                    minDate: moment().toDate(), //.add(1, 'day') //today!
                    maxDate: moment().add(60, 'day').toDate(),
                    initDate: new Date()
                };
                //
                s.noResults = "No results found";
                s.LoadingClients = "Loading Clients";
                s.getClients = function(val) {
                    return db.http('User', 'getAll', {
                        userType: 'client',
                        __regexp: {
                            email: val
                        }
                    }).then(function(res) {
                        return res.data.result;
                    });
                };
                s.getDiags = function(val) {
                    return db.http('User', 'getAll', {
                        userType: 'diag',
                        __rules: {
                            disabled: {
                                $ne: true
                            },
                        },
                        __regexp: {
                            email: val
                        }
                    }).then(function(res) {
                        return res.data.result;
                    });
                };


                s.start = $D.createDateTimePickerData();
                s.end = $D.createDateTimePickerData();
                s.status = $D.createSelect({
                    scope: s,
                    model: 'item.status',
                    label: '(Select an status)',
                    items: ['Ordered', 'Prepaid', 'Delivered', 'Completed'],
                    change: (selected) => {
                        s.item.status = selected.toString().toLowerCase();
                        r.dom();
                    }
                });
            }

            function setActions() {


                s.sendPaymentLink = (cb) => {

                    $U.ifThenMessage([
                        [!s.item.landLordEmail, '==', true, "Landlord Email required."],
                        [!s.item.landLordFullName, '==', true, "Landlord Name required."],
                    ], (m) => {
                        if (typeof m[0] !== 'string') {
                            r.warningMessage(m[0]());
                        } else {
                            r.warningMessage(m[0]);
                        }
                    }, _sendPaymentLink);



                    function _sendPaymentLink() {
                        s.confirm({
                            message: 'You want to send a payment link to ' + s.item.landLordEmail + ' ?',
                            templateUrl: 'views/directives/modal.yes-not-now.html'
                        }, () => {
                            s.infoMsg("Sending email.");

                            $D.getInvoiceHTMLContent(db, s.item, r, html => {
                                db.ctrl('Notification', 'LANDLORD_ORDER_PAYMENT_DELEGATED', {
                                    _user: s.item._client,
                                    _order: s.item,
                                    attachmentPDFHTML: html
                                }).then(data => {

                                    if (s.item.status == 'created') {
                                        s.item.status = 'ordered';
                                        db.ctrl('Order', 'update', s.item);
                                    }


                                    s.infoMsg("Email sended.");
                                    if (cb) cb();
                                });
                            });


                        });
                    }
                };

                s.pay = () => {
                    var order = s.item;
                    $D.openStripeModalPayOrder(order, (token) => {
                        order.stripeToken = token.id;
                        db.ctrl('Order', 'pay', order).then((data) => {
                            if (data.ok) {
                                s.item.status = (s.item === 'delivered') ? 'completed' : 'prepaid';
                                s.successMsg('Commande payée');



                                r.dom(read, 5000);
                            } else {
                                s.successMsg('There was a server error, try later.', 'warning');
                                console.info('PAY-FAIL', data.err);
                            }
                        });
                    }, {
                        config: r.config,
                        email: emailOfPersonWhoPaid()
                    });
                };


                function emailOfPersonWhoPaid() {
                    var session = r.session();
                    if (session && session._id == s.item._client._id) {
                        return s.item._client.email;
                    } else {
                        return s.item.landLordEmail || s.item._client.email || '';
                    }
                }



                s.back = () => {
                    if (s.is(['diag', 'client'])) {
                        r.route('dashboard');
                    } else {
                        if (r.params && r.params.prevRoute) {
                            return r.route(r.params.prevRoute);
                        } else {
                            r.route('orders');
                        }

                    }
                }
                s.cancel = function() {
                    s.back();
                };



                s.mm = (d) => moment(d).minutes();
                s.mmOK = (d) => _.includes([0, 30], s.mm(d));

                s.validate = () => {
                    $U.ifThenMessage([
                        [typeof s.item._client, '!=', 'object', "Client required"],
                        [typeof s.item._diag, '!=', 'object', "Diag Man required"],
                        [_.isUndefined(s.item.address) || _.isNull(s.item.address) || s.item.address === '', '==', true, 'Address required'],
                        [!s.item.start, '==', true, 'start date est requis'],
                        [!s.item.end, '==', true, 'end date est requis'],
                        [moment(s.item.start || null).isValid(), '==', false, "start date invalide"],
                        [moment(s.item.end || null).isValid(), '==', false, "end date invalide"],

                        [s.isOrderClientAgency() && !s.item.landLordEmail, '==', true, "E-mail du propriétaire requis"],
                        [s.isOrderClientAgency() && !s.item.landLordFullName, '==', true, "Nom du propriétaire requis"],
                        [!s.item.keysAddress, '==', true, 'Clés Adresse requise'],
                        [!s.item.keysTimeFrom, '==', true, 'Clés Temps "De" requis'],
                        [!s.item.keysTimeTo, '==', true, 'Clés Temps "To" requis'],

                        //[s.mmOK(s.item.start), '==', false, "start date minutes need to be 0 or 30."],
                        //[s.mmOK(s.item.end), '==', false, "End date minutes need to be 0 or 30."],

                        [moment(s.item.end).isValid() && moment(s.item.start).isValid() && !moment(s.item.end).isSame(moment(s.item.start), 'day'), '==', true, 'Start / End dates need to be in the same day.'],
                        [moment(s.item.end).isValid() && moment(s.item.end).isBefore(moment(s.item.start), 'hour'), '==', true, 'End date cannot be lower than Start date'],

                        //  [s.keysWhereTime.invalidKeysTime(), '==', true, s.keysWhereTime.invalidKeysTimeMessage],

                        //[s.item.fastDiagComm.toString(),'==','','Comission required'],
                        [isNaN(s.item.fastDiagComm), '==', true, 'Comission need to be a number'],
                        //[s.item.price.toString(),'==','','Price required'],
                        [isNaN(s.item.price), '==', true, 'Price need to be a number'],
                        [s.item.status, '==', '', 'Status required']
                    ], (m) => {
                        if (typeof m[0] !== 'string') {
                            r.warningMessage(m[0]());
                        } else {
                            r.warningMessage(m[0]);
                        }
                    }, s.save);
                };



                function reEnableNotifications() {
                    s.item.notifications = s.item.notifications || {};
                    $log.debug('diag change, notifications re-sended.');
                    s.item.notifications.ADMIN_ORDER_PAYMENT_SUCCESS = false;
                    s.item.notifications.ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS = false;
                    s.item.notifications.CLIENT_ORDER_PAYMENT_SUCCESS = false;
                    s.item.notifications.DIAG_NEW_RDV = false;
                    if (s.item.notifications.LANDLORD_ORDER_PAYMENT_SUCCESS !== undefined) {
                        s.item.notifications.LANDLORD_ORDER_PAYMENT_SUCCESS = false;
                    }
                }

                s.save = function(opt) {


                    //on diag change, notifications are re-sended
                    if (!opt || opt && opt.assignDiagFeature !== true) {
                        if (s.prevItem && s.prevItem._diag && s.prevItem._diag.email && s.item._diag && s.item._diag.email && s.prevItem._diag.email != s.item._diag.email) {
                            var msg = "Manually assign of diagnostiqueur " + s.item._diag.firstName + ' ' + s.item._diag.lastName + ' will trigger notifications again. Please confirm. ';
                            s.confirm(msg, () => {
                                reEnableNotifications();
                                s.save(Object.assign(opt || {}, {
                                    assignDiagFeature: true
                                }));
                            });
                            return;
                        }
                    }

                    if (!opt || opt.assignNewRDVSlot !== true) {
                        if (s.item._id && s.hasUserSelectedAnRDVSlot) {
                            s.confirm('Manually assign of RDV slot may change diagnostiqueur, date and price and will trigger notifications again. Please Confirm. ', () => {
                                reEnableNotifications();
                                s.save(Object.assign(opt || {}, {
                                    assignNewRDVSlot: true
                                }));
                            });
                            return;
                        }

                    }

                    db.ctrl('Order', 'save', s.item).then(function(res) {

                        if (res.ok) {

                            if (s.item.notifications && s.item.notifications.LANDLORD_ORDER_PAYMENT_DELEGATED == true) {
                                r.infoMessage('Changes saved');
                                s.back();
                            } else {
                                s.item._id = res.result._id;

                                if (s.isOrderClientLandLord()) {
                                    s.back();
                                } else {
                                    s.sendPaymentLink(() => {
                                        s.back();
                                    });
                                }

                                r.infoMessage('Changes saved');
                            }



                        } else {
                            handleError(res);
                        }
                    }).error(handleError);
                };
                s.downloadFile = () => {
                    if (!s.item.pdfId) {
                        return r.warningMessage("File required", 5000);
                    } else {
                        window.open(db.URL() + '/File/get/' + s.item.pdfId, '_newtab');
                    }
                };

                s.deletePDF = () => {
                    if (!s.pdfFileInfo) {
                        return console.warn('s.pdfFileInfo expected.');
                    }
                    s.confirm('Delete ' + s.pdfFileInfo.filename + ' ?', () => {
                        db.ctrl('File', 'remove', {
                            _id: s.pdfFileInfo._id
                        }).then((d) => {
                            if (d.ok) {
                                s.item.pdfId = null;
                                db.ctrl('Order', 'update', {
                                    _id: s.item._id,
                                    pdfId: s.item.pdfId
                                });
                                r.dom();
                            }
                        });
                    });
                };



                s.delete = function() {

                    if (!_.includes(['ordered', 'created'], s.item.status)) {
                        s.okModal({
                            message: "You can't delete an Order with the follow status: delivered, prepaid or completed.",
                            data: {
                                title: 'Delete Info'
                            }
                        });
                        return;
                    }

                    var time = (d) => moment(d).format('HH:mm');
                    var descr = s.item.address + ' (' + time(s.item.start) + ' - ' + time(s.item.end) + ')';
                    s.confirm('Delete Order ' + descr + ' ?', function() {
                        // s.message('deleting . . .', 'info');

                        db.ctrl('Order', 'remove', {
                            _id: s.item._id
                        }).then(function(data) {

                            if (data.ok) {
                                //s.message('deleted', 'info');
                                s.back();
                            } else {
                                handleError(data);
                            }
                        }).error(handleError);
                    });
                };
            }

            function handleError(er) {
                s.warningMessage("Problème technique. S&#39il vous plaît réessayer plus tard");
            }

            function reset() {
                s.item = _.clone(s.original);
            }

            function _readFile() {

                if (s.item.pdfId) {
                    console.info('_readFile');
                    db.ctrl('File', 'find', {
                        _id: s.item.pdfId
                    }).then(data => {
                        console.info(data);
                        if (data.ok) {
                            s.pdfFileInfo = (data.result.length && data.result.length > 0 && data.result[0]) || data.result;
                        }
                    });
                }
            }


            function read(id) {
                if (r.params && r.params.item && r.params.item._diag) {
                    s.item = r.params.item; //partial loading
                    delete r.params.item;
                }

                //s.message('loading . . .', 'info');

                db.ctrl('Order', 'get', {
                    _id: id || params.id || s.item._id,
                    __populate: {
                        '_client': 'email clientType address discount firstName lastName',
                        '_diag': 'email address commission firstName lastName'
                    }
                }).then(function(data) {

                    if (data.ok && data.result !== null) {
                        data.result = Object.assign(data.result, {
                            start: new Date(data.result.start),
                            end: new Date(data.result.end)
                        });

                        s.prevItem = s.prevItem || null;
                        s.prevItem = _.clone(s.item);
                        s.item = data.result;

                        if (!s.prevItem) s.prevItem = s.item;

                        if (s.afterRead && s.afterRead.forEach) {
                            s.afterRead.forEach(cb => cb());
                        }

                        autoPay();
                        // _readFile();
                        s.pdfCheck();
                        //                    console.info('READ', s.item);
                        //s.message('Loaded', 'success', 2000);
                    } else {
                        handleError(data);
                    }
                }).error(handleError);
            }

            init();
        }
    ]);



    app.directive('ordersList', function(
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
                    dbPaginate = $mongoosePaginate.get('Order');
                $U.expose('s', s);
                s.title = "";
                r.routeParams({
                    prevRoute: 'orders'
                });

                s.syncStripe = () => {
                    db.ctrl('Order', 'syncStripe'); //async 
                    setTimeout(update, 10000);
                };



                function update(items, cb) {
                    var data = {
                        __select: "_client _diag address start end price status created createdAt",
                        __populate: {
                            '_client': 'email',
                            '_diag': 'email'
                        },
                        __sort: "-createdAt",

                    };

                    r.dom(_apply);

                    function _apply() {
                        //
                        data = Object.assign(data, s.model.filter.payload || {});
                        //
                        dbPaginate.ctrl(data, s.model).then(res => {
                            if (cb) {
                                cb(res.result);
                            } else {
                                s.model.update(res.result, null);
                            }
                        });
                    }
                }
                s.model = {
                    init: () => s.model.filter.firstTime(),
                    months: () => {
                        return moment.monthsShort().map((m, k) => k + 1 + ' - ' + m);
                    },
                    filter: {
                        template: 'ordersFilter',
                        update: update,
                        rules: {
                            status: 'awesome-in',
                            createdAt: 'month-range',
                            start: 'month-range',
                            deliveredAt: 'month-range',
                        }
                    },
                    pagination: {
                        itemsPerPage: 10
                    },
                    paginate: (cb) => {
                        update(null, cb)
                    },
                    click: (item, index) => {
                        r.routeParams({
                            item: item,
                        });
                        r.route('orders/edit/' + item._id);
                    },
                    buttons: [{
                        label: "Rafraîchir",
                        type: () => "btn diags-btn bg-azure-radiance margin-left-0 margin-right-1",
                        click: () => update()
                    }, {
                        label: "Créer",
                        type: () => "btn diags-btn bg-azure-radiance margin-right-1",
                        click: () => r.route('orders/edit/-1')
                    }, {
                        label: "Sync payments",
                        show: false,
                        type: () => "btn diags-btn bg-azure-radiance margin-right-1",
                        click: () => s.syncStripe()
                    }],
                    columns: [{
                        label: "Diag",
                        name: '_diag',
                        format: (v, item) => item._diag.email
                    }, {
                        label: "Client",
                        name: '_client',
                        format: (v, item) => item._client.email
                    }, {
                        label: "Adresse",
                        name: 'address'
                    }, {
                        label: "When",
                        name: "start",
                        format: (v, item) => r.momentFormat(item.start, 'DD-MM-YY')
                    }, {
                        label: "Hour",
                        name: "start",
                        format: (v, item) => r.momentTime(item.start) + ' - ' + r.momentTime(item.end)
                    }, {
                        label: 'Price',
                        name: 'price'
                    }, {
                        label: 'Statut',
                        name: 'status'
                    }, {
                        label: 'Created',
                        name: 'createdAt',
                        format: (v, item) => {
                            return r.momentFormat(item.createdAt, 'DD-MM-YY HH:mm');
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


})();
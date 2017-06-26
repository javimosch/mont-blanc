(function() {
    /*global angular*/
    /*global moment*/
    /*global _*/
    /*global $U*/
    /*global $D*/
    angular.module('order-feature-module').controller('adminOrdersEdit', [

        'server', '$scope', '$rootScope', '$routeParams', 'rdvSlotService', '$log', 'orderPrice', 'orderQuestion', 'orderRdv', 'orderPaymentForm', 'lemonwayApi', 'localData','orderHelper',
        function(db, $scope, $rootScope, params, rdvSlotService, $log, orderPrice, orderQuestion, orderRdv, orderPaymentForm, lemonwayApi, localData,orderHelper) {
            $rootScope.setCurrentCtrl($scope);


            $scope.orderQuestion = orderQuestion;
            $scope.orderRdv = orderRdv;
            $scope.orderPrice = orderPrice;

            $scope.toggleDiagType = function(key) {
                if ($scope.item._id) return; //edition disabled
                $scope.item.diags[key] = !$scope.item.diags[key];
            };

            $scope.getOrderStatus = () => {
                if ($scope.item && $scope.item.status === 'prepaid' && $scope.item.paymentType === 'cheque' &&
                    $rootScope.userIs('admin')) {
                    return "cheque"
                }
                else {
                    return $scope.item && $scope.item.status;
                }
            };

            /*PDF LOGIC*/
            $scope.pdf = {
                file: null
            };
            $scope.pdfDownload = (code) => {
                window.open(db.URL() + '/File/get/' + $scope.item.files[code]._id, '_newtab');
            };
            $scope.pdfExists = (code) => $scope.item && $scope.item.files && $scope.item.files[code] !== undefined;
            $scope.pdfDelete = (code) => {
                if (!$scope.pdfExists(code)) return;
                var name = $scope.item.files[code] && $scope.item.files[code].filename || "File";
                $rootScope.openConfirm('Delete ' + name + ' ?', () => {
                    db.ctrl('File', 'remove', {
                        _id: $scope.item.files[code]._id
                    }).then((d) => {
                        if (d.ok) {
                            delete $scope.item.files[code];
                            $scope.pdfCheck();
                        }
                    });
                });
            };
            $scope.pdfChange = (diagCode) => {
                if ($scope.item && $scope.item.end && moment($scope.item.end).isAfter(moment())) {
                    $scope.pdf = {};
                    $rootScope.dom();
                    return $rootScope.infoMessage("Ajouter après " + moment($scope.item.end).format('dddd DD [de] MMMM YY'), 5000);
                }
                else {
                    $rootScope.dom(function() {
                        $scope.pdfSave(diagCode);
                    }, 1000);
                }
            };
            $scope.pdfAllPdfUploaded = () => {
                for (var x in $scope.item.diags) {
                    if ($scope.item.diags[x] == true) {
                        if ($scope.item.files && $scope.item.files[x] && $scope.item.files[x]._id) {

                        }
                        else {
                            return false;
                        }
                    }
                }
                return true;
            };

            $scope.moveDateBackward = () => {
                $scope.item.start = moment().subtract(1, 'days');
                $scope.item.end = moment().subtract(1, 'days').add(1, 'hour')
                $rootScope.dom();
            };

            $scope.pdfSaveSuccess = () => {
                if ($scope.item.status == 'prepaid' && $scope.pdfAllPdfUploaded()) {
                    $log.info('every pdf was uploaded. Turning order to completed.');
                    $scope.item.status = 'completed';
                    $scope.save();
                }
            };
            $scope.pdfSave = (code) => {
                if (!code) {
                    return console.warn('pdfSave code required');
                }
                if (!$scope.pdf[code]) {
                    return $rootScope.warningMessage("Un fichier requis", 5000);
                }
                if ($scope.pdf[code].type !== 'application/pdf') {
                    return $rootScope.warningMessage("Format pdf nécessaire", 5000);
                }
                if ($scope.pdf[code].size / 1024 > 10240) {
                    return $rootScope.warningMessage("Limite 10mb pour le fichier pdf", 5000);
                }


                $scope.item.files = $scope.item.files || {};

                function _deletePrev(prevID) {
                    if (prevID) {
                        db.ctrl('File', 'remove', {
                            _id: prevID
                        });
                        console.log('pdf delete prev', prevID);
                    }
                }
                var prevID = $scope.item.files[code] && $scope.item.files[code]._id;

                _uploadNew(); //starts here

                function _uploadNew() {
                    $rootScope.infoMessage('Patientez, le chargement est en cours', 99999);
                    db.form('File/save/', {
                        name: $scope.pdf[code].name,
                        file: $scope.pdf[code]
                    }).then((data) => {
                        //console.info('INFO', data);
                        if (data.ok) {
                            $scope.item.files[code] = data.result;

                            $scope.pdfSaveSuccess();

                            db.ctrl('Order', 'update', {
                                _id: $scope.item._id,
                                files: $scope.item.files,
                                status: $scope.item.status
                            }).then(data => {
                                _deletePrev(prevID);
                                read($scope.item._id);
                                $rootScope.infoMessage('File upload success.', 5000);
                            });
                        }
                        else {
                            $rootScope.warningMessage('Upload fail, try later.', 9999);
                        }
                    });
                }
            };

            $scope.pdfCheck = () => {
                if (!$scope.item) return;
                if ($scope.item && !$scope.item.files) return;
                if ($scope.item && $scope.item.files && Object.keys($scope.item.files).length == 0) return;


                var cbHell = $U.cbHell(Object.keys($scope.item.files).length, () => {
                    db.ctrl('Order', 'update', {
                        _id: $scope.item._id,
                        files: $scope.item.files
                    });
                    console.log('pdf check complete');
                });

                var file = null;
                for (var code in $scope.item.files) {
                    file = $scope.item.files[code];
                    if (!file) {
                        cbHell.next();
                    }
                    else {
                        if (!file._id) {
                            console.warn('checking file, _id expected. Code its ', code);
                            delete $scope.item.files[code];
                            cbHell.next();
                        }
                        else {
                            db.ctrl('File', 'find', {
                                _id: file._id
                            }).then(res => {
                                var findResult = res.ok && res.result;
                                if (!findResult) {
                                    delete $scope.item.files[code];
                                }
                                cbHell.next();
                            });
                        }
                    }
                }
            };



            $scope.pdfReset = {};
            $scope.item = {};



            $scope.afterRead = [fetchTransaction];

            function fetchTransaction() {
                if ($scope.item && $scope.item.walletTransId) {}
                else {
                    return;
                }
                if (!$scope.item._client.wallet) return;

                //lemonwayApi.getWalletTransHistory({})

            }

            function init() {
                $rootScope.toggleNavbar(true);

                if (window.location.href.indexOf('orders/view') !== -1) {

                    $scope.afterRead.push(() => {
                        if (!$scope.isPaid()) {
                            $scope.pay(); //ASD
                        }
                    });

                    //no login needed
                    if ($rootScope.params && $rootScope.params.prevRoute) {

                    }
                    else {
                        $rootScope.toggleNavbar(true);
                        $rootScope.__hideNavMenu = true;
                        $U.once('route-exit:' + $U.url.hashName(), function(url) {
                            $rootScope.__hideNavMenu = false;
                        });
                    }
                }
                else {
                    $rootScope.secureSection($scope);
                }

                //

                //
                $rootScope.dom();
                //
                setHelpers();
                setDefaults();
                setBindings();
                setActions();

                //
                if (params && params.id && params.id.toString() !== '-1') {
                    $rootScope.dom(read, 0);
                }
                else {
                    reset();

                    $log.debug('diag-cards-auto-select');
                    $U.whenProperties($scope, ['diags'], [setDefaultsDiags]);
                    bindAnswersToDefaultDiags();
                }
            }

            function bindAnswersToDefaultDiags() {
                if (!$scope.diags) return setTimeout(bindAnswersToDefaultDiags, 500);
                orderQuestion.bindAnswersToDefaultDiags($scope);
            }

            function autoPay() {
                if (window.location.href.indexOf('orders/view') === -1) return;
                if ($scope.pay && $U.getParameterByName('pay') === '1') {
                    if ($scope.item && !_.includes(['prepaid', 'completed'], $scope.item.status)) {
                        $scope.pay();
                    }
                }
            }

            function diagNameConvertion(key) {
                return $D.diagNameConvertion(key);
            }

            function setHelpers() {

                $scope.diagNameConvertion = diagNameConvertion;

                $scope.diagIcon = (k) => {
                    return "/img/icons/icon_" + k + '.png';
                };

                $scope.diagSlots = rdvSlotService($scope, $scope.item);

                $scope.__rdvInit = false;

                $scope.__isSlotSelectionActivatedManually = false;

                function hasSlotSelectionActivatedManually() {
                    return $scope.__isSlotSelectionActivatedManually == true;
                }
                $scope.activateSlotSelectionManually = function(val) {
                    $rootScope.dom(function() {
                        $scope.__isSlotSelectionActivatedManually = val != undefined && val || true;
                    });
                };
                $scope.isRDVSelectButtonActivated = function() {
                    return $scope.item._id && $rootScope.userIs('admin') && !hasSlotSelectionActivatedManually() && !$scope.rdvConditions();
                };

                function hasSlotSelectionActivatedManualyByAdmin() {
                    return $rootScope.userIs('admin') && hasSlotSelectionActivatedManually();
                }


                $scope.rdvConditions = () => {
                    if ($scope.item._id && !hasSlotSelectionActivatedManualyByAdmin()) return false;
                    if (!$scope.item.info) return false;
                    var rta = $scope.item.info.squareMeters !== undefined && $scope.item._client !== undefined;
                    if (rta && !$scope.__rdvInit) {
                        $scope.__rdvInit = true;

                        var settings = {
                            //department: s.item.
                        };

                        if (hasSlotSelectionActivatedManualyByAdmin()) {
                            settings.maxSlots = 40;
                            //settings.allowFixedAllocation = false;
                        }
                        else {
                            settings.maxSlots = 40;
                        }

                        $scope.diagSlots.init(undefined, settings);
                    }
                    return rta;
                };



                $scope.viewPDF = () => {
                    $D.getInvoiceHTMLContent(db, $scope.item, r, function(html) {
                        html =
                            window.encodeURIComponent(
                                $D.OrderReplaceHTML(window.decodeURIComponent(html), $scope.item, r));

                        $rootScope.ws.ctrl("Pdf", "view", {
                            html: html
                        }).then(res => {
                            if (res.ok) {
                                var win = window.open(res.result, '_blank');
                                win.focus();
                            }
                            else {
                                $rootScope.warningMessage('Server Issue, try late$rootScope.');
                            }
                        });
                    });
                };

                $scope.delegate = () => {
                    $scope.item.notifications = $scope.item.notifications || {};
                    ////LANDLORD//#1 OK app.order
                    if ($scope.item.notifications.LANDLORD_ORDER_PAYMENT_DELEGATED) {
                        $rootScope.openConfirm({
                            message: "Already sended, send again?"
                        }, () => {

                            $scope.item.notifications.LANDLORD_ORDER_PAYMENT_DELEGATED = false;
                            db.ctrl('Order', 'update', {
                                _id: $scope.item._id,
                                notifications: $scope.item.notifications
                            }).then(res => {
                                $scope.sendPaymentLink();
                            })


                        });
                    }
                    else {
                        $scope.sendPaymentLink();
                    }
                };

                $scope.dateSlotSelected = function(rng) {
                    return ($scope.item.start && ($scope.item.start == rng.start));
                }

                $scope.drawRange = function(rng) {
                    var rta = moment(rng.start).format("HH[h]mm");
                    rta += ' - ' + rng.price + ' €';
                    return rta;
                };


                $scope.hasUserSelectedAnRDVSlot = false;

                $scope.unwrapRange = (range) => {
                    //var data = JSON.parse(window.atob(range));
                    var data = range;

                    $scope.item.start = data.start;
                    $scope.item.end = data.end;
                    //

                    orderPrice.set({
                        date: $scope.item.start,
                        diagCommissionRate: $scope.item._diag && $scope.item._diag.commission,
                        diagIsAutoentrepreneur: $scope.item._diag && $scope.item._diag.isAutoentrepreneur
                    });
                    var _newPriceQuote = orderPrice.getPriceTTC();
                    if ($scope.item._id && _newPriceQuote !== undefined) {
                        if (_newPriceQuote > $scope.item.price) {
                            $scope.infoMsg("Original price will be keeped. New price " + _newPriceQuote + "EUR is higher and will be ignored.");
                            //$log.debug('Original price was keeped due to higher price in new price quote.');
                            $scope.item.price = $scope.original.price;
                            return;
                        }

                        if ($scope.item.status !== 'created') {
                            if (_newPriceQuote < $scope.item.price) {
                                $scope.infoMsg("Original price will be keeped. New price " + _newPriceQuote + "EUR is lower but will be ignored because the order is already paid.");
                                //$log.debug('Original price was keeped due to lower price / order-paid rule.');
                                $scope.item.price = $scope.original.price;
                                return;
                            }
                        }

                    }
                    $scope.applyTotalPrice();
                    $scope.hasUserSelectedAnRDVSlot = true;
                };

                $scope.infoItemShow = function(item) {
                    return typeof item == 'boolean';
                };

                $scope.canWriteAgency = () => {
                    if (!$scope.item._id) {
                        return $rootScope.userIs('admin');
                    }
                    return $rootScope.userIs(['admin']) || ($rootScope.session()._id == $scope.item._client._id && _.includes(['agency', 'other'], $scope.item._client.clientType));
                };
                $scope.canWriteDiag = () => {
                    if (!$scope.item._id) {
                        return false
                    }
                    return $rootScope.userIs(['admin']) || $rootScope.sesison()._id == $scope.item._diag._id;
                };

                $scope.isPaid = () => {
                    return _.includes(['prepaid', 'completed'], $scope.item.status);
                };

                $scope.isDiag = () => {
                    if (!$scope.item._id) return false;
                    return $rootScope.userIs('diag') && $rootScope.session()._id == $scope.item._diag._id;
                };

                $scope.isOwner = () => {
                    if (!$scope.item || !$scope.item._client) return false;
                    return $scope.item._client.clientType === 'landlord';
                };

                $scope.successMsg = (msg) => {
                    $rootScope.message(msg, {
                        type: 'success',
                        duration: 10000
                    });
                }
                $scope.infoMsg = (msg) => {
                    $rootScope.message(msg, {
                        duration: 5000,
                        type: 'info'
                    });
                }

                $scope.currentClientType = () =>
                    $scope.item && $scope.item._client && '(' + $scope.item._client.clientType + ')' || '';

                $scope.totalTime = () => $D.OrderTotalTime($scope.item.diags, $scope.diags);

                var _totalTimeFormatedDate = moment();
                $scope.totalTimeFormated = () => {
                    if (!$scope.item.diags || !$scope.diags) return '';
                    var t = $D.OrderTotalTime($scope.item.diags, $scope.diags);
                    var m = _totalTimeFormatedDate.hours(t.hours).minutes(t.minutes).format('HH:mm');
                    return m;
                };

                $scope.orderDescription = () => {
                    $scope.item.info.description = orderHelper.getDescription($scope.item);
                    return $scope.item.info.description;
                };



                $scope.applyTotalPrice = () => {

                    if (_.includes(['prepaid', 'delivered', 'completed'], $scope.item.status)) {
                        return;
                    }

                    $scope.diagSlots.updatePrices();

                    orderPrice.set({
                        date: $scope.item.start,
                        diagCommissionRate: $scope.item._diag && $scope.item._diag.commission
                    });
                    orderPrice.assignPrices($scope.item);
                    $rootScope.dom();
                };

                $scope.type = $rootScope.session().userType;
                $scope.is = (arr) => _.includes(arr, $scope.type);

                window.s = $scope;
            }



            function setDefaults() {
                window.Object.assign($scope.item, {
                    email: '',
                    password: '',
                    status: 'created',
                    start: moment().add(1, 'day').hour(9).minutes(0).toDate(),
                    end: moment().add(1, 'day').hour(10).minutes(30).toDate(),
                    fastDiagComm: 0,
                    price: 0,
                    diags: {},
                    info: {
                        //sell: false,
                        //house: false,
                        squareMeters: undefined,
                        constructionPermissionDate: undefined
                    }
                });
                $scope.original = _.clone($scope.item);
            }

            function setDefaultsDiags() {
                $scope.item.diags = $scope.item.diags || {};
                $scope.diags.forEach(function(val, key) {
                    $scope.item.diags[val.name] = (val.mandatory) ? true : false;
                });
            }


            function setBindings() {

                db.ctrl('Settings', 'getAll', {}).then(d => {
                    if (d.ok && d.result.length > 0) $scope.settings = d.result[0];
                });

                $scope.$watch('item.start', (v) => {
                    $scope.item.date = v; //fallback for total price calculation.
                });



                $scope.$watch('item._diag', (v) => {
                    if ($scope.diagSlots) {
                        $scope.diagSlots.setDiag($scope.item._diag);
                    }
                });

                localData().then(function(data) {
                    Object.assign($scope, data);
                    $scope.diags.forEach((diag) => {
                        diag.show = true;
                    });
                });
                //

                $scope.CLIENT_TYPES = ['agency', 'enterprise', 'landlord', 'other'];
                $scope.CLIENT_TYPES_COMPANY = ['agency', 'enterprise', 'other'];

                //KEYS WHERE Version2 --------------------------------
                $scope.isOrderClientLandLord = () => {
                    if (!$scope.item || !$scope.item._client || !$scope.item._client.clientType) return true;
                    //
                    return !_.includes($scope.CLIENT_TYPES_COMPANY, $scope.item._client.clientType);
                }
                $scope.isOrderClientAgency = () => {
                    return !$scope.isOrderClientLandLord();
                };



                $scope.__keysWhereItems = {};
                $scope.__keysWhereGetItems = () => {
                    if (!$scope.item._client || !$scope.item._client.clientType) return {
                        'Ou ?': () => '',
                    };
                    if ($scope.isOrderClientLandLord()) {
                        return {
                            'Ou ?': () => '',
                            'Diag Address': () => $scope.item.address,
                            'Client Address': () => $scope.item._client.address, //when landlord
                            'Other': () => 'other'
                        };
                    }
                    else {
                        return {
                            'Ou ?': () => '',
                            'Diag Address': () => $scope.item.address,
                            'Agency Address': () => $scope.item._client.address, //when not-landlord
                            'Landlord Address': () => $scope.item.landLordAddress, //when not-landlord 
                            'Other': () => 'other'
                        };
                    }
                };

                function isEdition() {
                    return $scope.item && $scope.item._id;
                }

                $scope.$watch('item.diags', function(newV, oldV) {
                    if (!_.isEqual(newV, oldV) && !$scope.item._id) {
                        $scope.applyTotalPrice();
                    }
                }, true);

                $scope.$watch('item.info.buildingType', function(newV, oldV) {
                    if (!isEdition()) {
                        $scope.applyTotalPrice();
                    }
                }, true);

                $scope.$watch('item', function(val) {
                    $scope.__keysWhereItems = $scope.__keysWhereGetItems();
                }, true);
                $scope.__keysWhereSelectFirstItem = () => $scope.__keysWhereItems && Object.keys($scope.__keysWhereItems)[0] || "Loading";
                $scope.__keysWhereSelectLabel = () => $scope.__keysWhereSelectLabelVal || $scope.__keysWhereSelectFirstItem();
                $scope.__keysWhereSelect = (key, val) => {
                    //$log.debug(val);
                    $scope.item.keysWhere = val ? val() : undefined;
                };

                function watchKeysWhere() {
                    $scope.$watch('item.keysWhere', function(val) {
                        if (val == undefined) {
                            return $scope.__keysWhereSelectLabelVal = 'Ou ?';
                        }
                        Object.keys($scope.__keysWhereItems).forEach(k => {
                            if ($scope.__keysWhereItems[k]() == val) {
                                $scope.__keysWhereSelectLabelVal = k;
                            }
                        });
                        $scope.item.keysAddress = (val == 'other') ? '' : val;
                    });
                }

                if (params.id.toString() == '-1') {
                    watchKeysWhere();
                }
                else {
                    $scope.afterRead.push(watchKeysWhere);
                }



                //KEYS TIME FROM ------------------------------------------------------------------------------------------------
                $scope.__keysTimeFromItems = {};
                $scope.__keysTimeFromGetItems = () => {
                    var vals = {};
                    if (!$scope.item) return vals;
                    var m = moment($scope.item.start).hours(8);
                    while (m.isBefore(moment($scope.item.start))) {
                        vals[$rootScope.momentTime(m)] = new Date(m.toString());
                        m = m.add(5, 'minutes');
                    };
                    vals[$rootScope.momentTime($scope.item.start)] = new Date(moment($scope.item.start).toString());
                    return vals;
                };
                $scope.__keysTimeFromSelectFirstItem = () => $scope.__keysTimeFromItems && Object.keys($scope.__keysTimeFromItems)[0] || "Loading";
                $scope.__keysTimeFromSelectLabel = 'choisir';
                $scope.__keysTimeFromSelect = (key, val) => {
                    $scope.item.keysTimeFrom = val;
                    if (dtAfter($scope.item.keysTimeFrom, $scope.item.keysTimeTo)) {
                        $scope.item.keysTimeTo = undefined;
                    }
                };
                $scope.$watch('item.keysTimeFrom', function(val) {
                    if (!val) {
                        $scope.__keysTimeFromSelectLabel = 'choisir';
                    }
                    else {
                        if ($scope.item._id) {
                            return $scope.__keysTimeFromSelectLabel = $rootScope.momentTime($scope.item.keysTimeFrom);
                        }
                        $scope.__keysTimeFromSelectLabel = 'choisir';
                        _.each($scope.__keysTimeFromItems, (v, k) => {
                            if (v == val) $scope.__keysTimeFromSelectLabel = k;
                        });
                    }

                });
                $scope.$watch('item.start', function(val) {
                    $scope.__keysTimeFromItems = $scope.__keysTimeFromGetItems();
                });

                //KEYS TIME TO ------------------------------------------------------------------------------------------------
                $scope.__keysTimeToItems = {};
                $scope.__keysTimeToGetItems = () => {
                    var vals = {};
                    if (!$scope.item) return vals;
                    var m = moment($scope.item.start).hours(8).minutes(0);
                    if (
                        moment($scope.item.keysTimeFrom).isAfter(m) &&
                        moment($scope.item.keysTimeFrom).isBefore(moment($scope.item.start))
                    ) {
                        m = m.hours(moment($scope.item.keysTimeFrom).hours())
                        m = m.minutes(moment($scope.item.keysTimeFrom).minutes())
                    }

                    while (m.isBefore(moment($scope.item.start))) {
                        vals[$rootScope.momentTime(m)] = new Date(m.toString());
                        m = m.add(5, 'minutes');
                    };
                    vals[$rootScope.momentTime($scope.item.start)] = new Date(moment($scope.item.start).toString());
                    return vals;
                };
                $scope.__keysTimeToSelectFirstItem = () => $scope.__keysTimeToItems && Object.keys($scope.__keysTimeToItems)[0] || "Loading";
                $scope.__keysTimeToSelectLabel = 'choisir';
                $scope.__keysTimeToSelect = (key, val) => {
                    $scope.item.keysTimeTo = val;
                };
                $scope.$watch('item.keysTimeTo', function(val) {
                    if (!val) {
                        $scope.__keysTimeToSelectLabel = 'choisir';
                    }
                    else {
                        if ($scope.item._id) {
                            return $scope.__keysTimeToSelectLabel = $rootScope.momentTime($scope.item.keysTimeTo);
                        }
                        $scope.__keysTimeToSelectLabel = 'choisir';
                        _.each($scope.__keysTimeToItems, (v, k) => {
                            if (v == val) $scope.__keysTimeToSelectLabel = k;
                        });
                    }

                });
                $scope.$watch('item.keysTimeFrom', function(val) {
                    $scope.__keysTimeToItems = $scope.__keysTimeToGetItems();
                });
                $scope.$watch('item.start', function(val) {
                    $scope.__keysTimeToItems = $scope.__keysTimeToGetItems();
                });
                //-------------------------------------------------------------------------


                function dtAfter(d1, d2, unit) {
                    return moment(d1).isAfter(moment(d2), unit);
                }

                function dtBefore(d1, d2, unit) {
                    return moment(d1).isAfter(moment(d2), unit);
                }



                //
                $scope.datepicker = {
                    minDate: moment().toDate(), //.add(1, 'day') //today!
                    maxDate: moment().add(60, 'day').toDate(),
                    initDate: new Date()
                };
                //
                $scope.noResults = "No results found";
                $scope.LoadingClients = "Loading Clients";
                $scope.getClients = function(val) {
                    return db.http('User', 'getAll', {
                        userType: 'client',
                        __regexp: {
                            email: val
                        }
                    }).then(function(res) {
                        return res.data.result;
                    });
                };
                $scope.getDiags = function(val) {
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


                $scope.start = $D.createDateTimePickerData();
                $scope.end = $D.createDateTimePickerData();
                $scope.status = $D.createSelect({
                    scope: $scope,
                    model: 'item.status',
                    label: '(Select an status)',
                    items: ['Ordered', 'Prepaid', 'Delivered', 'Completed'],
                    change: (selected) => {
                        $scope.item.status = selected.toString().toLowerCase();
                        $rootScope.dom();
                    }
                });
            }

            function setActions() {


                $scope.sendPaymentLink = (cb) => {

                    $U.ifThenMessage([
                        [!$scope.item.landLordEmail, '==', true, "Landlord Email required."],
                        [!$scope.item.landLordFullName, '==', true, "Landlord Name required."],
                    ], (m) => {
                        if (typeof m[0] !== 'string') {
                            $rootScope.warningMessage(m[0]());
                        }
                        else {
                            $rootScope.warningMessage(m[0]);
                        }
                    }, _sendPaymentLink);



                    function _sendPaymentLink() {
                        $rootScope.openConfirm({
                            message: 'You want to send a payment link to ' + $scope.item.landLordEmail + ' ?',
                            templateUrl: 'views/directives/modal.yes-not-now.html'
                        }, () => {
                            $scope.infoMsg("Sending email.");

                            $D.getInvoiceHTMLContent(db, $scope.item, $rootScope, html => {
                                db.ctrl('Notification', 'LANDLORD_ORDER_PAYMENT_DELEGATED', {
                                    _user: $scope.item._client,
                                    _order: $scope.item,
                                    attachmentPDFHTML: html
                                }).then(data => {

                                    if ($scope.item.status == 'created') {
                                        $scope.item.status = 'ordered';
                                        db.ctrl('Order', 'update', $scope.item);
                                    }


                                    $scope.infoMsg("Email sended.");
                                    if (cb) cb();
                                });
                            });


                        });
                    }
                };



                $scope.isPayButtonShown = function() {
                    if (orderPaymentForm.isProcessing()) return false;
                    if ($scope.item.revenueHT === undefined) return false;
                    if ($scope.item.price === undefined) return false;
                    return $scope.item._id && $scope.item.status !== 'prepaid' && $scope.item.status !== 'completed';
                };

                $scope.test = function() {
                    $scope.item.status = 'created';
                    $scope.pay();
                }

                $scope.pay = () => {
                    var order = $scope.item;

                    if (!order._client.wallet) {
                        return $rootScope.warningMessage('Configure Client Wallet ID first');
                    }



                    orderPaymentForm.pay($scope.item).then(function() {
                        $scope.successMsg('Commande payée');
                        $scope.item.status = 'prepaid';
                        $rootScope.dom(read, 5000);
                    }).error(function(res) {
                        return $rootScope.errorMessage('', 10000);
                    }).on('validate', function(msg) {
                        return $rootScope.warningMessage(msg, 10000);
                    });


                };


                function emailOfPersonWhoPaid() {
                    var session = $rootScope.session();
                    if (session && session._id == $scope.item._client._id) {
                        return $scope.item._client.email;
                    }
                    else {
                        return $scope.item.landLordEmail || $scope.item._client.email || '';
                    }
                }



                $scope.back = () => {
                    if ($scope.is(['diag', 'client'])) {
                        $rootScope.route('dashboard');
                    }
                    else {
                        if ($rootScope.params && $rootScope.params.prevRoute) {
                            return $rootScope.route($rootScope.params.prevRoute);
                        }
                        else {
                            $rootScope.route('orders');
                        }

                    }
                }
                $scope.cancel = function() {
                    $scope.back();
                };



                $scope.mm = (d) => moment(d).minutes();
                $scope.mmOK = (d) => _.includes([0, 30], $scope.mm(d));

                $scope.validate = () => {
                    $U.ifThenMessage([
                        [typeof $scope.item._client, '!=', 'object', "Client required"],
                        [typeof $scope.item._diag, '!=', 'object', "Diag Man required"],
                        [_.isUndefined($scope.item.address) || _.isNull($scope.item.address) || $scope.item.address === '', '==', true, 'Address required'],
                        [!$scope.item.start, '==', true, 'start date est requis'],
                        [!$scope.item.end, '==', true, 'end date est requis'],
                        [moment($scope.item.start || null).isValid(), '==', false, "start date invalide"],
                        [moment($scope.item.end || null).isValid(), '==', false, "end date invalide"],

                        [$scope.isOrderClientAgency() && !$scope.item.landLordEmail, '==', true, "E-mail du propriétaire requis"],
                        [$scope.isOrderClientAgency() && !$scope.item.landLordFullName, '==', true, "Nom du propriétaire requis"],
                        [!$scope.item.keysAddress, '==', true, 'Clés Adresse requise'],
                        [!$scope.item.keysTimeFrom, '==', true, 'Clés Temps "De" requis'],
                        [!$scope.item.keysTimeTo, '==', true, 'Clés Temps "To" requis'],

                        //[s.mmOK(s.item.start), '==', false, "start date minutes need to be 0 or 30."],
                        //[s.mmOK(s.item.end), '==', false, "End date minutes need to be 0 or 30."],

                        [moment($scope.item.end).isValid() && moment($scope.item.start).isValid() && !moment($scope.item.end).isSame(moment($scope.item.start), 'day'), '==', true, 'Start / End dates need to be in the same day.'],
                        [moment($scope.item.end).isValid() && moment($scope.item.end).isBefore(moment($scope.item.start), 'hour'), '==', true, 'End date cannot be lower than Start date'],

                        //  [s.keysWhereTime.invalidKeysTime(), '==', true, s.keysWhereTime.invalidKeysTimeMessage],

                        //[s.item.fastDiagComm.toString(),'==','','Comission required'],
                        [isNaN($scope.item.fastDiagComm), '==', true, 'Comission need to be a number'],
                        //[s.item.price.toString(),'==','','Price required'],
                        [isNaN($scope.item.price), '==', true, 'Price need to be a number'],
                        [$scope.item.status, '==', '', 'Status required']
                    ], (m) => {
                        if (typeof m[0] !== 'string') {
                            $rootScope.warningMessage(m[0]());
                        }
                        else {
                            $rootScope.warningMessage(m[0]);
                        }
                    }, $scope.save);
                };



                function reEnableNotifications() {
                    $scope.item.notifications = $scope.item.notifications || {};
                    $log.debug('diag change, notifications re-sended.');
                    $scope.item.notifications.ADMIN_ORDER_PAYMENT_SUCCESS = false;
                    $scope.item.notifications.ADMIN_ORDER_PAYMENT_PREPAID_SUCCESS = false;
                    $scope.item.notifications.CLIENT_ORDER_PAYMENT_SUCCESS = false;
                    $scope.item.notifications.DIAG_NEW_RDV = false;
                    if ($scope.item.notifications.LANDLORD_ORDER_PAYMENT_SUCCESS !== undefined) {
                        $scope.item.notifications.LANDLORD_ORDER_PAYMENT_SUCCESS = false;
                    }
                }

                function displayWarning(msg) {
                    $rootScope.okModal({
                        data: {
                            title: 'Warning'
                        },
                        message: msg
                    });
                }

                function displayWarning(msg) {
                    $rootScope.okModal({
                        data: {
                            title: 'Warning'
                        },
                        message: msg
                    });
                }

                $scope.save = function(opt) {


                    //on diag change, notifications are re-sended
                    if (!opt || opt && opt.assignDiagFeature !== true) {
                        if ($scope.prevItem && $scope.prevItem._diag && $scope.prevItem._diag.email && $scope.item._diag && $scope.item._diag.email && $scope.prevItem._diag.email != $scope.item._diag.email) {

                            if ($scope.isPaid()) return displayWarning('You change the diag account but the order is already paid. Unable to assign a new diag account.');

                            var msg = "Manually assign of diagnostiqueur " + $scope.item._diag.firstName + ' ' + $scope.item._diag.lastName + ' will trigger notifications again. Please confirm. ';
                            $rootScope.openConfirm(msg, () => {
                                reEnableNotifications();
                                $scope.save(Object.assign(opt || {}, {
                                    assignDiagFeature: true
                                }));
                            });
                            return;
                        }
                    }

                    if (!opt || opt.assignNewRDVSlot !== true) {
                        if ($scope.item._id && $scope.hasUserSelectedAnRDVSlot) {

                            if ($scope.isPaid()) return displayWarning('You change the rdv slot but the order is already paid. Unable to assign a new rdv slot.');

                            $rootScope.openConfirm('Manually assign of RDV slot may change diagnostiqueur, date and price and will trigger notifications again. Please Confirm. ', () => {
                                reEnableNotifications();
                                $scope.save(Object.assign(opt || {}, {
                                    assignNewRDVSlot: true
                                }));
                            });
                            return;
                        }

                    }

                    db.ctrl('Order', 'save', $scope.item).then(function(res) {

                        if (res.ok) {

                            if ($scope.item.notifications && $scope.item.notifications.LANDLORD_ORDER_PAYMENT_DELEGATED == true) {
                                $rootScope.infoMessage('Changes saved');
                                $scope.back();
                            }
                            else {
                                $scope.item._id = res.result._id;

                                if ($scope.isOrderClientLandLord()) {
                                    $scope.back();
                                }
                                else {
                                    $scope.sendPaymentLink(() => {
                                        $scope.back();
                                    });
                                }

                                $rootScope.infoMessage('Changes saved');

                                $scope.activateSlotSelectionManually(false);

                            }



                        }
                        else {
                            handleError(res);
                        }
                    }).error(handleError);
                };
                $scope.downloadFile = () => {
                    if (!$scope.item.pdfId) {
                        return $rootScope.warningMessage("File required", 5000);
                    }
                    else {
                        window.open(db.URL() + '/File/get/' + $scope.item.pdfId, '_newtab');
                    }
                };

                $scope.deletePDF = () => {
                    if (!$scope.pdfFileInfo) {
                        return console.warn('s.pdfFileInfo expected.');
                    }
                    $rootScope.openConfirm('Delete ' + $scope.pdfFileInfo.filename + ' ?', () => {
                        db.ctrl('File', 'remove', {
                            _id: $scope.pdfFileInfo._id
                        }).then((d) => {
                            if (d.ok) {
                                $scope.item.pdfId = null;
                                db.ctrl('Order', 'update', {
                                    _id: $scope.item._id,
                                    pdfId: $scope.item.pdfId
                                });
                                $rootScope.dom();
                            }
                        });
                    });
                };


                function canDelete() {
                    if (!_.includes(['ordered', 'created'], $scope.item.status)) {
                        if ($scope.item.paymentType === 'cheque') return true;
                        return false;
                    }
                    return true;
                }


                $scope.delete = function() {

                    if (!canDelete()) {
                        $scope.okModal({
                            message: "You can't delete an Order with the follow status: delivered, prepaid or completed.",
                            data: {
                                title: 'Delete Info'
                            }
                        });
                        return;
                    }

                    var time = (d) => moment(d).format('HH:mm');
                    var descr = $scope.item.address + ' (' + time($scope.item.start) + ' - ' + time($scope.item.end) + ')';
                    $rootScope.openConfirm('Delete Order ' + descr + ' ?', function() {
                        // s.message('deleting . . .', 'info');

                        db.ctrl('Order', 'remove', {
                            _id: $scope.item._id
                        }).then(function(data) {

                            if (data.ok) {
                                //s.message('deleted', 'info');
                                $scope.back();
                            }
                            else {
                                handleError(data);
                            }
                        }).error(handleError);
                    });
                };
            }

            function handleError(er) {
                $scope.warningMessage("Problème technique. S&#39il vous plaît réessayer plus tard");
            }

            function reset() {
                $scope.item = _.clone($scope.original);
            }

            function _readFile() {

                if ($scope.item.pdfId) {
                    console.info('_readFile');
                    db.ctrl('File', 'find', {
                        _id: $scope.item.pdfId
                    }).then(data => {
                        console.info(data);
                        if (data.ok) {
                            $scope.pdfFileInfo = (data.result.length && data.result.length > 0 && data.result[0]) || data.result;
                        }
                    });
                }
            }


            function read(id) {
                if ($rootScope.params && $rootScope.params.item && $rootScope.params.item._diag) {
                    $scope.item = $rootScope.params.item; //partial loading
                    delete $rootScope.params.item;
                }

                //s.message('loading . . .', 'info');

                db.ctrl('Order', 'get', {
                    _id: id || params.id || $scope.item._id,
                    __populate: {
                        '_client': 'email clientType address discount firstName lastName siret wallet',
                        '_diag': 'email address commission firstName lastName siret wallet tva_intra_comm isAutoentrepreneur'
                    }
                }).then(function(data) {

                    if (data.ok && data.result !== null) {
                        data.result = Object.assign(data.result, {
                            start: new Date(data.result.start),
                            end: new Date(data.result.end)
                        });

                        $scope.prevItem = $scope.prevItem || null;
                        $scope.prevItem = _.clone($scope.item);
                        $scope.item = data.result;

                        if (!$scope.prevItem || Object.keys($scope.prevItem).length == 0) $scope.prevItem = $scope.item;

                        $scope.original = _.clone($scope.item);

                        if ($scope.afterRead && $scope.afterRead.forEach) {
                            $scope.afterRead.forEach(cb => cb());
                        }

                        autoPay();
                        $scope.pdfCheck();
                    }
                    else {
                        handleError(data);
                    }
                }).error(handleError);
            }

            init();
        }
    ]);





})();

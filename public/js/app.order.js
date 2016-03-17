(function() {
    var app = angular.module('app.order', ['app.common.service']);

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
                s.message('Loading . . .', 'info');
                db.custom('order', 'getAll', {
                    __populate: {
                        '_client': 'email',
                        '_diag': 'email'
                    }
                }).then(function(r) {
                    //                console.info('adminOrders:read:success', r.data.result);
                    r.data.result = _.orderBy(r.data.result, ['created'], ['desc']);
                    s.items = r.data.result;
                    s.message('Loaded', 'success', 1000);
                });
            }
            s.refresh = read;

            r.dom(read, 0);

        }
    ]);

    app.controller('adminOrdersEdit', [

        'server', '$scope', '$rootScope', '$routeParams', 'focus',
        function(db, s, r, params, focus) {
            r.setCurrentCtrl(s);

            s.item = {

            };

            function init() {
                r.toggleNavbar(true);

                if (window.location.href.indexOf('orders/view') !== -1) {
                    //no login needed
                    if (r.params && r.params.prevRoute) {

                    } else {
                        r.toggleNavbar(false);
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
                whenProperties(s, ['diags'], [setDefaultsDiags]);
                //
                if (params && params.id && params.id.toString() !== '-1') {
                    r.dom(read, 0);
                } else {
                    reset();
                }
            }

            function autoPay() {
                if (window.location.href.indexOf('orders/view') === -1) return;
                if (s.pay && getParameterByName('pay') === '1') {
                    if (s.item && !_.includes(['prepaid', 'completed'], s.item.status)) {
                        s.pay();
                    }
                }
            }


            function setHelpers() {

                s.canWriteAgency = () => {
                    if(!s.item._id){
                        return r.userIs('admin');
                    }
                    return r.userIs(['admin']) || (r.session()._id == s.item._client._id && _.includes(['agency', 'other'], s.item._client.clientType));
                };
                s.canWriteDiag = () => {
                    if(!s.item._id){
                        return false
                    }
                    return r.userIs(['admin']) || r.sesison()._id == s.item._diag._id;
                };

                s.diagPrice=()=>{
                    if(!s.item.price)return 0;
                    if(isNaN(s.item.price))return 0;
                    return (s.item.price - (s.item.price * 0.12)) * 0.30;
                };

                s.isPaid = () => {
                    return _.includes(['prepaid', 'delivered', 'completed'], s.item.status);
                };

                s.isDiag=()=>{
                    if(!s.item._id) return false;
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

                s.subTotal = () => subTotal(s.item, s.diags, s.basePrice);
                s.sizePrice = () => sizePrice(s.item, s.diags, s.squareMetersPrice, s.basePrice);
                s.totalPrice = (showRounded) => totalPrice(showRounded, s.item, s.diags, s.squareMetersPrice, s.basePrice, {
                    overwriteModel: false,
                    s: s //with the scope, a priceInfo object is created to debug price calc.
                });
                s.totalTime = () => OrderTotalTime(s.item.diags, s.diags);
                s.totalTimeFormated = () => {
                    var t = OrderTotalTime(s.item.diags, s.diags);
                    var m = moment().hours(t.hours).minutes(t.minutes).format('HH:mm');
                    return m;
                };
                s.applyTotalPrice = () => {
                    s.item.price = s.totalPrice(true);
                };
                s.applyTotalTime = () => {
                    var t = OrderTotalTime(s.item.diags, s.diags);
                    if (s.item && s.item.diagStart) {
                        s.item.diagEnd = moment(s.item.diagStart)
                            .add(t.hours, 'hours').add(t.minutes, 'minutes')._d;
                        r.dom();
                    }
                };
                s.message = r.message;
                s.type = r.session().userType;
                s.is = (arr) => _.includes(arr, s.type);
                s.focus = focus;
                window.s = s;
            }

            function setDefaults() {
                s.item = {
                    email: '',
                    password: '',
                    status: 'ordered',
                    diagStart: moment().add(1, 'day').hour(9).minutes(0).toDate(),
                    diagEnd: moment().add(1, 'day').hour(10).minutes(30).toDate(),
                    fastDiagComm: 0,
                    price: 0,
                    diags: {}
                };
                s.original = _.clone(s.item);
            }

            function setDefaultsDiags() {
                s.diags.forEach(function(val, key) {
                    s.item.diags[val.name] = (val.mandatory) ? true : false;
                });
            }


            function setBindings() {
                db.localData().then(function(data) {
                    Object.assign(s, data);

                    s.diags.forEach((diag) => {
                        diag.show = true;
                    });
                });
                //
                s.keysWhereTime = {
                    invalidKeysTimeMessage: () => {
                        var startTime = () => moment(s.item.diagStart).format('HH:mm');
                        return 'Keys time should be between 8:00 and ' + startTime();
                    },
                    invalidKeysTime: () => {
                        var before = (d1, h) => moment(d1).isBefore(moment(d1).hours(8));
                        var diag = {
                            hours: moment(s.item.diagStart).hours(),
                            minutes: moment(s.item.diagStart).minutes()
                        };
                        var after = (d1) => moment(d1).isAfter(moment(d1).hours(diag.hours).minutes(diag.minutes));
                        var tfrom = s.item.keysTimeFrom;
                        var tto = s.item.keysTimeTo;
                        if (!tfrom || before(tfrom) || after(tfrom)) {
                            console.warn('invalidKeysTime from', (!tfrom), before(tfrom), after(tfrom));
                            return true;
                        }
                        if (!tto || before(tto) || after(tto)) {
                            console.warn('invalidKeysTime to', (!tto), before(tto), after(tto));
                            return true;
                        }
                        if (tto && tfrom && moment(tto).isBefore(moment(tfrom))) {
                            console.warn('invalidKeysTime from <- to required.');
                            return true;
                        }

                        return false;
                    },
                    init: function(self) {

                    },
                    emit: function(n) {
                        var self = this;
                        var arr = self.evts[n] || [];
                        arr.forEach(evt => (evt(self)))
                    },
                    evts: {
                        onItem: [(self) => {
                            s.keysWhereTime.updateItems(self);
                        }]
                    },
                    mstep: 15,
                    hstep: 1,
                    address: '',
                    scope: s,
                    val: undefined,
                    disabled: () => r.state.working(),
                    cls: () => ({ btn: true, 'btn-default': true }),
                    filterWatch: 'item',
                    filter: (v) => {
                        if (s.item && s.item._client && s.item._client.clientType) {
                            if (s.item._client.clientType !== 'agency') {
                                if (v.val == 'agency') {
                                    return false;
                                }
                            }
                        }
                        return true;
                    },
                    label: '(Select where)',
                    modelPath: 'item.keysWhere',
                    items: [],
                    updateItems: ((self) => {
                        var o = [{
                            label: () => s.item && s.item.address || 'Diag Address',
                            val: 1,
                            get: () => s.item && s.item.address
                        }];
                        if (s.item._client && s.item._client.clientType == 'agency') {
                            o.push({
                                label: () => s.item._client.address || 'Agency address',
                                val: 3,
                                get: () => s.item._client.address || ''
                            }, {
                                label: () => s.item.landLordAddress || 'Landlord address',
                                val: 4,
                                disabled: () => !s.item.landLordAddress,
                                get: () => s.item.landLordAddress || ''
                            }); //when agency / other
                        } else {
                            o.push({
                                label: () => s.item._client.address || 'Client address',
                                val: 3,
                                get: () => s.item._client.address || ''
                            }); //when landlord
                        }
                        self.items = o;
                    }),
                    change: (v, self, setOldValue) => {
                        if (!v) return;
                        var address = v.get();
                        if (!address) {
                            r.notify('Address not found', {
                                type: 'warning',
                                duration: 5000,
                                clickDismissable: true
                            });
                            self.val = undefined;
                            setOldValue();
                            return;
                        }
                        if (s.item.keysAddress && s.item.keysAddress == address) {
                            if (!s.item.keysTime) {
                                s.item.keysTime = moment(s.item.diagStart).hours(8).minutes(0)._d;
                            }
                            return;
                        } else {
                            s.item.keysAddress = address;
                        }

                    }
                };




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
                            disabled: { $ne: true },
                        },
                        __regexp: {
                            email: val
                        }
                    }).then(function(res) {
                        return res.data.result;
                    });
                };


                s.start = createDateTimePickerData();
                s.end = createDateTimePickerData();
                s.status = createSelect({
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


                s.sendPaymentLink = () => {

                    ifThenMessage([
                        [!s.item.landLordEmail, '==', true, "Landlord Email required."],
                        [!s.item.landLordFullName, '==', true, "Landlord Name required."],
                    ], (m) => {
                        if (typeof m[0] !== 'string') {
                            s.message(m[0](), 'warning', 0, true);
                        } else {
                            s.message(m[0], 'warning', 0, true);
                        }
                    }, _sendPaymentLink);

                    function _sendPaymentLink() {
                        s.confirm('You want to send a payment link to ' + s.item.landLordEmail + ' ?', () => {
                            s.infoMsg("Sending email.");
                            db.ctrl('Email', 'orderPaymentLink', s.item).then(data => {
                                s.infoMsg("Email sended.");
                            });
                        });
                    }
                };

                s.pay = () => {
                    var order = s.item;
                    openStripeModalPayOrder(order, (token) => {
                        order.stripeToken = token.id;
                        db.ctrl('Order', 'pay', order).then((data) => {
                            if (data.ok) {
                                console.info('PAY-OK', data.result);
                                s.successMsg('The order was paid successfully');
                                r.dom(read, 5000);
                            } else {
                                s.successMsg('There was a server error, try later.', 'warning');
                                console.info('PAY-FAIL', data.err);
                            }
                        });
                    });
                };


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
                    ifThenMessage([
                        [typeof s.item._client, '!=', 'object', "Client required"],
                        [_.isUndefined(s.item.address) || _.isNull(s.item.address) || s.item.address === '', '==', true, 'Address required'],
                        [_.isNull(s.item.diagStart) || _.isUndefined(s.item.diagStart), '==', true, 'Start date required'],
                        [_.isNull(s.item.diagEnd) || _.isUndefined(s.item.diagEnd), '==', true, 'Start date required'],
                        [moment(s.item.diagStart || null).isValid(), '==', false, "Start date invalid"],
                        [moment(s.item.diagEnd || null).isValid(), '==', false, "End date invalid"],

                        [s.mmOK(s.item.diagStart), '==', false, "Start date minutes need to be 0 or 30."],
                        //[s.mmOK(s.item.diagEnd), '==', false, "End date minutes need to be 0 or 30."],

                        [moment(s.item.diagEnd).isValid() && moment(s.item.diagStart).isValid() && !moment(s.item.diagEnd).isSame(moment(s.item.diagStart), 'day'), '==', true, 'Start / End dates need to be in the same day.'],
                        [moment(s.item.diagEnd).isValid() && moment(s.item.diagEnd).isBefore(moment(s.item.diagStart), 'hour'), '==', true, 'End date cannot be lower than Start date'],

                        [s.keysWhereTime.invalidKeysTime(), '==', true, s.keysWhereTime.invalidKeysTimeMessage],

                        //[s.item.fastDiagComm.toString(),'==','','Comission required'],
                        [isNaN(s.item.fastDiagComm), '==', true, 'Comission need to be a number'],
                        //[s.item.price.toString(),'==','','Price required'],
                        [isNaN(s.item.price), '==', true, 'Price need to be a number'],
                        [s.item.status, '==', '', 'Status required']
                    ], (m) => {
                        if (typeof m[0] !== 'string') {
                            s.message(m[0](), 'warning', 0, true);
                        } else {
                            s.message(m[0], 'warning', 0, true);
                        }
                    }, s.save);
                };
                s.save = function() {
                    s.message('saving . . .', 'info');
                    s.requesting = true;
                    db.ctrl('Order', 'save', s.item).then(function(data) {
                        s.requesting = false;
                        if (data.ok) {
                            s.message('saved', 'success');
                            s.back();
                        } else {
                            handleError(data);
                        }
                    }).error(handleError);
                };
                s.downloadFile = () => {
                    if (!s.item.pdfId) {
                        return s.message("File required", 'warning', {
                            duration: 5000,
                            scroll: true
                        });
                    } else {
                        window.open(db.URL() + '/File/get/' + s.item.pdfId, '_newtab');
                    }
                };
                s.saveFile = () => {
                    if (!s.pdfFile) {
                        saveFile
                        return s.message("File required", 'warning', {
                            duration: 5000,
                            scroll: true
                        });
                    }
                    var pdfId_prev = s.item.pdfId;
                    _uploadNew(); //starts here

                    function _deletePrev() {
                        if (pdfId_prev) {
                            db.ctrl('File', 'remove', { _id: pdfId_prev });
                        }
                    }

                    function _uploadNew() {
                        s.message('Uploading (Do not touch anything)', {
                            type: 'info',
                            duration: 99999,
                            scroll: true
                        });
                        db.form('File/save/', {
                            name: s.pdfFile.name,
                            file: s.pdfFile
                        }).then((data) => {
                            //console.info('INFO', data);
                            if (data.ok) {
                                s.item.pdfId = data.result._id;
                                db.ctrl('Order', 'update', {
                                    _id: s.item._id,
                                    pdfId: data.result._id,
                                    status: (s.item.status === 'prepaid') ? 'completed' : 'delivered'
                                }).then(data => {
                                    _deletePrev();
                                    //_readFile();
                                    read(s.item._id);
                                    s.message('File upload success.', {
                                        type: 'info',
                                        duration: 5000,
                                        scroll: true
                                    });
                                });
                            } else {
                                s.message('Upload fail, try later.', {
                                    type: 'warning',
                                    duration: 99999,
                                    scroll: true
                                });
                            }
                        });
                    }
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
                    var descr = s.item.address + ' (' + time(s.item.diagStart) + ' - ' + time(s.item.diagEnd) + ')';
                    s.confirm('Delete Order ' + descr + ' ?', function() {
                        s.message('deleting . . .', 'info');
                        s.requesting = true;
                        db.ctrl('Order', 'remove', {
                            _id: s.item._id
                        }).then(function(data) {
                            s.requesting = false;
                            if (data.ok) {
                                s.message('deleted', 'info');
                                s.back();
                            } else {
                                handleError(data);
                            }
                        }).error(handleError);
                    });
                };
            }

            function handleError(err) {
                s.requesting = false;
                s.message('error, try later.', 'danger', 0, true);
            }

            function reset() {
                s.item = _.clone(s.original);
            }

            function _readFile() {
                if (s.item.pdfId) {
                    db.ctrl('File', 'find', {
                        _id: s.item.pdfId
                    }).then(data => {
                        if (data.ok) {
                            s.pdfFileInfo = (data.result.length > 0 && data.result[0]) || null;
                        }
                    });
                }
            }

            function onItem(item) {
                s.keysWhereTime.emit('onItem');
            }

            function read(id) {
                if (r.params && r.params.item && r.params.item._diag) {
                    s.item = r.params.item; //partial loading
                    delete r.params.item;
                }

                //s.message('loading . . .', 'info');
                s.requesting = true;
                db.ctrl('Order', 'get', {
                    _id: id || params.id || s.item._id,
                    __populate: {
                        '_client': 'email clientType address',
                        '_diag': 'email address'
                    }
                }).then(function(data) {
                    s.requesting = false;
                    if (data.ok && data.result !== null) {
                        data.result = Object.assign(data.result, {
                            diagStart: new Date(data.result.diagStart),
                            diagEnd: new Date(data.result.diagEnd)
                        });
                        s.item = data.result;
                        onItem(s.item);
                        autoPay();
                        _readFile();
                        //                    console.info('READ', s.item);
                        s.message('Loaded', 'success', 2000);
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
                s.title = "Orders";
                r.routeParams({
                    prevRoute: 'orders'
                });

                s.syncStripe = () => {
                    db.ctrl('Order', 'syncStripe'); //async 
                    setTimeout(update, 10000);
                };



                function update(items, cb) {
                    var data = {
                        __populate: {
                            '_client': 'email',
                            '_diag': 'email'
                        },
                        __sort: "-createdAt"
                    };
                    dbPaginate.ctrl(data,s.model).then(res => {
                        if (cb) {
                            cb(res.result);
                        } else {
                            s.model.update(res.result, null);
                        }
                    });
                }
                s.model = {
                    init: () => update(),
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
                        label: "Refresh",
                        type: () => "btn btn-default margin-left-0 margin-right-1",
                        click: () => update()
                    }, {
                        label: "New Order",
                        type: () => "btn btn-default margin-right-1",
                        click: () => r.route('orders/edit/-1')
                    }, {
                        label: "Sync payments",
                        type: () => "btn btn-default margin-right-1",
                        click: () => syncStripe()
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
                        label: "Address",
                        name: 'address'
                    }, {
                        label: "When",
                        name: "diagStart",
                        format: (v, item) => r.momentFormat(item.diagStart, 'DD-MM-YY')
                    }, {
                        label: "Hour",
                        name: "diagStart",
                        format: (v, item) => r.momentTime(item.diagStart) + ' - ' + r.momentTime(item.diagEnd)
                    }, {
                        label: 'Price',
                        name: 'price'
                    }, {
                        label: 'Status',
                        name: 'status'
                    }, {
                        label: 'Created',
                        name: 'createdAt',
                        format: (v, item) => r.momentFormat(item.createdAt, 'DD-MM-YY HH:mm')
                    }],
                    items: []
                };

            }
        };
    });


})();

var app = angular.module('app.admin.order', ['app.common.service']);

app.controller('adminOrders', [

    'server', '$scope', '$rootScope','focus',
    function(db, s, r,focus) {
        console.info('app.admin.order:adminOrders');
        //
        window.s = s;
        s.focus = focus;
        r.toggleNavbar(true);
        r.secureSection(s);
        s.selectedItems = [];
        s.items = [];
        //
        if (r.userIs(['diag', 'client'])) {
            return r.handleSecurityRouteViolation();
        }
        //
        s.click = function(item) {
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

        function read() {
            s.message('loading . . .', 'info');
            db.custom('order', 'getAll', { __populate: ['_client', 'email'] }).then(function(r) {
                console.info('adminOrders:read:success', r.data.result);
                s.items = r.data.result;
                s.message('loaded!', 'success', 1000);
            });
        }
        r.dom(read, 0);

    }
]);

app.controller('adminOrdersEdit', [

    'server', '$scope', '$rootScope', '$routeParams','focus',
    function(db, s, r, params,focus) {
        s.focus = focus;
        window.s = s;
        r.toggleNavbar(true);
        r.secureSection(s);
        r.dom();
        //
        db.localData().then(function(data) {
            Object.assign(s, data);
        });
        //
        s.message = r.message;
        //
        s.type = r.session().userType;
        s.is = (arr) => _.includes(arr, s.type);
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
                __regexp: {
                    email: val
                }
            }).then(function(res) {
                return res.data.result;
            });
        };

        function dtpData() {
            var o = {
                isOpen: false,
                openCalendar: function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    o.isOpen = true;
                }
            };
            return o;
        }
        s.start = dtpData();
        s.end = dtpData();

        s.totalPrice = function() {
            var total = 0;
            Object.keys(s.item.diags).forEach(function(mkey) {
                if (!s.item.diags[mkey]) return;
                s.diags.forEach(function(dval, dkey) {
                    if (dval.name == mkey) {
                        total += dval.price || 0;
                        return false;
                    }
                });
            });
            s.item.price = total;
            return total;
        };

        function createSelect(opt) {
            var o = {
                label: opt.label,
                click: (x) => {
                    opt.change(x);
                    o.label = x.label || x;
                    r.dom();
                },
                items: opt.items
            };
            s.$watch(opt.model, (v) => {
                if (v !== undefined) {
                    o.label = v.substring(0, 1).toUpperCase() + v.slice(1);
                } else {
                    o.label = opt.label;
                }
            });
            return o;
        }
        s.status = createSelect({
            model: 'item.status',
            label: '(Select an status)',
            items: ['Ordered', 'Prepaid', 'Delivered', 'Completed'],
            change: (selected) => {
                s.item.status = selected.toString().toLowerCase();
            }
        });
        //

        //
        if (params && params.id && params.id.toString() !== '-1') {
            r.dom(read, 1000);
        } else {
            reset();
        }
        //
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
        s.validate = () => {
            ifThenMessage([
                [typeof s.item._client, '!=', 'object', "Client required"],
                [_.isUndefined(s.item.address) || _.isNull(s.item.address) || s.item.address === '', '==', true, 'Address required'],
                [_.isNull(s.item.diagStart) || _.isUndefined(s.item.diagStart), '==', 'true', 'Start date required'],
                [_.isNull(s.item.diagEnd) || _.isUndefined(s.item.diagEnd), '==', 'true', 'Start date required'],
                [moment(s.item.diagStart || null).isValid(), '==', false, "Start date invalid"],
                [moment(s.item.diagEnd || null).isValid(), '==', false, "End date invalid"],
                [moment(s.item.diagEnd).isValid() && moment(s.item.diagEnd).isBefore(moment(s.item.diagStart),'hour'),'==',true,'End date cannot be greater than Start date'],

[moment(s.item.diagEnd).isValid() && moment(s.item.diagStart).isValid() 
&& !moment(s.item.diagEnd).isSame(moment(s.item.diagStart),'day'),'==',true,'Start / End dates need to be in the same day.'],

                //[s.item.fastDiagComm.toString(),'==','','Comission required'],
                [isNaN(s.item.fastDiagComm), '==', true, 'Comission need to be a number'],
                //[s.item.price.toString(),'==','','Price required'],
                [isNaN(s.item.price), '==', true, 'Price need to be a number'],
                [s.item.status, '==', '', 'Status required']
            ], (m) => {
                s.message(m[0], 'warning', 0, true);
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

        function handleError(err) {
            s.requesting = false;
            s.message('error, try later.', 'danger', 0, true);
        }
        s.delete = function() {
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

        function reset() {
            s.item = _.clone(s.original);
        }

        function read(id) {
            if (r.params && r.params.item && r.params.item._diag) {
                s.item = r.params.item; //partial loading
                delete r.params.item;
            }

            s.message('loading . . .', 'info');
            s.requesting = true;
            db.ctrl('Order', 'get', {
                _id: id || params.id,
                __populate: {
                    '_client': 'email',
                    '_diag': 'email'
                }
            }).then(function(data) {
                s.requesting = false;
                if (data.ok && data.result !== null) {
                    data.result = Object.assign(data.result,{
                        diagStart:new Date(data.result.diagStart),
                        diagEnd:new Date(data.result.diagEnd)
                    });
                    s.item = data.result;
                    console.info('READ', s.item);
                    s.message('loaded', 'success', 2000);
                } else {
                    handleError(data);
                }
            }).error(handleError);
        }



    }
]);

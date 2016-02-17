var app = angular.module('app.admin.order', ['app.common.service']);

app.controller('adminOrders', [

    'server', '$scope', '$rootScope',
    function(db, s, r) {
        console.info('app.admin.order:adminOrders');
        //
        r.toggleNavbar(true);
        r.secureSection(s);
        s.selectedItems = [];
        s.items = [];
        //
        s.click = function(item) {
            r.route('orders/edit/' + item._id);
        };
        s.create = function() {
            r.route('orders/edit/-1');
        };
        s.delete = function(item) {
            s.confirm('Remove ' + s.selectedItems.length + ' item/s?', function() {
                console.log('adminOrders:removeAll:in-progress');
                s.message('deleting . . .', 'info');
                s.requesting = true;
                db.custom('order', 'removeAll', {
                    ids: s.selectedItems
                }).then(function(res) {
                    s.requesting = false;
                    s.message('deleted', 'info');
                    read();
                    console.info('adminOrders:removeAll:success', r.data);
                }).error(function(err) {
                    s.requesting = false;
                    s.message('error, try later.', 'danger');
                    console.warn('adminOrders:removeAll:error', err);
                });
            });
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

    'server', '$scope', '$rootScope', '$routeParams',
    function(db, s, r, params) {
        console.info('app.admin.order:adminOrdersEdit');
        //
        r.toggleNavbar(true);
        r.secureSection(s);
        r.dom();
        //
        db.localData().then(function(data) {
            Object.assign(s, data);
        });
        //
        s.item = {
            email: '',
            password: '',
            status: 'ordered',
            diagStart: moment().add('day', 1).hour(9).minutes(0),
            diagEnd: moment().add('day', 1).hour(10).minutes(30),
            fastDiagComm: 0,
            price: 0
        };
        s.original = _.clone(s.item);
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
            s.item.diags = s.item.diags || {};
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

        s.$watch('item.diags',(v)=>{
            console.info('DIAGS',v);
        },true)


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
                if(v!==undefined){
                    o.label = v.substring(0, 1).toUpperCase() + v.slice(1);
                }else{
                    o.label = opt.label;
                }
            });
            return o;
        }
        s.status = createSelect({
            model: 'item.status',
            label: '(Select an status)',
            items: ['Ordered', 'Prepaid', 'Delivery', 'Complete'],
            change: (selected) => {
                s.item.status = selected.toString().toLowerCase();
            }
        });

        //
        if (params && params.id && params.id.toString() !== '-1') {
            console.info('adminOrdersEdit:params', params);
            r.dom(read, 1000);
        } else {
            console.info('adminOrdersEdit:reset');
            reset();
        }
        //
        s.cancel = function() {
            r.route('orders');
        };
        s.validate = () => {
            ifThenMessage([
                [typeof s.item._client, '!=', 'object', "Client required"],
                [_.isUndefined(s.item.address) || _.isNull(s.item.address) || s.item.address === '', '==', true, 'Address required'],
                [_.isNull(s.item.diagStart) || _.isUndefined(s.item.diagStart), '==', 'true', 'Start date required'],
                [_.isNull(s.item.diagEnd) || _.isUndefined(s.item.diagEnd), '==', 'true', 'Start date required'],
                [moment(s.item.diagStart || null).isValid(), '==', false, "Start date invalid"],
                [moment(s.item.diagEnd || null).isValid(), '==', false, "End date invalid"],
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
                if(data.ok){
                    s.message('saved', 'success');
                    s.item = data.result;
                    read();
                }else{
                    s.message('error, try later.', 'danger',0,true);
                }
                //r.route('orders', 0);
            }).error(function(err) {
                s.requesting = false;
                s.message('error, try later.', 'danger',0,true);
            });
        };
        s.delete = function() {
            s.confirm('Delete Order ' + s.item.email + ' ?', function() {
                console.log('adminOrdersEdit:remove:in-progress');
                s.message('deleting . . .', 'info');
                s.requesting = true;
                db.custom('order', 'remove', {
                    _id: s.item._id
                }).then(function(res) {
                    s.requesting = false;
                    s.message('deleted', 'info');
                    reset();
                    r.route('orders', 0);
                    console.info('adminOrdersEdit:remove:success', r.data);
                }).error(function(err) {
                    s.requesting = false;
                    s.message('error, try later.', 'danger');
                    console.warn('adminOrdersEdit:remove:error', err);
                });
            });
        };

        function reset() {
            s.item = _.clone(s.original);
        }

        function read(id) {
            s.message('loading . . .', 'info');
            s.requesting = true;
            db.ctrl('Order', 'get', {
                _id: id || params.id,
                __populate: ['_client', 'email']
            }).then(function(data) {
                s.requesting = false;
                s.item = data.result;
                if (!data.ok) {
                    s.message('not found, maybe it was deleted!', 'warning', 5000);
                } else {
                    s.message('loaded', 'success', 2000);
                }
            });
        }

    }
]);

app.directive('orderModal', function($rootScope, $timeout, $compile, $uibModal) {
    return {
        restrict: 'AE',
        replace: true,
        scope: {
            open: '=open'
        },
        template: '<output></output>',
        link: function(s, elem, attrs) {
            s.open = function(opt) {
                var modalInstance = $uibModal.open({
                    animation: true,
                    templateUrl: opt.templateUrl || 'views/partials/partial.modal.order.edit.html',
                    controller: function($scope, $uibModalInstance) {
                        var s = $scope;
                        s.title = opt.title;
                        if (!s.title) {
                            s.title = "Order";
                            if (opt.action && opt.action === 'edit') {
                                s.title += ' - Edition';
                            } else {
                                s.title = 'New ' + s.title;
                            }
                        }

                        s.save = () => {
                            ifThenMessage([
                                //[s.item., OPR.eq, '', '')],
                            ], (m) => {
                                //r.set('message', m[0]);
                            }, () => {
                                $uibModalInstance.close();
                                var rta = _.clone(s.item);
                                if (opt.action == 'edit') {
                                    rta._user = opt.item._user;
                                    rta._id = opt.item._id;
                                }
                                opt.callback(rta);
                            });
                        };
                        s.cancel = function() {
                            $uibModalInstance.dismiss('cancel');
                        };
                        if (!opt.action) {
                            throw Error('directive timeRange open require arg.action');
                        }
                        if (opt.action == 'new') {

                        }
                        if (opt.action === 'edit') {
                            s.item = opt.item;
                        }
                    }
                });
            };
            console.log('directive:diag-order:linked');
        }
    };
});

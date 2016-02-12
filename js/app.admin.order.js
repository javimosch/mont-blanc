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
            db.custom('order', 'getAll', {__populate:['_client','email']}).then(function(r) {
                console.info('adminOrders:read:success',r.data.result);
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
        s.item = {
            email: '',
            password: ''
        };
        s.original = _.clone(s.item);
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
        s.save = function() {
            s.message('saving . . .', 'info');

            s.requesting = true;


            db.custom('order', 'find', {
                email: s.item.email
            }).then(function(res) {
                s.requesting = falsee;
                if (res.data.result.length > 0) {
                    var _item = res.data.result[0];
                    if(s.item._id && s.item._id == _item._id){
                        _save();//same order
                    }else{
                        s.message('Email address in use.');
                    }
                } else {
                    _save();//do not exist.
                }
            });

            function _save() {
                s.requesting = true;
                db.custom('order', 'save', s.item).then(function(res) {
                    s.requesting = false;
                    console.info('adminOrdersEdit:save:success');
                    s.message('saved', 'success');
                    r.route('orders', 0);
                }).error(function(err) {
                    s.requesting = false;
                    s.message('error, try later.', 'danger');
                    console.warn('adminOrdersEdit:save:error', err);
                });
            }

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

        function read() {
            s.message('loading . . .', 'info');

            s.requesting = true;
            db.custom('order', 'get', {
                _id: params.id
            }).then(function(res) {
                s.requesting = false;
                console.info('adminOrdersEdit:read:success', res.data);
                s.item = res.data.result;
                if (!res.data.ok) {
                    s.message('not found, maybe it was deleted!', 'warning', 5000);
                } else {
                    s.message('loaded', 'success', 2000);
                }
            });
        }

    }
]);

var app = angular.module('app.admin.diag', ['app.common.service']);

app.controller('adminDiags', [

    'server', '$scope', '$rootScope',
    function(db, s, r) {
        console.info('app.admin.diag:adminDiags');
        //
        r.toggleNavbar(true);
        r.secureSection(s);
        s.selectedItems = [];
        s.items = [];
        //
        s.click = function(item) {
            r.route('diags/edit/' + item._id);
        };
        s.create = function() {
            r.route('diags/edit/-1');
        };
        s.delete = function(item) {
            s.confirm('Remove ' + s.selectedItems.length + ' item/s?', function() {
                console.log('adminDiags:removeAll:in-progress');
                s.message('deleting . . .', 'info');
                s.requesting = true;
                db.custom('user', 'removeAll', {
                    ids: s.selectedItems
                }).then(function(res) {
                    s.requesting = false;
                    s.message('deleted', 'info');
                    read();
                    console.info('adminDiags:removeAll:success', r.data);
                }).error(function(err) {
                    s.requesting = false;
                    s.message('error, try later.', 'danger');
                    console.warn('adminDiags:removeAll:error', err);
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
            db.custom('user', 'getAll', {userType:'diag'}).then(function(r) {
                console.info('adminDiags:read:success',r.data);
                s.items = r.data.result;
                s.message('loaded!', 'success', 1000);
            });
        }
        r.dom(read, 0);

    }
]);

app.controller('adminDiagsEdit', [

    'server', '$scope', '$rootScope', '$routeParams',
    function(db, s, r, params) {
        console.info('app.admin.diag:adminDiagsEdit');
        //
        r.toggleNavbar(true);
        r.secureSection(s);
        r.dom();
        //
        s.item = {
            email: '',
            password: '',
            address:''
        };
        s.original = _.clone(s.item);

        
        
        s.$watch('item.address',(v)=>{
            console.info('ADDRESS:CHANGE',v);
        });
        s.addressChange=(v)=>s.item.address=v;

        //
        if (params && params.id && params.id.toString() !== '-1') {
            console.info('adminDiagsEdit:params', params);
            r.dom(read, 1000);
        } else {
            console.info('adminDiagsEdit:reset');
            reset();
        }
        //
        s.cancel = function() {
            r.route('diags');
        };
        s.save = function() {
            s.message('saving . . .', 'info');

            s.requesting = true;


            db.custom('user', 'find', {
                email: s.item.email
            }).then(function(res) {
                s.requesting = false;
                if (res.data.result.length > 0) {
                    var _item = res.data.result[0];
                    if(s.item._id && s.item._id == _item._id){
                        _save();//same diag
                    }else{
                        s.message('Email address in use.');
                    }
                } else {
                    _save();//do not exist.
                }
            });

            function _save() {
                s.requesting = true;
                db.custom('user', 'save', s.item).then(function(res) {
                    s.requesting = false;
                    var _r = res.data;
                    if(_r.ok){
                        console.info('adminDiagsEdit:save:success');
                        s.message('saved', 'success');
                        r.route('diags', 0);    
                    }else{
                        console.warn('adminDiagsEdit:save:fail',_r.err);
                        s.message('error, try later', 'danger');
                    }
                    
                }).error(function(err) {
                    s.requesting = false;
                    s.message('error, try later.', 'danger');
                    console.warn('adminDiagsEdit:save:error', err);
                });
            }

        };
        s.delete = function() {
            s.confirm('Delete Diag ' + s.item.email + ' ?', function() {
                console.log('adminDiagsEdit:remove:in-progress');
                s.message('deleting . . .', 'info');
                s.requesting = true;
                db.custom('user', 'remove', {
                    _id: s.item._id
                }).then(function(res) {
                    s.requesting = false;
                    s.message('deleted', 'info');
                    reset();
                    r.route('diags', 0);
                    console.info('adminDiagsEdit:remove:success', r.data);
                }).error(function(err) {
                    s.requesting = false;
                    s.message('error, try later.', 'danger');
                    console.warn('adminDiagsEdit:remove:error', err);
                });
            });
        };

        function reset() {
            s.item = _.clone(s.original);
        }

        function read() {
            s.message('loading . . .', 'info');

            s.requesting = true;



            
            db.custom('user', 'get', {
                _id: params.id
            }).then(function(res) {
                s.requesting = false;
                console.info('adminDiagsEdit:read:success', res.data);
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

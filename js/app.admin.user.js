var app = angular.module('app.admin.user', ['app.common.service']);

app.controller('adminUsers', [

    'server', '$scope', '$rootScope',
    function(db, s, r) {
        console.info('app.admin.user:adminUsers');
        //
        r.toggleNavbar(true);
        r.secureSection(s);
        s.selectedItems = [];
        s.items = [];
        //
        s.click = function(item) {
            r.route('users/edit/' + item._id);
        };
        s.create=function(){
          r.route('users/edit/-1');  
        };
        s.delete=function(item){
            s.confirm('Remove '+s.selectedItems.length+' item/s?',function(){
                console.log('adminUsers:removeAll:in-progress');
                s.message('deleting . . .', 'info');
                s.requesting=true;
                db.custom('user', 'removeAll', {
                    ids:s.selectedItems
                }).then(function(res) {
                    s.requesting=false;
                    s.message('deleted', 'info');
                    read();
                    console.info('adminUsers:removeAll:success', r.data);
                }).error(function(err) {
                    s.requesting=false;
                    s.message('error, try later.', 'danger');
                    console.warn('adminUsers:removeAll:error', err);
                });
            });
        };
        s.select=function(){
            if(window.event){
                window.event.stopPropagation();
            }
        };

        function read() {
            s.message('loading . . .', 'info');
            db.custom('user', 'getAll', {}).then(function(r) {
                console.info('adminUsers:read:success');
                s.items = r.data.result;
                s.message('loaded!', 'success',1000);
            });
        }
        r.dom(read,0);

    }
]);

app.controller('adminUsersEdit', [

    'server', '$scope', '$rootScope', '$routeParams',
    function(db, s, r, params) {
        console.info('app.admin.user:adminUsersEdit');
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
        if (params && params.id && params.id.toString() !=='-1') {
            console.info('adminUsersEdit:params', params);
            r.dom(read,1000);
        } else {
            console.info('adminUsersEdit:reset');
            reset();
        }
        //
        s.cancel = function() {
            r.route('users');
        };
        s.save = function() {
            s.message('saving . . .', 'info');

            s.requesting=true;
            db.custom('user', 'save', s.item).then(function(res) {
                s.requesting=false;
                console.info('adminUsersEdit:save:success');
                s.message('saved', 'success');
                r.route('users', 2000);
            }).error(function(err) {
                s.requesting=false;
                s.message('error, try later.', 'danger');
                console.warn('adminUsersEdit:save:error', err);
            });

        };
        s.delete = function() {
            s.confirm('Delete User ' + s.item.email + ' ?', function() {
                console.log('adminUsersEdit:remove:in-progress');
                s.message('deleting . . .', 'info');
                s.requesting=true;
                db.custom('user', 'remove', {
                    _id: s.item._id
                }).then(function(res) {
                    s.requesting=false;
                    s.message('deleted', 'info');
                    reset();
                    r.route('users', 2000);
                    console.info('adminUsersEdit:remove:success', r.data);
                }).error(function(err) {
                    s.requesting=false;
                    s.message('error, try later.', 'danger');
                    console.warn('adminUsersEdit:remove:error', err);
                });
            });
        };

        function reset() {
            s.item = _.clone(s.original);
        }

        function read() {
            s.message('loading . . .', 'info');

            s.requesting=true;
            db.custom('user', 'get', {
                _id: params.id
            }).then(function(res) {
                s.requesting=false;
                console.info('adminUsersEdit:read:success', res.data);
                s.item = res.data.result;
                if(!res.data.ok){
                    s.message('not found, maybe it was deleted!', 'warning',5000);
                }else{
                    s.message('loaded', 'success',2000);
                }
            });
        }

    }
]);

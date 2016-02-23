var app = angular.module('app.admin.user', ['app.common.service']);

app.controller('adminUsers', [

    'server', '$scope', '$rootScope',
    function(db, s, r) {
//        console.info('app.admin.user:adminUsers');
        //
        r.toggleNavbar(true);
        r.secureSection(s);
        s.selectedItems = [];
        s.items = [];
        //
        if (r.userIs(['diag', 'client'])) {
            return r.handleSecurityRouteViolation();
        }
        //
        s.click = function(item,optionalRouteForEdition) {
            r.route((optionalRouteForEdition||'users/edit/') + item._id);
        };
        s.create = function() {
            r.route('users/edit/-1');
        };
        s.delete = function(item) {
            s.confirm('Remove ' + s.selectedItems.length + ' item/s?', function() {
                console.log('adminUsers:removeAll:in-progress');
                s.message('deleting . . .', 'info');
                s.requesting = true;
                db.custom('user', 'removeAll', {
                    ids: s.selectedItems
                }).then(function(res) {
                    s.requesting = false;
                    s.message('deleted', 'info');
                    read();
                    console.info('adminUsers:removeAll:success', r.data);
                }).error(function(err) {
                    s.requesting = false;
                    s.message('error, try later.', 'danger');
                    console.warn('adminUsers:removeAll:error', err);
                });
            });
        };
        s.select = function() {
            if (window.event) {
                window.event.stopPropagation();
            }
        };

        function read() {
            s.message('Loading . . .', 'info');
            db.custom('user', 'getAll', {}).then(function(r) {
//                console.info('adminUsers:read:success');
                s.items = r.data.result;
                s.message('Loaded', 'success', 1000);
            });
        }
        r.dom(read, 0);

    }
]);

app.controller('adminUsersEdit', [

    'server', '$scope', '$rootScope', '$routeParams',
    function(db, s, r, params) {
//        console.info('app.admin.user:adminUsersEdit');
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
        s.types = {
            selected: '(Choice a user type)',
            items: [{
                label: 'Admin',
            }, {
                label: 'Diag',
            }, {
                label: 'Client'
            }],
            click: (choice) => {
                if (typeof choice === 'string') {
                    for (var x in s.types.items) {
                        if (s.types.items[x].label.toString().toLowerCase() == choice.toString().toLowerCase()) {
                            s.types.selected = s.types.items[x].label;
                            s.item.userType = s.types.items[x].label.toString().toLowerCase();
                        }
                    }
                    return;
                } else {
                    s.item.userType = choice.label.toString().toLowerCase();
                    s.types.selected = choice.label;
                }
            }
        };
        //
        if (params && params.id && params.id.toString() !== '-1') {
//            console.info('adminUsersEdit:params', params);
            r.dom(read, 1000);
        } else {

            if (r.userIs(['diag', 'client'])) {
                //can't create an user
                return r.handleSecurityRouteViolation();
            }

            reset();
        }
        s.back = () => {
            if (r.userIs(['diag', 'client'])) {
                r.route('dashboard');
            } else {
                if (r.params && r.params.prevRoute) {
                    return r.route(r.params.prevRoute);
                    delete r.params.prevRoute;
                } else {
                    r.route('users');
                }

            }
        };
        //
        s.cancel = function() {
            s.back();
        };
        s.validate = () => {
            ifThenMessage([
                [s.item.userType, '==', undefined, "User type required"],
                [s.item.email, '==', '', "Email cannot be empty"],
                [s.item.password, '==', '', "Password cannot be empty"]
            ], (m) => {
                s.message(m[0], 'warning', 0, true);
            }, s.save);
        };
        s.save = function() {
            s.message('saving . . .', 'info');

            s.requesting = true;


            db.ctrl('User', 'getAll', {
                email: s.item.email,
                userType: s.item.userType
            }).then(function(data) {
                var result = data.result;
                s.requesting = false;
                if (data.result.length > 0) {
                    var _item = data.result[0];
                    if (s.item._id && s.item._id == _item._id) {
                        _save(); //same user
                    } else {
                        s.message('Email address in use.');
                    }
                } else {
                    _save(); //do not exist.
                }
            });

            function _save() {
                s.requesting = true;
                db.custom('user', 'save', s.item).then(function(res) {
                    s.requesting = false;
                    var _r = res.data;
                    if (_r.ok) {

                        //if current user, update session.
                        if(_r.result){
                            if(_r.result._id == r.session()._id){
                                r.session(_r.result);
                            }
                        }

                        s.message('saved', 'success');
                        s.back();
                    } else {
                        s.message('error, try later', 'danger');
                    }
                }).error(function(err) {
                    s.requesting = false;
                    s.message('error, try later.', 'danger');
                });
            }

        };
        s.delete = function() {
            s.confirm('Delete User ' + s.item.email + ' ?', function() {
                console.log('adminUsersEdit:remove:in-progress');
                s.message('deleting . . .', 'info');
                s.requesting = true;
                db.custom('user', 'remove', {
                    _id: s.item._id
                }).then(function(res) {
                    s.requesting = false;
                    s.message('deleted', 'info');
                    reset();
                    s.back();
                    console.info('adminUsersEdit:remove:success', r.data);
                }).error(function(err) {
                    s.requesting = false;
                    s.message('error, try later.', 'danger');
                    console.warn('adminUsersEdit:remove:error', err);
                });
            });
        };

        function reset() {
            s.item = _.clone(s.original);
        }

        function read() {

            if (r.userIs(['diag', 'client'])) {
                //only can see his own info
                if (params.id !== r.session()._id) {
                    return r.handleSecurityRouteViolation();
                }
            }

            s.message('Loading . . .', 'info');

            s.requesting = true;
            db.custom('user', 'get', {
                _id: params.id
            }).then(function(res) {
                s.requesting = false;
                s.item = res.data.result;
                if (!res.data.ok) {
                    s.message('not found, maybe it was deleted!', 'warning', 5000);
                } else {
                    s.types.click(s.item.userType);
                    s.message('Loaded', 'success', 2000);
                }
            });
        }

    }
]);

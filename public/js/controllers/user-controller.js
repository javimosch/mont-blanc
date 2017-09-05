(function() {
    /*global angular, _, $U, moment*/
    angular.module('user-feature-module').controller('adminUsersEdit', [

        'server', '$scope', '$rootScope', '$routeParams', 'tpl', 'paymentApi', '$log', 'localSession', 'backendApi',
        function(db, $scope, $rootScope, params, tpl, paymentApi, $log, localSession, backendApi) {
            //        console.info('app.admin.user:adminUsersEdit');
            //

            $scope.uploads = {
                logo: ''
            };
            $scope.logoUrl = () => $scope.item && $scope.item._logo && '/res/' + $scope.item._logo.type + '/' + $scope.item._logo.fileName;
            $scope.brandLogoChanged = () => {
                if (!$scope.item) return;
                $log.debug($scope.uploads);
                if ($scope.uploads.logo && $scope.uploads.logo.type.indexOf('image') !== -1) {
                    backendApi.uploads.saveImage({
                        file: $scope.uploads.logo,
                        //fileName: 'client_' + $scope.item._id + '_brand-logo',
                        code: 'BRAND_LOGO_' + $scope.item.email.replace('@', '_ARROBA_').replace('.', '_DOT_').toUpperCase()
                    }).then(res => {

                        backendApi.user.update({
                            _id: $scope.item._id,
                            _logo: res.result._id
                        });
                        $scope.item._logo = res.result;

                    }).catch($log.error).on('validate', $log.warn);
                }
                else {
                    $rootScope.infoMessage('Image required');
                }
            };

            $scope.createWallet = function() {
                paymentApi.registerUserWallet($scope.item).then(function() {
                    $rootScope.infoMessage('Linked to ' + $scope.item.wallet + '.');
                    $scope.save(true);
                }).error(function(res) {
                    $rootScope.errorMessage();
                }).on('validate', function(msg) {
                    $rootScope.warningMessage(msg);
                });
            };


            $rootScope.toggleNavbar(true);
            $rootScope.secureSection($scope);
            $rootScope.dom();
            //
            $U.expose('s', $scope);
            //
            $scope.item = {
                email: '',
                password: ''
            };

            if ($rootScope.params && $rootScope.params.item) {
                $scope.item = Object.assign($rootScope.params.item);
                delete $rootScope.params.item;
            }

            $scope.original = _.clone($scope.item);
            //
            $scope.types = {
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
                        for (var x in $scope.types.items) {
                            if ($scope.types.items[x].label.toString().toLowerCase() == choice.toString().toLowerCase()) {
                                $scope.types.selected = $scope.types.items[x].label;
                                $scope.item.userType = $scope.types.items[x].label.toString().toLowerCase();
                            }
                        }
                        return;
                    }
                    else {
                        $scope.item.userType = choice.label.toString().toLowerCase();
                        $scope.types.selected = choice.label;
                    }
                }
            };
            //
            if (params && params.id && params.id.toString() !== '-1') {
                //            console.info('adminUsersEdit:params', params);
                $rootScope.dom(read, 1000);
            }
            else {

                if ($rootScope.userIs(['diag', 'client'])) {
                    //can't create an user
                    return $rootScope.handleSecurityRouteViolation();
                }

                reset();
            }
            $scope.back = () => {
                if ($rootScope.userIs(['diag', 'client'])) {
                    $rootScope.route('dashboard');
                }
                else {
                    if ($rootScope.params && $rootScope.params.prevRoute) {
                        var _r = $rootScope.params.prevRoute;
                        delete $rootScope.params.prevRoute;
                        return $rootScope.route(_r);
                    }
                    else {
                        //r.route('users');
                        console.warn('r.params.prevRoute required');
                        $rootScope.route('dashboard');
                    }
                }
            };
            //


            $scope.notifyClientNewAccount = () => {
                db.ctrl('Notification', 'CLIENT_NEW_ACCOUNT', $scope.item).then(res => {
                    console.info('RTA', res.result);
                });
            };


            $scope.showInputFirstName = () => {
                if ($scope.isClientLandlord() && $scope.item.legalStatus === '1') {
                    return false; //indivision
                }
                else {
                    return true;
                }
            };
            $scope.showInputSiret = $scope.showInputCompayName = () => {
                if ($scope.isClientLandlord() && $scope.item.legalStatus !== '0') {
                    return false; //Indivision, physic
                }
                else {
                    return true;
                }
            };
            $scope.addressPlaceholder = () => {
                if ($scope.isClientLandlord() && $scope.item.legalStatus == '2') {
                    return "Adresse résidence principale"; //physic
                }
                else {
                    return "Adresse";
                }
            };


            $scope.cancel = function() {
                $scope.back();
            };

            $scope.isCurrent = () => {
                return $rootScope.session()._id == $scope.item._id;
            };

            $scope.isAdmin = () => $scope.item.userType === 'admin';

            $scope.isClient = () => $scope.item.userType === 'client';
            $scope.isClientLandlord = () => $scope.item.userType === 'client' && $scope.item.clientType === 'landlord';

            $scope.validate = () => {
                $U.ifThenMessage([
                    [!$scope.item.userType, '==', true, "User type est nécessaire"],
                    [!$scope.item.firstName, '==', true, "Prénom est nécessaire"],
                    [!$scope.item.email, '==', true, "Email est nécessaire"],

                    [$scope.isAdmin() && !$scope.item.password, '==', true, "Password est nécessaire"],
                    [$scope.isClient() && !$scope.isClientLandlord() && !$scope.item.password, '==', true, "Password est nécessaire"],


                    [$scope.item.userType !== 'admin' && !$scope.item.clientType, '==', true, "clientType est nécessaire"],

                    [$scope.isClient() && $scope.item.discount == undefined, '==', true, "Discount est nécessaire"],
                    [$scope.isClient() && isNaN($scope.item.discount), '==', true, "Discount allowed values are 0..100"],
                    [$scope.isClient() && ($scope.item.discount < 0 || $scope.item.discount > 100), '==', true, "Discount allowed values are 0..100"]

                ], (m) => {
                    $scope.message(m[0], 'warning', 0, true);
                }, $scope.save);
            };

            $scope.showGuessAccountAlert = () => {
                return localSession.isAdmin();
            };
            $scope.showIfGuessAccount = () => {
                return $scope.item.isGuestAccount;
            };



            $scope.save = function(silent) {
                silent = silent || false;
                db.ctrl('User', 'getAll', {
                    email: $scope.item.email,
                    userType: $scope.item.userType,
                    clientType: $scope.item.clientType
                }).then(function(data) {


                    if (data.result.length > 0) {
                        var _item = data.result[0];
                        if ($scope.item._id && $scope.item._id == _item._id) {
                            _save(); //same user
                        }
                        else {
                            if (!silent) {
                                $scope.message('Email address in use.');
                            }
                        }
                    }
                    else {
                        _save(); //do not exist.
                    }
                });

                function _save() {

                    if ($scope.item.userType == 'client' && $scope.item.clientType == 'landlord') {

                        if (!$scope.item.password) {
                            $scope.item.isGuestAccount = true;
                        }
                        else {
                            $scope.item.isGuestAccount = false;
                        }
                    }

                    db.ctrl('User', 'save', $scope.item).then(function(res) {
                        if (res.ok) {

                            //if current user, update session.
                            if (res.result) {
                                if (res.result._id == $rootScope.session()._id) {
                                    $rootScope.session(res.result);
                                }
                            }



                            if (!silent) {
                                $scope.message('saved', 'success');
                                $scope.back();
                            }

                        }
                        else {
                            if (!silent) $scope.message('error, try later', 'danger');
                        }
                    }).error(function(_err) {
                        if (!silent) $scope.message('error, try later.', 'danger');
                    });
                }

            };
            $scope.delete = function() {
                userHasRelatedOrders().on('yes', (_err, r) => {
                    $scope.relatedOrders = r.relatedOrders || [
                        'data.relatedOrders required'
                    ];
                    $scope.okModal({
                        messageEl: tpl.compile('user.delete.associated-orders', $scope)
                    }, () => {
                        delete $scope.relatedOrders;
                    });

                }).on('no', () => {
                    _proceedDelete();
                });

                function _proceedDelete() {
                    $rootScope.openConfirm('Delete User ' + $scope.item.email + ' ?', function() {
                        db.ctrl('User', 'remove', {
                            _id: $scope.item._id
                        }).then(function(res) {
                            $scope.message('deleted', 'info');
                            reset();
                            $scope.back();
                        }).error(function(_err) {
                            $scope.requesting = false;
                            $scope.message('error, try later.', 'danger');
                        });
                    });
                }
            };

            function reset() {
                $scope.item = _.clone($scope.original);
            }

            function read() {

                if ($rootScope.userIs(['diag', 'client'])) {
                    //only can see his own info
                    if (params.id !== $rootScope.session()._id) {
                        return $rootScope.handleSecurityRouteViolation();
                    }
                }

                //s.message('Loading . . .', 'info');

                $scope.requesting = true;
                db.ctrl('User', 'get', {
                    _id: params.id,
                    __populate: {
                        _logo: "type fileName"
                    }
                }).then(function(res) {
                    $scope.item = res.result;

                    localSession.setMetadata({
                        selectedClient: {
                            _id: $scope.item._id,
                            email: $scope.item.email,
                            firstName: $scope.item.firstName,
                            lastName: $scope.item.lastName
                        }
                    });

                    if (!res.ok) {
                        $scope.message('not found, maybe it was deleted!', 'warning', 5000);
                    }
                    else {
                        $scope.types.click($scope.item.userType);
                        //s.message('Loaded', 'success', 2000);
                    }
                });
            }


            function userHasRelatedOrders(cb) {
                var time = (d) => moment(d).format('HH:mm');
                var descr = (_order) => _order.address + ' (' + time(_order.start) + ' - ' + time(_order.end) + ')';
                return $U.MyPromise((resolve, error, emit) => {
                    if ($scope.item.userType === 'admin') {
                        return emit('no'); //admin has no orders associated.
                    }
                    var rules = {
                        __select: "start end address" //we only need those 3 fields to build the description.
                    };
                    if ($scope.item.userType === 'client') {
                        rules['_client'] = $scope.item._id;
                    }
                    if ($scope.item.userType === 'diag') {
                        rules['_diag'] = $scope.item._id;
                    }
                    db.ctrl('Order', 'getAll', rules).then(data => {
                        if (data.ok && data.result && data.result.length > 0) {
                            var relatedOrders = [];
                            data.result.forEach(_order => {
                                relatedOrders.push(descr(_order));
                            });
                            emit('yes', null, {
                                relatedOrders: relatedOrders
                            });
                        }
                        else {
                            emit('no');
                        }
                    });
                });
            }

        }
    ]);
})();

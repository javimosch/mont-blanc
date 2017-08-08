(function() {
    angular.module('app').service('localSession', ['$rootScope', '$log', 'backendApi', function($rootScope, $log, backendApi) {
        /*global angular $U*/

        window.localforage.getItem('_token').then((token) => {
            if (token) $log.log('token is set (cache)');
        });

        $rootScope.$on('click_logout', () => {
            window.localforage.removeItem('_token').then(() => {
                $log.log('token is unset');
            });
        });

        var self = {
            logout: () => {

                $rootScope.logout();
            },
            isAdmin: () => {
                return self.isLogged() && self.getData().userType == 'admin';
            },
            isLogged: () => {
                return $rootScope.logged();
            },
            getData: () => {
                return $rootScope.session() || {};
            },
            getMetadata: () => {
                var rta = $rootScope.sessionMetadata() || {};
                //$log.info('getMetadata', _.clone(rta));
                return rta;
            },
            setMetadata: (newMetadata, reset) => {
                //$log.info('setMetadata', Object.keys(newMetadata));
                return $rootScope.sessionMetadata(newMetadata, reset) || {};
            },
            update: () => {
                return $U.MyPromise(function(resolve, error) {
                    backendApi.User.getById($rootScope.session()).then(function(res) {
                        $rootScope.session(res.result);
                        resolve(res.result);
                    }).error($log.error).on('validate', $log.warn);
                });
            },
            getToken: () => {
                return $U.MyPromise(function(resolve, error) {
                    window.localforage.getItem('_token').then(token => {
                        backendApi.user.isSessionExpired({}).then(res => {
                            if (res.result == true) return resolve(null);
                            return resolve(token);
                        }).catch((err) => {
                            return error(err);
                        });
                    });
                });
            },
            tokenMiddlewareXHRStart: (data) => {
                data = data || {};
                return $U.MyPromise(function(resolve, error) {
                    window.localforage.getItem('_token').then((token) => {
                        data._token = token;
                        resolve(data);
                    }).catch(resolve)
                });
            },
            tokenMiddlewareXHREnd: (data) => {
                return $U.MyPromise(function(resolve, error) {
                    if (data._sessionToken) {
                        window.localforage.setItem('_token', data._sessionToken).then(() => {
                            data._sessionToken = undefined;
                            $log.log('Token set');
                            resolve();
                        }).catch(resolve)
                    }
                    else {
                        resolve();
                    }
                });
            }
        };
        $U.exposeGlobal('ls', self);
        return self;
    }]);
})();

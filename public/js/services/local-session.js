(function() {
    //Const querystring parameters must be taken before angular routes start (Because they clear the url)
    var TOKEN = $U.url.get('token');
    angular.module('app')
        .constant('queryStringParams', {
            "TOKEN": TOKEN
        })
        .service('localSession', ['$rootScope', '$log', 'backendApi', 'queryStringParams', function($rootScope, $log, backendApi, queryStringParams) {
            /*global angular $U*/

            window.localforage.getItem('_token').then((token) => {
                if (token) $log.debug('token is set (cache)');
            });

            $rootScope.$on('click_logout', () => {
                window.localforage.removeItem('_token').then(() => {
                    $log.debug('token is unset');
                });
            });


            var hasParentTokenBeenValidated = false;
            handleParentToken();

            function handleParentToken() {
                if (queryStringParams.TOKEN) {
                    window.localforage.setItem('_token', queryStringParams.TOKEN).then(() => {
                        hasParentTokenBeenValidated = true; //Found, this app is iframe
                    });
                }
                else {
                    hasParentTokenBeenValidated = true; //Not found
                }
            }

            $rootScope.getCachedApiToken = () => {
                return self && self.cachedToken || "XXX";
            };

            var self = {
                /*
                    iframe require CSRF and TOKEN from top window object
                */
                waitParentToken: () => {
                    return $U.MyPromise(function(resolve, error) {
                        var temp = setInterval(() => {
                            if (hasParentTokenBeenValidated) {
                                clearInterval(temp);
                                resolve();
                            }
                        }, 500);
                    });
                },
                cachedToken: null,
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
                    //$log.debug('getMetadata', _.clone(rta));
                    return rta;
                },
                setMetadata: (newMetadata, reset) => {
                    //$log.debug('setMetadata', Object.keys(newMetadata));
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
                                self.cachedToken = token;
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
                            self.cachedToken = data._sessionToken;
                            window.localforage.setItem('_token', data._sessionToken).then(() => {
                                data._sessionToken = undefined;
                                $log.debug('Token set');
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

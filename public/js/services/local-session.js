(function() {
    angular.module('app').service('localSession', ['$rootScope', '$log', 'backendApi', function(r, $log, backendApi) {
        /*global angular $U*/
        var self = {
            logout: () => {
                r.logout();
            },
            isAdmin: () => {
                return self.isLogged() && self.getData().userType == 'admin';
            },
            isLogged: () => {
                return r.logged();
            },
            getData: () => {
                return r.session() || {};
            },
            getMetadata: () => {
                var rta = r.sessionMetadata() || {};
                //$log.info('getMetadata', _.clone(rta));
                return rta;
            },
            setMetadata: (newMetadata, reset) => {
                //$log.info('setMetadata', Object.keys(newMetadata));
                return r.sessionMetadata(newMetadata, reset) || {};
            },
            update: () => {
                return $U.MyPromise(function(resolve, error) {
                    backendApi.User.getById(r.session()).then(function(res) {
                        r.session(res.result);
                        resolve(res.result);
                    }).error($log.error).on('validate', $log.warn);
                });
            }
        };
        $U.exposeGlobal('ls', self);
        return self;
    }]);
})();

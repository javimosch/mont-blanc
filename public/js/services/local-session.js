(function() {
    angular.module('app').service('localSession', ['$rootScope', '$log', 'backendApi', function(r, $log, backendApi) {
        /*global angular*/
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
                return r.sessionMetadata() || {};
            },
            setMetadata: (newMetadata) => {
                return r.sessionMetadata(newMetadata) || {};
            },
            update: () => {
                backendApi.User.getById(r.session()).then(function(res) {
                    r.session(res.result);
                }).error($log.error).on('validate', $log.warn);
            }
        };
        $U.exposeGlobal('ls', self);
        return self;
    }]);
})();

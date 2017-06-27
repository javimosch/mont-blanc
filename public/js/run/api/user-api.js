(function() {
    /*global angular*/
    angular.module('app').run(function(backendApi, $rootScope, $log, localSession) {

        function generateHandlerFor(name,giveResultKey) {
            giveResultKey = giveResultKey || false
            return function(data, resolve, reject, emit) {
                return this.action(name, data)
                    .then((res)=>{
                        if(giveResultKey){
                            return resolve(res.result);
                        }else{
                            return resolve(res);
                        }
                    }).error(reject)
                    .on('validate', (m) => emit('validate', m))
                    .on('validate:error', (m) => emit('validate:error', m));
            };
        }

        backendApi.addController('users', 'User', {
            fetchBookingSystemUser: generateHandlerFor('fetchBookingSystemUser',true),
            createSystemUser: generateHandlerFor('createSystemUser'),
            setAsGuestAccount: generateHandlerFor('setAsGuestAccount',true),
            setAsNormalAccount: generateHandlerFor('setAsNormalAccount',true),
            saveCoupon:(data)=>backendApi.coupons.save(data),
            sessionToggleGuestFeature: function(data, resolve, reject, emit) {
                data = {};
                var session = localSession.getData();
                if (!session._id) return $log.warn('Session _id required');
                var msg = session.isGuestAccount ? "To normal account" : "To guess account";
                $log.debug(msg);
                var action = session.isGuestAccount ? "setAsNormalAccount" : "setAsGuestAccount";
                data._id = session._id;

                if (!session.isGuestAccount) {
                    $log.debug("Logging out...");
                    localSession.logout();
                }

                return this.action(action, data)
                    .then((res) => {
                        resolve(res);
                        localSession.update();
                    }).error(reject)
                    .on('validate', (m) => emit('validate', m))
                    .on('validate:error', (m) => emit('validate:error', m));
            },
        });

    });
})();

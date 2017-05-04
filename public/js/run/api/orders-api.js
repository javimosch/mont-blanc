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

        backendApi.addController('orders', 'Order', {
            sendQuote: generateHandlerFor('sendQuote',true),
        });

    });
})();

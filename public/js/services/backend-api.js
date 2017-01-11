/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
    var app = angular.module('app').service('backendApi', function($rootScope, server, $log) {

        function getLemonwayMessage(res) {
            return res.err.Msg + '  (LEMONWAY CODE ' + res.err.Code + ')';
        }

        function getGenericMessage(res) {
            return (res.err && (res.err.message || res.err.msg) || JSON.stringify(err)) + '  (BACKEND)';
        }

        function handle(controller, action, payload) {
            return MyPromise(function(resolve, err, emit) {
                server.ctrl(controller, action, payload).then(function(res) {
                    if (res.ok != undefined && res.ok == false) {
                        if (res.err && res.err.Code) {
                            return emit('validate', getLemonwayMessage(res));
                        }
                        if (res.err) {
                            return emit('validate', getGenericMessage(res));
                        }
                        err(res);
                    }
                    else {
                        resolve(res);
                    }
                }).error(function(res) {
                    if (res.err && res.err.Code) {
                        return emit('validate', getLemonwayMessage(res));
                    }
                    if (res.err) {
                        emit('validate', getGenericMessage(res));
                    }
                    err(res);
                });
            });
        }

        var self = {
            payOrder: function(data) {
                return handle('order', 'payUsingLW', data);
            }
        };
        $rootScope._backendApi = self;
        return self;

    });
})();

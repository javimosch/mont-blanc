/*global angular*/
/*global _*/
/*global moment*/
/*global $U*/
(function() {
    var app = angular.module('app').service('orderRdv', ['$rootScope', '$log', 'server', function($rootScope, $log, db) {

        function fetchDiagGuys() {
            return $U.MyPromise(function(resolve, err, emit) {
                db.ctrl('User', 'getAll', {
                    userType: 'diag',
                    __rules: {
                        disabled: {
                            $ne: true
                        }
                    },
                    __select: 'priority'
                }).then((data) => {
                    resolve(data.result.map((v) => ({
                        _id: v._id,
                        priority: v.priority
                    })));
                });
            });
        }

        function getAll() {

            fetchDiagGuys().then(function(data) {
                $log.debug(diags);
            });

        }


        var self = {
            getAll: getAll
        };
        return self;

    }]);
})();
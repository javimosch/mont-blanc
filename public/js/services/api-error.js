/*global angular*/
(function() {
    angular.module('app').service('apiError', function($rootScope, server, $log, $http) {
        var errors = {};

        function ApiError(error) {
            if (!error.code) {
                $log.warn('apiError code 2333 (Unkown code)');
                error.code = 2333;
            }
            var props = {};
            props.isEqual = {};
            for (var name in errors) {
                props.isEqual[name] = errors[name].code == error.code;
            }
            props.isKnown = function() {
                for (var x in errors) {
                    if (errors[x].code == error.code) return true;
                }
                return false;
            };
            props.toString = function() {
                return error.message || error.msg || JSON.stringify(error);
            }
            return props;
        }

        var self = function(error) {
            return new ApiError(error);
        };

        $http({
            method: 'GET',
            url: '/api/errors'
        }).then(function(res) {
            errors = res.data;
            $log.debug(res);
        }, (err) => {
            $log.error(err);
        });

        return self;
    });
})();

/*global angular*/
(function() {
    angular.module('app').service('apiError', function($rootScope, server, $log, $http) {
        var errors = {};
        
        var self = function(error) {
            if(!error.code){
                $log.warn('apiError constructor requires an error with code property.');
            }
            var props = {};
            props.isEqual = {};
            for(var name in errors){
                props.isEqual[name]= errors[name].code == error.code;
            }
            props.isKnown = function(){
              for(var x in errors){
                  if(errors[x].code == error.code) return true;
              }
              return false;
            };
            return props;
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

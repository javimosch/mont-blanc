(function() {
    /*global angular*/
    /*global $U*/
    angular.module('app').service('snippets', function() {
        var self = {};
        self.exposeGlobal = $U.exposeGlobal;
        return self;
    });
})();


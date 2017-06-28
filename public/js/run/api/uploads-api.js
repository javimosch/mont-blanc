(function() {
    /*global angular*/
    angular.module('app').run(function(backendApi, $rootScope, $log, localSession) {
        backendApi.addController('uploads', 'uploads', {
            saveImage: backendApi.generateMultipartSingleFileAction('saveImage'),
        });
    });
})();

/*global angular*/
(function() {
    angular.module('app').service('Gitlab', function(backendApi) {
        var self = {};
        const projectId = '1295177';
        self.fetchProjectTags = () => {
            return backendApi.gitlab.custom('getTags', {
                projectId: projectId
            });
        };
        return self;
    });
})();

var resolver = require('../model/facades/resolver-facade');
var API_KEY = resolver.env().GITLAB_API_KEY;
var logger = resolver.ctrl('Log').createLogger({
    name: "GITLAB",
    category: ""
});
var status = {};
module.exports = {
    getTags: getTags
};

function getTags(data, cb) {
    return resolver.promise((resolve, reject) => {
        if (!API_KEY) {
            return resolver.responseFacade().error("API_KEY env required", cb, resolve);
        }
        if (!data.projectId) {
            return resolver.responseFacade().error("projectId required", cb, resolve);
        }

        //logger.debug('Requesting tags....');

        var URL = 'https://gitlab.com/api/v4/projects/' + data.projectId + '/repository/tags?private_token=' + API_KEY;

        resolver.http().get({
            url: URL,
            json: true
        }, function(error, res, data) {

            if (error) {
                logger.error(error);
            }

            if (data) {
                data = resolver._().map(data, obj => {
                    return {
                        name: obj.name,
                        description: obj.release && obj.release.description || obj.message || ""
                    }
                });
            }

            //logger.debug('getTags response', data);
            resolver.responseFacade().json(data, cb, resolve);
        });

    });
}

//GET /projects?private_token=9koXpg98eAheJpvBs5tK
//GET /projects/:id/repository/tags

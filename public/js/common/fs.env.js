(function(self) {
    self.env = {};
    var env = self.env;
    //frontstuff envs
    env.APP_NAME = 'FRONTSTUFF';
    env.CONFIG_JSON_PATH = './config.json';
    env.STORE_SESSION_PREFIX = '_SESSION';
    env.$set = function(config) {
        Object.keys(config).forEach(k => {
            env[k] = config[k];
        });
    };
})(window);
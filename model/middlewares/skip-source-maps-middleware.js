var skipMap = require('skip-map')

module.exports = {
    bind: (app) => {
        app.use(skipMap());
    }
};

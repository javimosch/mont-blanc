var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
const cache = require('cache-headers');
const cacheOptions = {
    paths: {
        '/fonts/**': {
            maxAge: 'TEN_MINUTES',
            sMaxAge: 'ONE_DAY',
            staleRevalidate: 'ONE_HOUR',
            staleError: 'ONE_HOUR'
        },
        '/css/**': {
            maxAge: 'TEN_MINUTES',
            sMaxAge: 'ONE_DAY',
            staleRevalidate: 'ONE_HOUR',
            staleError: 'ONE_HOUR'
        },
        '/views/**': {
            maxAge: 60,
            sMaxAge: 600
        },
        '/api/**': false,
        '/**': false
    }
};

module.exports = {
    bind(app) {
        if(!resolver.env().DISABLE_CACHE){
            app.use(cache.middleware(cacheOptions));
        }
    }
};

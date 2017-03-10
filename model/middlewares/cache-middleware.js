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
        '/ctrl/**': false,
        '/**': false
    }
};

module.exports = {
    bind(app) {
        app.use(cache.middleware(cacheOptions));
    }
};

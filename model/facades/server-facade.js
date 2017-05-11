var status = {};
module.exports = {
    set: (expressInstance) => {
        status.http = expressInstance;
    },
    get: () => status.http
};

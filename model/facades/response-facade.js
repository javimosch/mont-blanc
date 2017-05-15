var path = require('path');
var apiError = require(path.join(process.cwd(), 'model/errors'));
var ctrl = require(path.join(process.cwd(), 'model/db.controller')).create;
var logger = ctrl('Log').createLogger({
    name: "RESPONSE-FACADE"
});

function error(error, apiCallback, promiseReject) {
    if (!error) {
        error = apiError.UNKOWN_ERROR;
    }
    if (apiCallback) {
        apiCallback(error);
    }
    if (promiseReject) {
        promiseReject(error);
    }
}

function json(response, apiCallback, promiseResolve) {
    if (apiCallback) {
        apiCallback(null, response);
    }
    if (promiseResolve) {
        promiseResolve(response);
    }
    if(!apiCallback && !promiseResolve){
        logger.warn('apiCallback or promiseResolve required');
    }
}

function errorWithInvalidVariable(varName, path, cb, reject) {
    var err = apiError.INVALID_VARIABLE_AT_PATH(varName, path);
    if(!err) logger.error("errorWithInvalidVariable can't return no error");
    logger.errorSave(err);
    if (cb) cb(err);
    if (reject) reject(err);
}

module.exports = {
    error: error,
    json: json,
    errorWithInvalidVariable: errorWithInvalidVariable
};

var fs = require("fs"),
    json;
var urlencode = require('urlencode2');
var urldecode = require('urldecode');
var moment = require('moment');
var path = require('path');
var tempFolderPath = process.env.tempFolderPath || '/public/temp/';
var filesPath = '/public/files/';


var dbLogger = null;


var ensureDirectory = (path) => {
    if (!fs.existsSync(path))
        fs.mkdirSync(path);
};
exports.ensureDirectory=ensureDirectory;

function loggerDelayedInit() {
    if (!dbLogger) {
        dbLogger = require(path.join(process.cwd(), 'model/db.controller')).create('Log').createLogger({
            name: "backend-general",
            category: "UTILS"
        });
    }
}

function getFileTempPath(n) {
    var path = process.cwd() + tempFolderPath + (n || '');
    path = replaceAll(path, '//', '/');
    //console.log('debug ctrl.pdf.getFileTempPath', path);
    return path;
}
exports.getFileTempPath = getFileTempPath;

function getFilePath(fileName) {
    var path = process.cwd() + filesPath + (fileName || '');
    path = replaceAll(path, '//', '/');
    console.log('debug getFilePath', path);
    return path;
}
exports.getFilePath = getFilePath;

exports.has = (data, props) => {
    for (var x in props) {
        if (typeof data[props[x]] === 'undefined') return false;
        if (data[props[x]] === undefined) return false;
    }
    return true;
};

exports.encodeURIComponent = urlencode;
exports.decodeURIComponent = urldecode;

exports.formatTime = (d) => {
    return moment(d).format('HH:mm');
};

function readFileSync(file, encoding, json) {
    var filepath = __dirname + '/' + file;
    if (typeof(encoding) == 'undefined') {
        encoding = 'utf8';
    }
    var x = fs.readFileSync(filepath, encoding);
    return (json) ? JSON.parse(x) : x;
}
exports.getJSON = (file) => readFileSync(file, undefined, true);
exports.getFile = (file) => readFileSync(file, undefined, false);

function replaceAll(word, search, replacement) {
    return word.replace(new RegExp(search, 'g'), replacement);
}

exports.replaceAll = replaceAll;

function cbHell(quantity, cb) {
    return {
        call: () => cb(),
        next: () => {
            quantity--;
            console.log('backstuff-utils-cbHell: ' + quantity + ' threads left.');
            if (quantity === 0) cb();
        }
    };
}
exports.cbHell = cbHell;

//routing
function adminUrl(join, serverURL) {
    loggerDelayedInit();
    var host = serverURL || process.env.serverURL || 'http://localhost:3000';
    var rta = path.join(host, join);
    if (!serverURL && !process.env.serverURL) {
        dbLogger.warnSave('Enviromental serverURL required');
    }
    dbLogger.debugTerminal('adminUrl resolves ', rta);
    return rta;
}
exports.adminUrl = adminUrl;


function MyPromise(cb) {
    var _scope = {
        cb: null,
        errorCb: null,
        errorRes: null,
        res: null,
        evt: {}
    };
    var resolve = function(res) {
        if (_scope.cb) {
            _scope.cb(res);
        }
        _scope.res = res || {};
    };
    var error = function(errorRes) {
        if (_scope.errorCb) {
            _scope.errorCb(errorRes);
        }
        _scope.errorRes = errorRes || {};
    };
    var emit = function(n, err, r) {
        _scope.evt[n] = _scope.evt[n] || {};
        _scope.evt[n].res = {
            err: err,
            r: r
        };
        if (_scope.evt[n].cb !== undefined) {
            _scope.evt[n].cb(_scope.evt[n].res.err, _scope.evt[n].res.r);
        }
    };
    cb(resolve, error, emit);
    var rta = {
        then: function(cb) {
            if (_scope.res) cb(_scope.res);
            else _scope.cb = cb;
            return rta;
        },
        error: function(errorCb) {
            if (_scope.errorRes) errorCb(_scope.errorRes);
            else _scope.errorCb = errorCb;
            return rta;
        },
        on: function(n, cb) {
            _scope.evt[n] = _scope.evt[n] || {};
            _scope.evt[n].cb = cb;
            if (_scope.evt[n].res !== undefined) {
                _scope.evt[n].cb(_scope.evt[n].res.err, _scope.evt[n].res.r);
            }
            return rta;
        }
    };
    return rta;
}

exports.promise = MyPromise;
exports.Promise = MyPromise;
exports.MyPromise = MyPromise;

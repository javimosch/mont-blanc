var getHashParams = function() {
        var hashParams = {};
        var e,
            a = /\+/g, // Regex for replacing addition symbol with a space
            r = /([^&;=]+)=?([^&;]*)/g,
            d = function(s) {
                return decodeURIComponent(s.replace(a, " "));
            },
            q = window.location.hash.substring(1);
        while (e = r.exec(q)) {
            hashParams[d(e[1])] = d(e[2]);
        }
        return hashParams;
};

function MyPromise(cb) {
    var _scope = {
        cb: null,
        errorCb: null,
        errorRes: null,
        res: null
    };
    var resolve = function(res) {
        if (_scope.cb) {
            _scope.cb(res);
        }
        _scope.res = res;
    };
    var error = function(errorRes) {
        if (_scope.errorCb) {
            _scope.errorCb(errorRes);
        }
        _scope.errorRes = errorRes;
    };
    cb(resolve, error);
    rta = {
        then: function(cb) {
            if (_scope.res) cb(_scope.res);
            else _scope.cb = cb;
            return rta;
        },
        error: function(errorCb) {
            if (_scope.errorRes) errorCb(_scope.errorRes);
            else _scope.errorCb = errorCb;
            return rta;
        }
    };
    return rta;
}
if (typeof exports !== 'undefined') {
    exports.MyPromise = MyPromise;
    exports.getHashParams = getHashParams;
}else{
    window.MyPromise = MyPromise;
    window.getHashParams = getHashParams;
}

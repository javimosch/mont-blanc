"use strict";

function numberBetween(n,min,max){
    return n>=min && n<=max;
}

function expose(path, v) {
    setVal(window, path, v);

    function setVal(obj, propertyPath, _v) {
        var split = propertyPath.split('.');
        var lastIndex = split.length - 1;
        split.forEach((chunk, index) => {
            var isLast = lastIndex == index;
            if (isLast) return false;
            obj = obj[chunk] || {};
            if (!obj) return false;
        });
        if (obj) {
            if (_v) obj[split[lastIndex]] = _v;
            return obj[split[lastIndex]];
        }
    }
}


function has(v,arr){
    for(var x in arr){
        if(v==arr[x]) return true;
    }
    return false;
}

function valid(obj,propertyPath,opt){
    var split = propertyPath.split('.');
    var lastIndex = split.length - 1;
    split.forEach((chunk, index) => {
        var isLast = lastIndex == index;
        if (isLast) return false
        obj = obj[chunk] || {};
        if (!obj) return false
    });
    if (obj) {
        var rta = obj[split[lastIndex]];
        if(rta) return true;
    }else{
        return false;
    }
}

function val(obj, propertyPath, opt) {
    var split = propertyPath.split('.');
    var lastIndex = split.length - 1;
    split.forEach((chunk, index) => {
        var isLast = lastIndex == index;
        if (isLast) return undefined;
        obj = obj[chunk] || {};
        if (!obj) return undefined;
    });
    if (obj) {
        //if (_v) obj[split[lastIndex]] = _v;
        var rta = obj[split[lastIndex]];
        if (typeof rta === 'string') return rta;
        if (typeof rta === 'function') {
            if (opt && opt.args) {
                return rta.apply(this, opt.args);
            } else {
                return rta();
            }
        }
        return rta;
    }else{
        return undefined;
    }
}


var $hasMouse = (change) => {
    $('html').on('mousemove', (e) => {
        change(true);
        $('html').off('mousemove');
    });
    change(false);
};

$(function() {

    $.hrefAnchor = () => {
        var url = window.location.href;
        var idx = url.indexOf("#");
        var hash = idx != -1 ? url.substring(idx + 1) : "";
        //console.log('hrefAnchor '+hash.replace('/', '')+' | type '+typeof hash.replace('/', ''));
        return hash.replace('/', '');
    };
    $.scrollToAnchor = () => {
        //console.log('scrollToAnchor '+$.hrefAnchor());
        var elem = $('#' + $.hrefAnchor());
        //console.info(elem);
        $('html, body').animate({
            scrollTop: elem.offset().top
        }, 500);
    };

    $.onGlobalError = cb => {
        $('html').on('error', () => {
            console.log('ERROR.DETECTED');
            //cb();
        });
    };




    $.downloadPNG = (elem, name) => {
        html2canvas(elem, {
            onrendered: function(canvas) {

                //
                var imgData = canvas.toDataURL("image/jpeg", 1.0);
                var pdf = new jsPDF();
                pdf.addImage(imgData, 'JPEG', 25, 20);
                pdf.save("download.pdf");

                //canvas.toBlob(function(blob) {
                //    saveAs(blob, name + ".png");
                //});
            }
        });
    };




});


function createDateTimePickerData() {
    var o = {
        isOpen: false,
        openCalendar: function(e) {
            e.preventDefault();
            e.stopPropagation();
            o.isOpen = true;
        }
    };
    return o;
}

function createSelect(opt) { //s:scope r:rootscope
    var o = {
        label: opt.label,
        click: (x) => {
            o.label = x.label || x;
            setPropByGivenPath(opt.scope, opt.model, x);
            opt.change(x);
        },
        items: opt.items
    };
    opt.scope.$watch(opt.model, (v) => {
        if (v !== undefined) {
            o.label = v.label || (v.substring(0, 1).toUpperCase() + v.slice(1));
        } else {
            o.label = opt.label;
        }
    });
    return o;
}

function setPropByGivenPath(obj, propertyPath, val) {
    var split = propertyPath.split('.');
    var lastIndex = split.length - 1;
    split.forEach((chunk, index) => {
        var isLast = lastIndex == index;
        if (isLast) return false;
        obj = obj[chunk] || null;
        if (!obj) return false;
    });
    if (obj) {
        obj[split[lastIndex]] = val;
    }
}

var whenProperties = (o, props, cbArray) => {
    var i = setInterval(function() {
        var rta = true;
        props.forEach((v) => {
            if (_.isUndefined(o[v])) {
                rta = false;
            }
        });
        if (rta) {
            clearInterval(i);
            cbArray.forEach((cb) => {
                cb();
            });
        }
    }, 200);
};


(function(exports) {
    var BASE64URICHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split('');

    exports.newId = function(len, radix) {
        var chars = BASE64URICHARS,
            newId = [],
            i = 0;
        radix = radix || chars.length;
        len = len || 22;

        for (i = 0; i < len; i++) newId[i] = chars[0 | Math.random() * radix];

        return newId.join('');
    };

})(typeof exports === 'undefined' ? window : exports);;

function ifThenMessage(comparisons, messagesCallback, noMessagesCallback) {
    var messages = [];
    comparisons.forEach((comparison) => {
        var v1 = comparison[0];

        if (typeof v1 === 'function') {
            if (v1()) {
                messages.push(comparison[1]);
            }
        } else {
            var operator = comparison[1];
            var v2 = comparison[2];
            var m = comparison[3];
            var cb = comparison[4] || undefined; //custom cb for field when msg exists.
            if (operator == '==') {
                if (v1 == v2) messages.push(m);
            }
            if (operator == '!=') {
                if (v1 != v2) messages.push(m);
            }
            if (operator == '>') {
                if (v1 > v2) messages.push(m);
            }
            if (operator == '<') {
                if (v1 < v2) messages.push(m);
            }
            if (operator == '>=') {
                if (v1 >= v2) messages.push(m);
            }
            if (operator == '<=') {
                if (v1 <= v2) messages.push(m);
            }
        }
        if (messages.filter((_m) => _m == m).length > 0 && cb) cb();
    });
    if (messages.length > 0) {
        messagesCallback(messages);
    } else {
        noMessagesCallback();
    }
}

var downloadFile = (filename, encodedData, mimeType) => {
    var link = document.createElement('a');
    mimeType = mimeType || 'text/plain';
    link.setAttribute('download', filename);
    link.setAttribute('href', 'data:' + mimeType + ';charset=utf-8,' + encodedData);
    link.click();
};

var downloadJSON = (filename, data) => {
    downloadFile(filename, JSON.stringify(data, null, '\t'), 'text/json')
}

var ToStringParameters = function(obj) {
    var rta = '';
    for (var x in obj) {
        if (rta != '') {
            rta += '&';
        }
        rta += x + '=' + decodeURIComponent(JSON.stringify(obj[x]));
    }
    return rta;
}

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}


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
        _scope.evt[n].res = { err: err, r: r };
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


if (typeof exports !== 'undefined') {
    exports.MyPromise = MyPromise;
    exports.getHashParams = getHashParams;
    exports.getParameterByName = getParameterByName;
    exports.ifThenMessage = ifThenMessage;
    exports.val = val;
    exports.numberBetween  = numberBetween;
} else {
    window.val = val;
    window.numberBetween = numberBetween;
    window.MyPromise = MyPromise;
    window.getHashParams = getHashParams;
    window.getParameterByName = getParameterByName;
    window.ifThenMessage = ifThenMessage;

    window.$U = {
        valid:valid,
        val:val,
        numberBetween:numberBetween,
        MyPromise:MyPromise,
        getHashParams:getHashParams,
        getParameterByName:getParameterByName,
        ifThenMessage:ifThenMessage,
        has:has
    };
}
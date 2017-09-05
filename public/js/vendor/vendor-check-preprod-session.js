(function() {
    function urlHas(arr) {
        for (var x in arr) {
            if (window.location.href.indexOf(arr[x]) !== -1) return true;
        }
        return false;
    }
    //if (!urlHas(['herokuapp', "62.210.97.81", 'c9'])) return;
    if (!urlHas(['herokuapp', "62.210.97.81"])) return;

    var postToken;
    apiGet("CXNlcg", function(res) {
        res = JSON.parse(res.responseText);
        postToken = res.result;
        console.info('(preprod-check)', postToken);
        checkSession();
    });

    function decode() {
        var encoded = window.localStorage.getItem('store#diags-preview-session') || '';
        if (encoded) return JSON.parse(window.atob(encoded));
        else return null;
    }

    function setPostHeaders(x) {
        x.setRequestHeader("Content-Type", "application/json");
        x.setRequestHeader("csrf-token", postToken);
        return x;
    }


    function apiGet(url, callback) {
        var x = window.XMLHttpRequest && new window.XMLHttpRequest() || new window.ActiveXObject("Microsoft.XMLHTTP");
        x.open('get', window.location.origin + '/' + url, true);
        x.onreadystatechange = function() {
            if (x.readyState == 4) {
                callback(x);
            }
        };
        x.setRequestHeader("Content-Type", "application/json");
        x.send();
    }

    function checkId(_id, callback) {
        var x = window.XMLHttpRequest && new window.XMLHttpRequest() || new window.ActiveXObject("Microsoft.XMLHTTP");
        x.open('post', window.location.origin + '/api/' + window.btoa('User') + '/' + window.btoa('exists'), true);
        x.onreadystatechange = function() {
            if (x.readyState == 4) {
                callback(x.responseText);
            }
        };
        x = setPostHeaders(x);
        x.send(JSON.stringify({
            p: window.btoa(JSON.stringify({
                _id: _id
            }))
        }));
    }

    function validSession(validSessionCallback) {
        var session = decode();
        if (session && session._id) {


            return checkId(session._id, function(res) {
                res = JSON.parse(res);
                res.result = JSON.parse(window.atob(res.result));
                if (!res.result) return validSessionCallback(false);
                var now = Date.now();
                var offset = 1000 * 60 * 20;
                if (urlHas(['c9users'])) {
                    offset = 1000 * 60 * 60 * 24;
                }
                if (now - session.logged_at < offset) {
                    return validSessionCallback(true);
                }
                return validSessionCallback(false);
            });


        }
        return validSessionCallback(false);
    }

    function checkSession() {
        validSession(function(valid) {
            if (!valid) {
                window.localStorage.setItem('store#diags-preview-session', '');
                window.location.href = window.location.origin + '/preprod.html';
            }
            else {
                console.info('this is a prepod valid session');
            }
        })
    }
})();

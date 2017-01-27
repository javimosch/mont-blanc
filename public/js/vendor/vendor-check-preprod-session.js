(function() {
    if (window.location.origin.indexOf('herokuapp') === -1) return;

    function decode() {
        var encoded = localStorage.getItem('store#diags-preview-session') || '';
        if (encoded) return JSON.parse(atob(encoded));
        else return null;
    }

    function validSession(validSessionCallback) {
        var session = decode();
        if (session && session._id) {
            //check _id
            function checkId(_id, callback) {
                var x = window.XMLHttpRequest && new window.XMLHttpRequest() || new ActiveXObject("Microsoft.XMLHTTP");
                x.open('post', window.location.origin + '/ctrl/User/exists', true);
                x.onreadystatechange = function() {
                    if (x.readyState == 4) {
                        callback(x.responseText)
                    }
                };
                x.setRequestHeader("Content-Type", "application/json");
                x.send(JSON.stringify({
                    _id: _id
                }))
            };

            return checkId(session._id, function(res) {
                res = JSON.parse(res);
                if (!res.result) return validSessionCallback(false);
                var now = Date.now();
                if (now - session.logged_at < 1000 * 60 * 20) {
                    return validSessionCallback(true);
                }
                return validSessionCallback(false);
            });


        }
        return validSessionCallback(false);
    }
    validSession(function(valid) {
        if (!valid) {
            localStorage.setItem('store#diags-preview-session', '');
            window.location.href = window.location.origin + '/preprod.html';
        }
        else {
            console.info('this is a prepod valid session');
        }
    })
})();

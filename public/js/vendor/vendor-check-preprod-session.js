(function() {
    function urlHas(arr){
        for(var x in arr){
            if(window.location.href.indexOf(arr[x])!==-1) return true;
        }
        return false;
    }
    if (!urlHas(['herokuapp',"62.210.97.81",'c9users'])) return;

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

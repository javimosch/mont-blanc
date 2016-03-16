((ctx) => {
    ctx.readScriptTags = readScriptTags;
    ctx.htmlParserTest = test;

    function test() {
        $.get('/src/files/data.html').then((str) => {
            console.info(JSON.stringify(readScriptTags(str)));
        });
    }

    function readScriptTags(str) {
        var arr = fitlerTag('script', str);
        arr = arr.map(v => (getAttribute('src', v)));
        arr = arr.filter(v=> v!=='');
        //console.log(JSON.stringify(arr));
        return arr;
    }

    function fitlerTag(tagName, str) {
        var rta = [];
        for (var x = 0; x < str.length; x++) {
            if (str.charAt(x) == '<') {
                var n = str.substring(x + 1, x + 1 + tagName.length);
                var content = str.substring(x);
                content = content.substring(0, content.indexOf(tagName + '>') + tagName.length + 1);
                if (n == tagName) {
                    rta.push(
                        content
                    );
                }
            }
        }
        return rta;
    }

    function getAttribute(n, str) {
        var x = str.substring(str.indexOf(n));
        x = x.substring(x.indexOf('"') + 1);
        x = x.substring(0, x.indexOf('"'));
//        console.log(typeof x);
        return x;
    }


})(
    (typeof exports !== 'undefined' && exports) ||
    (typeof window !== 'undefined' && window) ||
    this
);

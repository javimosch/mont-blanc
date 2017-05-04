var Handlebars = require('handlebars');
var path = require('path');
var ctrl = require(path.join(process.cwd(), 'model/db.controller')).create;
var sander = require('sander');
var decodeURIComponent = require(path.join(process.cwd(), 'model/utils')).decodeURIComponent;
//var Promise = require(path.join(process.cwd(), 'model/utils')).promise;
var minifyHTML = require('html-minifier').minify;
const low = require('lowdb');
const fileAsync = require('lowdb/lib/storages/file-async');
const db = low(path.join(process.cwd(), 'cache/views.json'), {
    storage: fileAsync
});
var ignoreMinify = [];
var initialized = false;
//console.log('views-service-start');
db.defaults({
    context: {
        text: {}
    }
}).write().then(() => {

    console.log('views-service-fetch');
    ctrl('Text').getAll({
        __select: "content code"
    }, function(err, _texts) {
        if (err) {
            dbLogger.setSaveData(err);
            dbLogger.errorSave('While fetching items');
        }
        else {
            var text = {};
            _texts.forEach(t => {
                text[t.code] = decodeURIComponent(t.content);
            });
            db.set('context.text', text).write().then(() => {
                initialized = true;
                //dbLogger.info('Fetch ok', _texts.length, ' items in memory.');
            });
        }
    });
});

//ctrl('Text').get({})

var compilerLogger = ctrl('Log').createLogger({
    name: "VIEWS",
    category: "COMPILER"
});

var dbLogger = ctrl('Log').createLogger({
    name: "VIEWS",
    category: "DB"
});


function updateText(code, content) {
    return db.set('context.text.' + code, content).write();
}

function getContext() {
    return db.read().getState().context;
}


function minifyResponse(html) {
    var originalHtml = html;
    try {
        html = minifyHTML(html, {
            removeAttributeQuotes: false,
            removeScriptTypeAttributes: false,
            collapseWhitespace: false,
            minifyCSS: true,
            caseSensitive: true
        });
    }
    catch (err) {
        compilerLogger.setSaveData({
            error:err,
            html:originalHtml
        });
        compilerLogger.warnSave('minification was not possible.');
    }
    return html;
}

module.exports = {
    fetchContext: () => {
        return new Promise((resolve, reject, emit) => {
            function check() {
                if (initialized) {
                    return resolve(getContext());
                }
                else {
                    setTimeout(check, 1000);
                }
            }
            check();
        });
    },
    update: (code, content) => {
        updateText(code, content);
        compilerLogger.setSaveData({
            code: code,
            content: decodeURIComponent(content)
        });
        compilerLogger.debug(code, 'text block update');
    },
    compile: function(fullPath) {
        return new Promise(function(resolve, err) {
            var fileName = fullPath.substring(fullPath.lastIndexOf('/') || 0);

            var context = getContext();
            sander.readFile(fullPath, {
                encoding: 'utf-8'
            }).then((html) => {
                if (html.indexOf('<!--COMPILE_WITH_HANDLEBARS-->') !== -1) {
                    try {
                        //compilerLogger.log('Compiling view file ', fileName,html.length);
                        var compiledHTML = Handlebars.compile(html)(context);
                        compiledHTML = minifyResponse(compiledHTML);
                        //compilerLogger.log('Compiled view file ', fileName,compiledHTML.length);
                        resolve(compiledHTML);
                    }
                    catch (err) {
                        compilerLogger.setSaveData(err);
                        compilerLogger.errorSave('File ', fileName);
                        html = minifyResponse(html);
                        resolve(html);
                    }
                }
                else {
                   // console.log('views-service response 1', fullPath, html.length);
                    html = minifyResponse(html);
                    //console.log('views-service response 2', fullPath, html.length);
                    resolve(html);
                }
            });


        });
    }
};

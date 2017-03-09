var Handlebars = require('handlebars');
var ctrl = require('./db.controller').create;
var sander = require('sander');
var decodeURIComponent = require('./utils').decodeURIComponent;
var path = require('path');
var minifyHTML = require('html-minifier').minify;
const low = require('lowdb');
const fileAsync = require('lowdb/lib/storages/file-async');
const db = low(path.join(process.cwd(), 'cache/views.json'), {
    storage: fileAsync
});
db.defaults({
    context: {
        text: {}
    }
}).write().then(() => {

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
                dbLogger.info('Fetch ok', _texts.length, ' items in memory.');
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
    html = minifyHTML(html, {
        removeAttributeQuotes: false,
        removeScriptTypeAttributes: true,
        collapseWhitespace: true,
        minifyCSS: true,
        caseSensitive: true
    });
}

module.exports = {
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
                        compilerLogger.log('Compiling view file ', fileName);
                        var compiledHTML = Handlebars.compile(html)(context);
                        compiledHTML = minifyResponse(compiledHTML);
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
                    html = minifyResponse(html);
                    resolve(html);
                }
            });


        });
    }
};

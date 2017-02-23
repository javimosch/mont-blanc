var Handlebars = require('handlebars');
var ctrl = require('./db.controller').create;
var sander = require('sander');
var decodeURIComponent = require('./utils').decodeURIComponent;
//ctrl('Text').get({})

var compilerLogger = ctrl('Log').createLogger({
    name: "VIEWS",
    category: "COMPILER"
});

var dbLogger = ctrl('Log').createLogger({
    name: "VIEWS",
    category: "DB"
});


var context = {
    text: {}
};


ctrl('Text').getAll({
    __select: "content code"
}, function(err, _texts) {
    if (err) {
        dbLogger.setSaveData(err);
        dbLogger.errorSave('While fetching items');
    }
    else {
        _texts.forEach(text => {
            context.text[text.code] = decodeURIComponent(text.content);
        });
        dbLogger.info('Fetch ok', _texts.length, ' items in memory.');
    }
});

module.exports = {
    update:(code,content)=>{
      context.text[code] = content;
      /*compilerLogger.setSaveData({
          code:code,
          content:decodeURIComponent(content)
      });*/
      //compilerLogger.debugSave('Update success');
    },
    compile: function(fullPath) {
        return new Promise(function(resolve, err) {
            var fileName = fullPath.substring(fullPath.lastIndexOf('/') || 0);

            sander.readFile(fullPath, {
                encoding: 'utf-8'
            }).then((html) => {
                if (html.indexOf('<!--COMPILE_WITH_HANDLEBARS-->') !== -1) {
                    try {
                        compilerLogger.log('Compiling view file ', fileName);
                        var compiledHTML = Handlebars.compile(html)(context);
                        resolve(compiledHTML);
                    }
                    catch (err) {
                        compilerLogger.setSaveData(err);
                        compilerLogger.errorSave('File ', fileName);
                        resolve(html);
                    }
                }
                else {
                    resolve(html);
                }
            });

        });
    }
};

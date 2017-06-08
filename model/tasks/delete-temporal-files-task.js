var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var utils = require('../utils');
var fs = require('fs');

const PRESERVE_TIME = 1000 * 60 * 60 * 48; //48 horas

var logger = resolver.loggerFacade({
    name: "TASKS",
    category: 'CLEANING'
});

function debugTerminal() {
    logger.debugTerminal.apply(logger, Array.prototype.slice.call(arguments));
}

function deleteFile(path) {
    try {
        if (fs.existsSync(path)) {
            fs.unlink(path);
        }
    }
    catch (e) {}
}

function replaceAll(word, search, replacement) {
    return word.replace(new RegExp(search, 'g'), replacement);
}



module.exports = {
    interval: 1000 * 60 * 60, //each hour
    handler: handler,
    runAtStartup: true
};


function handler(data, cb) {
    var _path = utils.getFileTempPath();
    
    debugTerminal('Reading',_path);
    

    fs.readdir(_path, function(err, files) {
        if (err) {
            return logger.errorTerminal(err);
        }
        files = files.map(function(file) {
            //return path.join(_path, file);
            return file;
        }).filter(function(file) {
            return fs.statSync(path.join(_path, file)).isFile();
        })
        
        if(files.length===0){
            return logger.debugTerminal('No temporal files present.');
        }

        files.forEach(function(file) {
            //log('reading:ext:'+path.extname(file));
            if (path.extname(file) !== '.pdf') {
                debugTerminal('deleting[not-a-pdf-file]');
                deleteFile(path.join(_path, file));
            }
            else {
                try {
                    var str = replaceAll(file, '.pdf', '');
                    str = str.substring(str.indexOf('_') + 1);
                    //log('file:'+str);
                    var d = new Date(parseInt(str));
                    if (isFinite(d)) {
                        if (Date.now() - d > PRESERVE_TIME) {
                            debugTerminal('deleting[createdAt > ' + (Date.now() - d) / 1000 + ']');
                            deleteFile(path.join(_path, file));
                        }
                        else {
                            debugTerminal('waiting[createdAt ' + (Date.now() - d) / 1000 + '-secs-ago][to-be-deleted-in ' + Math.abs(((Date.now() - d) - PRESERVE_TIME) / 1000) + '-secs]');
                        }
                    }
                    else {
                        debugTerminal('deleting[not-a-valid-date]');
                        deleteFile(path.join(_path, file));
                    }
                }
                catch (e) {
                    console.log(e);
                    debugTerminal('deleting[exception]');
                    deleteFile(path.join(_path, file));
                }
            }
        });
    });
}

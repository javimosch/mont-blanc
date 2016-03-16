'use strict';
var through = require('through2');
var minimatch = require('minimatch');
var path = require('path');
var gutil = require('gulp-util');


module.exports = function(opt) {
    var options = opt || {};
    var _contents = '';

    function isLast(n){
        var list =  options.src.filter(function(name) {
            return !options.ignoreFiles.some(function(item) {
                return name.indexOf(item)!=-1;
            });
        });
        if(list.length===0) return false;
        //
        //console.log(list[list.length-1]);
        return list[list.length-1].indexOf(n)!==-1;
    }

    function concat(file, encoding, callback) {
        //file.sourceMap
        //file.isNull()
        //file.isStream()
        //file.path
        //file.base
        //file.contents

        if (file.isNull()) {
            this.push(file);
            return callback();
        }

        if (file.isStream()) {
            return callback(uglifyError('Streaming not supported', {
                fileName: file.path,
                showStack: false
            }));
        }

        var ignore = false;

        if (!ignore && options.ignoreFiles) {
            ignore = options.ignoreFiles.some(function(item) {
                //return minimatch(path.basename(file.path),    item);
                return path.basename(file.path).indexOf(item)!=-1;
            });
        }

        if (ignore || path.extname(file.path) != '.js') {
            //this.push(file);
            callback();
            return;
        } else {
            //callback();
            //return;
        }


        pushContent(file);


        var name = file.path.substring(file.path.lastIndexOf('/') + 1);
        if (isLast(name)) {
            var concatFile = getConcatFile(file);
            this.push(concatFile);
            //console.log('Concatenando: ', name, ' Success!');
        } else {
            //console.log('Concatenando: ', name);
        }

        //file.path = file.path.replace(/\.js$/, ext.src);
        //this.push(file);
        callback();
    }


    function pushContent(file) {
        _contents += '\n' + file.contents;
    }

    function getConcatFile() {
        var f = new gutil.File({
            //path: file.path.replace(/\.js$/, "-concat.js"),
            path: options.path,
            //base: file.base
            base: options.base
        });
        //console.log('rta path',f.path);
        console.log('generando ',options.base,options.path);
        optimize();
        f.contents = new Buffer(_contents);
        return f;
    }

    function optimize() {
        _contents = _contents.trim();
        _contents = _contents.split('"use strict";').join('');

    }
    return through.obj(concat).on('end', function() {
    });
};

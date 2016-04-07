'use strict';
var through = require('through2');
var minimatch = require('minimatch');
var path = require('path');
//var strip = require('strip-comments');
module.exports = function(opt) {
    var options = opt || {};

    function stripFn(file, encoding, callback) {
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
                return minimatch(path.basename(file.path), item);
            });
        }

        if (ignore || path.extname(file.path) != '.js') {
            this.push(file);
            return;
        }
        //
        // file.contents = new Buffer(strip('pajaroloco/*hola*/'));
        var str = file.contents.toString();
        //console.log('strip initial length ' + str.length);
        //str=  strip('holamundo;          {    habia una ves } si');
        str = strip(str);
        //console.log('strip final length ' + str.length);
        file.contents = new Buffer(str);
        this.push(file);
        callback();
    }

    function removeSpaces(str) {
        var x, xCurr, c = 0,
            acum = '',
            curr = str;;
        //console.log('removeSpaces initial length ' + str.length);
        str = str.split(/\n|\r/g).join(''); //remove linebreaks
        str = str.split(/\t/g).join(''); //remove linebreaks

        function getIndex() {
            var arr = [str.indexOf(';'), str.indexOf('{'), str.indexOf('}'), str.indexOf(','), str.indexOf('['), str.indexOf(':'), str.indexOf('"'), str.indexOf("'"),str.indexOf('=')];
            arr = arr.filter(v => v !== -1);
            if (arr.length === 0) return -1;
            else return Math.min.apply(null, arr);
        }
        x = getIndex();
        //console.log('removeSpaces index '+x);
        while (x !== -1) {
            c++;
            if (c % 100 === 0) {
                //console.log('removeSpaces looping ' + c + ' times.');
            }
            xCurr = x;
            do {
                xCurr++;
                if (
                    (
                        str.charAt(xCurr) !== ' ' ||
                        isNaN(str.charCodeAt(xCurr)) ||
                        str.charCodeAt(xCurr).toString() !== '10'
                    )

                    && str.charAt(xCurr).match(/\t/g) == null && String.fromCharCode(str.charCodeAt(xCurr)) !== ' '

                ) {
                    //console.log('[' + str.charAt(xCurr) + '] code [' + str.charCodeAt(xCurr) + ']');
                    acum += str.substring(0, x + 1)
                    str = str.substring(xCurr);
                    break;
                } else {
                    //console.log(str.charCodeAt(xCurr).toString());
                }
            } while (str.charAt(xCurr) == ' ');
            x = getIndex();
            //console.log('removeSpaces index '+x);
        };
        acum += str;
        //console.log('removeSpaces final length ' + acum.length);
        return acum;
    }

    function strip(rta) {
        var x, c = 0,
            acum = '';
        do {
            c = 0;
            for (x = 0; x < rta.length; x++) {
                c++;
                //SINGLE COMMENT
                if (false && rta.charAt(x) === '/' && rta.charAt(x + 1) === '/') {
                    if (rta.charAt(x - 1) === ':' &&
                        (rta.charAt(x - 2) === 'p' || rta.charAt(x - 2) === 's')
                    ) continue;
                    if (rta.charAt(x - 1) === '"') continue;
                    if (rta.charAt(x + 1) === '.') continue; //dot ahead
                    if (rta.charAt(x + 1) === ',') continue; //dot ahead
                    acum += rta.substring(0, x);
                    rta = rta.substring(x);
                    rta = rta.substring(rta.indexOf(String.fromCharCode(10)));
                    break;
                }
                //DOUBLE COMMENT
                if (rta.charAt(x) === ' ' 
                    && rta.charAt(x + 1) === '/'
                    && rta.charAt(x + 2) === '*') {
                    acum += rta.substring(0, x);
                    rta = rta.substring(x);
                    rta = rta.substring(rta.indexOf('*/')+2);
                    break;
                }
            }
        } while (x < rta.length);
        acum += rta;
        //acum = removeSpaces(acum);
        return acum;
    }
    return through.obj(stripFn);
};

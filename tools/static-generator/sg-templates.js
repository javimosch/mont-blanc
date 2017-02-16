"use strict";
var CleanCSS = require('clean-css');
var babel = require("babel-core");
var minifyHTML = require('html-minifier').minify;
let co = require("co");
var sgUtilsParser = require('./sg-utils-html-parser');
var sgUtils = require('./sg-utils');
var sgScript = require('./sg-scripts');
var Handlebars = require('handlebars');
var readDirFiles = require('read-dir-files');
var mkdirp = require('mkdirp');
var fs = require('fs');
var sgData = require('./sg-data');
var path = require('path');
var COMMON_PATH = process.cwd() + '/static-generator/partials';
var SRC_STATIC_FOLDER = process.cwd() + '/static-generator/static';
var SRC_PARTIALS_FOLDER = process.cwd() + '/static-generator/partials';
const OUTPUT_PATH = path.join(process.cwd(), '/static-generator/output')
var PARTIALS_EXT = 'html';
var global_partials = null;
var PROD = process.env.PROD && process.env.PROD.toString() == '1' || false;
var APP_NAME = process.env.APP_NAME || process.env.app || process.env.APP || null;
var removeHtmlComments = require('remove-html-comments');
const RELATIVE_PATH_FOR_VENDOR_CUSTOM = 'public';

function getOutput(str) {
    return path.join(OUTPUT_PATH, str);
}

Handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context);
});

Handlebars.registerHelper('i18n', function(context, abs) {
    //console.log('i18n ',context,abs);
    if (!sgData().i18n_config) {
        return '[' + context.toUpperCase() + ']';
    }
    var current = sgData().i18n_config.current || 'en';
    var raw = '[' + current + ' ' + context.toUpperCase() + ']';
    if (!sgData().i18n) return raw;
    if (!sgData().i18n[context]) return raw;
    if (!sgData().i18n[context][current]) return raw;
    return sgData().i18n[context][current] || raw;
});


Handlebars.registerHelper('file', function(options) {
    var p = options.fn(this);
    var raw = fs.readFileSync(process.cwd() + p)
    return raw;
});





var _watches = {};

function dataFromRequire(filePath, propertyName) {
    var data = {};
    if (propertyName) {
        data = require(filePath)[propertyName];
    }
    else {
        data = require(filePath);
    }
    loadData(data);

    if (typeof _watches[filePath] === 'undefined') {
        _watches[filePath] = true;
        try {
            sgUtils.watch([filePath + '.js'], () => dataFromRequire(filePath, propertyName));
        }
        catch (e) {
            console.log('debug-warning', 'watch hook failed', e);
        }
    }
}

function loadData(d) {
    //Object.assign(data, d);
}

function loadDataJSON(path) {
    //var data = fs.readFileSync(path);
    //loadData(JSON.parse(data));
}

var _events = {};

module.exports = {
    pathPartials: (p) => SRC_PARTIALS_FOLDER = p,
    pathStatic: (p) => SRC_STATIC_FOLDER = p,
    dataFromRequire: dataFromRequire,
    loadData: loadData,
    loadDataJSON: loadDataJSON,
    dest: (dest) => {
        //DIST = dest;
    },
    watch: () => {
        watchPartials();
        watchSrc();
    },
    build: build,
    on: (evt, handler) => {
        _events[evt] = _events[evt] || [];
        _events[evt].push(handler);
    }
}

function build() {
    return new Promise((resolve, error) => {
        co(function*() {
            //yield buildTemplatesPartials(COMMON_PATH);
            yield buildTemplatesPartials();
            yield buildTemplates();
            resolve(true);
        }).catch(function(err) {
            console.log(err);
        });

    });
}

function emit(evt, p) {
    _events[evt] = _events[evt] || [];
    _events[evt].forEach(handler => handler(p));
}

function watchSrc() {
    //console.log('DEBUG: Waching Static Folder: ' + SRC);
    sgUtils.watch(SRC_STATIC_FOLDER, () => {
        buildTemplates();
    });
}

function watchPartials() {
    //console.log('DEBUG: Waching Partials Folder: ' + PATH);
    sgUtils.watch(SRC_PARTIALS_FOLDER, build);
}

function* buildTemplatesPartials(src, append) {
    return new Promise(function(resolve, err) {
        co(function*() {
            if (!fs.existsSync(src || SRC_PARTIALS_FOLDER)) return console.log('DEBUG:  tpl partials skip for', src || SRC_PARTIALS_FOLDER);
            global_partials = sgUtils.normalizeFilesTreePreservePath(readDirFiles.readSync(src || SRC_PARTIALS_FOLDER));
            global_partials = sgUtils.filesIncludeOnly(global_partials, PARTIALS_EXT);
            let keys = Object.keys(global_partials),
                key = null,
                name, remoteData, isAfter = false;
            for (var x in keys) {
                key = keys[x];
                name = key.substring(key.lastIndexOf('/') + 1);
                name = name.substring(0, name.lastIndexOf('.') !== -1 && name.lastIndexOf('.') || undefined);
                let fullPath = path.join(src || path.join(process.cwd(), SRC_PARTIALS_FOLDER), key);
                //Fetch the file data from firebase (if any)
                //remoteData = yield heFirebase.getPartialContent(fullPath);
                //If file modified date is after firebase file date, we use the file content. If not, we use the firebase file.
                //if(remoteData){
                //    isAfter = yield heUtils.fileIsAfterDate(fullPath, remoteData.updatedAt);    
                // }else{
                isAfter = false;
                //    console.log('WARN: Firebase data not found',name);
                // }

                if (isAfter) {
                    Handlebars.registerPartial(name, sgUtils.urldecode(remoteData.content)); //We finally register the handlebar partial
                    console.log('TEMPLATES: Using firebase version for ', name);
                }
                else {
                    //If we plan to use the local file data, we send the file to firebase

                    Handlebars.registerPartial(name, global_partials[key]); //We finally register the handlebar partial
                }
                //console.log('DEBUG: Partial registered', name);
            }
            //console.log('DEBUG: partials',global_partials);
            resolve(true);
        }).catch(function(err) {
            console.log('WARN: Templates Partials compile error', err);
        });
    });
}

function compileTemplates(src, path) {
    console.log('Compiling DATA', sgData());
    var rta = Handlebars.compile(src)(sgData());
    return rta;
}


var vendorData = {};

function vendorChanges(path, arr) {
    if (!vendorData[path]) {
        vendorData[path] = arr;
        return true;
    }
    else {
        if (arr.length !== vendorData[path].length) {
            vendorData[path] = arr;
            return true;
        }
        else {

            for (var x in vendorData[path]) {
                if (vendorData[path][x] !== arr[x]) {
                    vendorData[path] = arr;
                    return true;
                }
            }
            return false;
        }
    }
}

function compileVendorCustom(opt) { //{{root}}
    var raw = opt.content,
        path = opt.path,
        ext = opt.ext,
        replaceCb = opt.replaceWith,
        tagName = opt.tagName,
        tagAttributeName = opt.tagAttribute;
    //
    var outputFileName = opt.outputFileName || 'vendor';
    var sectionName = opt.sectionName || ('VENDOR-' + ext.toUpperCase());
    if (sgUtilsParser.hasSection(sectionName, raw)) {

        console.log('DEBUG: Compiling section ', sectionName);

        var params = sgUtilsParser.getSectionParameters(sectionName, raw);

        if (params && params.name) {
            outputFileName = params.name;
        }

        var buildPath = getOutput(ext + '/' + outputFileName + '.' + ext);
        buildPath = buildPath.replaceAll('//', '/');
        var sectionRaw = sgUtilsParser.getSection(sectionName, raw);

        //if (opt.sectionName.indexOf('BUNDLE_JS_5') != -1) {
        //console.log('sectionRaw: ', sectionRaw);
        //}

        var arr = sgUtilsParser.readTags(sectionRaw, tagName, tagAttributeName);
        //
        var _url = '/' + ext + '/' + outputFileName + '.' + ext;
        _url = _url.replaceAll('//', '/');
        //console.log('he script vendor url',_url);
        var _replaceWith = replaceCb(_url);
        //console.log('he script vendor section',_replaceWith);
        //
        arr = arr.map(i => i = i.replace(sgData().root, '/'));


        arr.forEach((path) => {
            emit('file-dependency', process.cwd() + '/' +
                path);
        });

        if (process.env.PROD && process.env.PROD.toString() === '1') {

        }
        else {

            //return raw; 
        }

        /*
                if (!vendorChanges(ext, arr)) {
                    return sgUtilsParser.replaceSection(sectionName, raw, _replaceWith);
                }
                */

        var compiledCode = sgUtils.concatenateAllFilesFromArray(arr, RELATIVE_PATH_FOR_VENDOR_CUSTOM);
        if (opt.middleWare) {
            console.log('DEBUG: bundle before middleware', compiledCode.length);
            compiledCode = opt.middleWare(compiledCode);
            console.log('DEBUG: bundle after middleware', compiledCode.length);
        }
        sgUtils.createFile(buildPath, compiledCode);
        console.log('DEBUG: bundle output ' + buildPath + ' success at '); // + new Date());
        raw = sgUtilsParser.replaceSection(sectionName, raw, _replaceWith);
        return raw;
    }
    else {
        return raw;
    }
}

function compileVendorCSS(raw, path) {
    return compileVendorCustom({
        content: raw,
        path: path,
        ext: 'css',
        replaceWith: dest => {
            return "<link rel='stylesheet' href='" + dest + "' type='text/css' />";
        },
        tagName: 'link',
        tagAttribute: 'href',
        middleWare: _raw => {
            if (PROD) {
                var options = { /* options */ };
                var output = new CleanCSS(options).minify(_raw);
                if (output.errors && output.errors.length>0) {
                    console.log("DEBUG CSS MINIFY ERROR:", output.errors); // a list of errors raised    
                }
                if (output.warnings && output.warnings.length>0) {
                    console.log("DEBUG CSS MINIFY WARN:", output.warnings); // a list of errors raised    
                }
                console.log("DEBUG CSS BUNDLE", output.stats.originalSize, "to", output.stats.minifiedSize, " Efficiency:", output.stats.efficiency);
                _raw = output.styles;
            }
            return _raw;
        }
    });
}

function compileVendorJS(raw, path) {
    return compileVendorCustom({
        content: raw,
        path: path,
        ext: 'js',
        replaceWith: dest => {
            return '<script src="' + dest + '"></script>';
        },
        tagName: 'script',
        tagAttribute: 'src',
        middleWare: _raw => {
            //heStyles.minify(_raw);
            return _raw;
        }
    });
}

function compileSectionBundles(raw, path) {
    for (var x = 0; x < 10; x++) {
        if (sgUtilsParser.hasSection('BUNDLE_JS_' + (x + 1), raw)) {
            console.log('DEBUG: inspecting section', 'BUNDLE_JS_' + (x + 1));
            raw = compileVendorCustom({
                outputFileName: 'bundle_' + (x + 1).toString(),
                sectionName: 'BUNDLE_JS_' + (x + 1),
                content: raw,
                path: path,
                ext: 'js',
                replaceWith: dest => {
                    return '<script src="' + dest + '"></script>';
                },
                tagName: 'script',
                tagAttribute: 'src',
                middleWare: _raw => {
                    //heStyles.minify(_raw);

                    if (PROD) {
                        var settings = {
                            presets: ["es2015"],
                            minified: true,
                            comments: false
                        };
                        _raw = babel.transform(_raw, settings).code;
                    }

                    return _raw;
                }
            });
            //console.log('ss debug templates make bundle ' + (parseInt(x) + 1));
        }
    }
    return raw;
}

function buildTemplates() {

    console.log('DEBUG: build static with data', sgData());

    return new Promise((resolve, error) => {


        if (global_partials == null) {
            //not ready yet;
            console.error('DEBUG: build static no partials yet');
            process.exit(1);
            return;
        }

        //console.log('TEMPLATES:BUILD:STATIC', heConfig().output());


        //console.log('ss debug templates building to ['+heConfig().output()+']');

        function compile(raw) {
            return Handlebars.compile(raw)(sgData())
        }

        function needsCompilation(raw, path) {
            return raw.indexOf('HBSIGNORE') == -1;
        }

        function handleNewFileTransform(raw, path) {
            var rta = raw;
            if (needsCompilation(raw, path)) {
                var rta = Handlebars.compile(raw)(sgData());
                if (PROD) {
                    rta = compileVendorJS(rta, path);
                    rta = compileVendorCSS(rta, path);
                    rta = compileSectionBundles(rta, path);
                    rta = minifyHTML(rta, {
                        removeAttributeQuotes: false,
                        removeScriptTypeAttributes: true,
                        collapseWhitespace: true,
                        minifyCSS: true,
                        caseSensitive: true
                    });
                }

            }
            else {
                //console.log('DEBUG: ',path,'skip');
            }
            return rta;
        }

        console.log('DEBUG: Copy from ', SRC_STATIC_FOLDER, 'to', OUTPUT_PATH);
        sgUtils.copyFilesFromTo(SRC_STATIC_FOLDER, OUTPUT_PATH, {
            formatPathHandler: (path) => {
                if (path.indexOf('index') !== -1) {
                    path = path.substring(0, path.lastIndexOf('index')) + 'index.html';
                }
                return path;
            },
            formatContentHandler: (raw, path) => {

                console.log('DEBUG:', path, 'format handler');

                var rta = raw;
                try {
                    rta = handleNewFileTransform(raw, path);
                }
                catch (e) {
                    rta = raw;
                    console.log('WARN: templates compiling fail', e);
                    throw e;
                }

                //console.log('building templates writing',rta.length,'chars...',rta,path);

                return rta;

            }
        }).then((res) => {
            console.log('DEBUG: templates build ' + (res.ok ? 'success' : 'with errors') + ' at ' + new Date());
            emit('build-success');
            resolve();
        })
    });

}

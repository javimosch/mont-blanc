var readFileSync = require('./server-file-reader').readFileSync;
var readScriptTags = require('./html-parser').readScriptTags;


var gulp = require('gulp');
var minify = require('gulp-minify');
var uglify = require('gulp-uglify');
//var browserify = require('browserify');
var concat = require('./gulp-concat');
var strip = require('./gulp-strip-comments');
var babel = require('gulp-babel');
var path = require('path');
//const traceur = require('gulp-traceur');
//var iife = require("gulp-iife");
//var plumber = require('gulp-plumber');

((ctx) => {
    ctx.bundle = bundle;

    function bundle(htmlPath, outPath, opt) {
        var base = htmlPath.substring(0, htmlPath.lastIndexOf('/') != -1 && htmlPath.lastIndexOf('/') || undefined);
        base = base.replace(htmlPath, '');
        if (base == '') base = '.';
        var baseForFiles = base + '/' + opt.root + '/';

        console.log('reading '+path.resolve(htmlPath));
        var str = readFileSync(path.resolve(htmlPath), {
            encoding: 'utf8'
        });
        var tags = readScriptTags(str);
        tags = tags.map(v => (baseForFiles + v));
        //console.log('base: '+base);

        tags = tags.filter(v=>v.indexOf('http')===-1);

        //tags.forEach(v=>{console.log('Tags',JSON.stringify(v));    });
        
        //console.log('Base for files: '+baseForFiles);
        //console.log('Last: ' + tags[tags.length - 1]);
        //return;

        gulp.src(tags)
            .pipe(concat({
                base: base,
                path: (opt.name || 'bundle') + '.js',
                src: tags,
                ignoreFiles: ['vendor', 'http']
            }))
            .pipe(babel({
                presets: ['es2015']
            }))
            .pipe(uglify({mangle:false})) //output: { beautify: true }
           .pipe(strip())
            .pipe(minify({ ext: '.js' }))
            .pipe(gulp.dest(outPath || 'dist'));
        console.log('scripts-bundler ',htmlPath,JSON.stringify(opt));
    }

    //gulp.task('watch-only', tasks.watchOnly);

})(
    (typeof exports !== 'undefined' && exports) ||
    (typeof window !== 'undefined' && window) ||
    this
);

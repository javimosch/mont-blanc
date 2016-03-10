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
        //
        console.log('reading '+path.resolve(htmlPath));
        var str = readFileSync(path.resolve(htmlPath), {
            encoding: 'utf8'
        });
        var tags = readScriptTags(str);
        tags = tags.map(v => (base + '/' + v));
        //console.log('base: '+base);

        //console.log(JSON.stringify(tags));
        console.log('Last: ' + tags[tags.length - 1]);

        gulp.src(tags)
            .pipe(concat({
                base: opt.base || __dirname,
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
        console.log('scripts-bundler outPath ' + outPath);
    }

    //gulp.task('watch-only', tasks.watchOnly);

})(
    (typeof exports !== 'undefined' && exports) ||
    (typeof window !== 'undefined' && window) ||
    this
);
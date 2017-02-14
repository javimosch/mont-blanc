var sgUtilsParser = require('./sg-utils-html-parser');
var path = require('path');
var sgUtils = require('./sg-utils');
var minify = require('minify-content');
var sgData = require('./sg-data');
var babel = require("babel-core");
var PROD = process.env.PROD && process.env.PROD.toString() == '1' || false;

var g = {
	destFilename: 'bundle.js'
}
var PATH = path.join(process.cwd(),'static-generator/js');
var DEST_FOLDER = path.join(process.cwd(),'static-generator/output/js');

function watch() {
	//console.log('DEBUG: scripts watch',PATH);
	sgUtils.watch(PATH, () => {
		build();

	

	});
}

function build() {
	/*
	heUtils.copyFilesFromTo(PATH,DIST,{
		formatPathHandler: (path) => {
            return path;
        },
		formatContentHandler:(raw)=>{
			return raw; //less, sass, stylus here.
		}
	});*/

	//console.log('DEBUG: MAIN Build JS Path',PATH);

	var raw = sgUtils.concatenateAllFilesFrom(PATH, {
		debug: false
	});

	//console.log('DEBUG: scripts build before chars len', raw.length && raw.length || null);

	if (process.env.PROD.toString() == '1') {

		/*
		minify(raw,'js',(_raw)=>{
			_raw = _raw.code;
			build_next(_raw);
		})*/

		var settings = {
			presets: ["es2015"],
			minified: true,
			comments: true
		};

		if (process.env.PROD_DEPLOY && process.env.PROD_DEPLOY.toString() == '1') {
			settings.comments = false
		}
		else {
			settings.sourceMaps = 'inline';
		}

		var r = babel.transform(raw, settings);
		build_next(r.code);
		console.log('DEBUG: scripts build after chars len', r && r.code && r.code.length || null);
	}
	else {
		build_next(raw);
	}

	function build_next(_raw) {
		sgData().jsVendorFileName = g.destFilename;
		var dest = DEST_FOLDER + '/' + g.destFilename;
		sgUtils.createFile(dest, _raw);
		console.log('DEBUG: scripts build ' + g.destFilename + ' success at ' + new Date());
		emit('build-success');
	}
}


function emit(evt, p) {
	_events[evt] = _events[evt] || [];
	_events[evt].forEach(handler => handler(p));
}
var _events = {};



function getAll() {
	return sgUtils.retrieveFilesFromPathSync(PATH);
}

function tagTemplate(context) {
	var rta = sgUtils.replaceAll('<script type="text/javascript" src="_SRC_"></script>', '_SRC_', context.src || '[src_field_required]');
	return rta;
}

function printTags(folderPath) {
	var files = getAll();
	var ret = "<!-- printJSTags: development -->\n";
	files.forEach((file) => {
		ret += tagTemplate({
			src: path.join(folderPath, file.fileName)
		});
	});
	return ret;
}

module.exports = {
	path: (p) => PATH = p,
	build: build,
	tagTemplate: tagTemplate,
	printTags: printTags,
	watch: watch,
	on: (evt, handler) => {
		_events[evt] = _events[evt] || [];
		_events[evt].push(handler);
	}
};


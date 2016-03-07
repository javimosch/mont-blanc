var fs = require('fs');
var parser = require('shift-parser');
var codegen = require('shift-codegen').default;
if (process.argv.length != 3) {
    console.log('minifier.js inputfile (required)');
    process.exit(-1);
}
var inputfile = process.argv[2];

if(inputfile.indexOf('.js')===-1){
	console.log('minifier.js inputfile (need to be .js)');
    process.exit(-1);
}

var source = fs.readFileSync(inputfile, 'utf-8');
var ast = parser.parseScript(source);
var output = codegen(ast);

inputfile = inputfile.replace('-min','').replace('.js','-min.js');

fs.writeFileSync(inputfile, output);


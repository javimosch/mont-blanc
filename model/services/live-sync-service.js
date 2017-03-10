var watch = require('watch');
var Firebase = require("firebase");
module.exports = {
    bind: () => {
            /*
            //livereload
            var ref = new Firebase("https://madev.firebaseio.com/diagsfront");
            var counter = 0;
            watch.watchTree(process.cwd() + '/public/', function() {
            	counter++;
            	ref.child('signals').update({
            		reload: counter
            	});
            });
            */
    }
}

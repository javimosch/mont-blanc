var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    def: {
        code:{
            type:String,
            required:true,
            unique:true
        },
        content: {
            type: String,
            required:true,
            default: ''
        }
    }
};

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    def: {
        code: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        },
        template: {
            type: String,
            required: true,
            default: ''
        },
        content: {
            type: String,
            required: true,
            default: ''
        }
    }
};

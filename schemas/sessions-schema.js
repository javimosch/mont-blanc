var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    def: {
        email: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        token: {
            type: String,
            required: true,
            default:''
        },
        expiresAt: {
            type: Date,
            required: true
        }
    }
};

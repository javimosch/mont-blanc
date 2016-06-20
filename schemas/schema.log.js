var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    def: {
        type: {
            type: String,
            default: 'error'
        }, //Info, Warning, Error.
        message: {
            type: String
        },
        data: {
            type: {},
            default: {}
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }
};
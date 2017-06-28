var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    def: {
        //image
        type: {
            type: String,
            required: true
        },
        code: {
            type: String,
            required: true,
            unique: true
        },
        fileName: {
            type: String,
            required: true
        },
        fileNameOriginal: {
            type: String,
            required: false
        },
        mimeType: {
            type: String,
            required: true
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

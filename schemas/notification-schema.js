var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    def: {
        _user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        type: {
            type: String,
            required: true
        },
        from: {
            type: String,
            required: true,
            default: process.env.emailFrom || 'commande@diagnostical.fr'
        },
        to: {
            type: String,
            required: true
        },
        subject: {
            type: String,
            required: true
        },
        contents: {
            type: String,
            required: true
        },
        sended: {
            type: Boolean,
            default: false
        },
        sendedDate: {
            type: Date
        },
        metadata: {
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

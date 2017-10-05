var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    def: {
        _user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        code: {
            type: String,
            required: true,
            unique: true
        },
        description: {
            type: String,
            required: true
        },
        _order: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: false
        },
        usedByOrders: [{
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: false
        }],
        discount: {
            type: Number,
            required: true,
            default: 0
        },
         commission: {
            type: Number,
            required: false,
            default: 0
        },
         commissionAmount: {
            type: Number,
            required: false,
            default: 0
        },
        used: {
            type: Boolean,
            default: false
        },
        usedByUsers:[{
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: false
        }]
    }
};

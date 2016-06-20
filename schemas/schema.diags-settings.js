var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    def: {
        pricePercentageIncrease: {},
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
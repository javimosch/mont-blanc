var req         = (n) => require(process.cwd()+'/controllers/'+n);
require('es6-promise').polyfill();
var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var configureGridFS = req('ctrl.file').configure;
var configureGridFSActions = req('ctrl.file').configureActions;
var Schema = mongoose.Schema;
var LOCAL = process.env.LOCAL && process.env.LOCAL.toString() == '1' || false;

// Build the connection string 
var dbURI = 'mongodb://root:root@ds011452.mlab.com:11452/manitas';

if (LOCAL) {
    dbURI = 'mongodb://localhost:27017/scotchbox';
}

if (process.env.dbURI) {
    dbURI = process.env.dbURI || dbURI;
}

// Create the database connection 
//console.log('using',dbURI);
mongoose.connect(dbURI);

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', function() {
    console.log('Mongoose default connection open to ' + dbURI);
});

// If the connection throws an error
mongoose.connection.on('error', function(err) {
    console.log('Mongoose default connection error: ' + err);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', function() {
    console.log('Mongoose default connection disconnected');
});

// If the Node process ends, close the Mongoose connection 
process.on('SIGINT', function() {
    mongoose.connection.close(function() {
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});

configureGridFS(mongoose);





var models = {};
var schemas = {};

exports.getModel  = (n) => models[n];
exports.getSchema = (n) => schemas[n];
exports.mongoose  = mongoose;

function model(n, def) {
    if (!def) console.log('WARN:' + n + ' def required');
    if (!def.createdAt) {
        def.createdAt = {
            type: Date,
            default: Date.now
        };

    }
    if (!def.updatedAt) {
        def.updatedAt = {
            type: Date,
            default: Date.now
        }
    }
    var schema = new mongoose.Schema(def);
    schema.plugin(mongoosePaginate);
    schema.pre('save', function(next) {
        var now = new Date();
        this.updatedAt = now;
        if (!this.createdAt) {
            this.createdAt = now;
        }
        next();
    });
    models[n] = mongoose.model(n, schema);
    schemas[n] = schema;
}

model('Stats', {});
model('File', {});
model('Email', {});
model('Stripe', {});
model('Settings', require('../schemas/schema.diags-settings').def);
model('Payment', require('../schemas/schema.diags-payment').def);
model('Pdf', require('../schemas/schema.pdf').def);
model('Category', require('../schemas/schema.category').def);
model('Text', require('../schemas/schema.text').def);
model('Notification', require('../schemas/schema.notification').def);
model('Log', require('../schemas/schema.log').def);
model('UserNotifications', require('../schemas/schema.user-notifications').def);
model('StripeTransaction', require('../schemas/schema.diags-stripe-transaction').def);
model('Balance', require('../schemas/schema.balance').def);
model('BalanceItem', require('../schemas/schema.balance-item').def);
model('TimeRange', require('../schemas/schema.time-range').def);
model('User', require('../schemas/schema.diags-user').def);
model('Order', require('../schemas/schema.diags-order').def);


configureGridFSActions();
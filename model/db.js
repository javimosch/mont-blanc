var path = require('path');
var req = (n) => require(process.cwd() + '/controllers/' + n);
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
mongoose.Promise = global.Promise;
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
exports.model = models; //accessor
exports.getModel = (n) => models[n.toLowerCase()];
exports.getSchema = (n) => schemas[n];
exports.mongoose = mongoose;
exports.registerModel = registerModel;
exports.createSchema = createSchema;

function createSchema(n, def) {
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
        };
    }
    var schema = new mongoose.Schema(def);
    schema.plugin(mongoosePaginate);
    schema.pre('save', function(next) {
        var now = Date.now();
        this.updatedAt = now;
        if (!this.createdAt) {
            this.createdAt = now;
        }
        next();
    });
    return schema;
}

function registerModel(modelName, schema) {
    models[modelName.toLowerCase()] = mongoose.model(modelName, schema);
    schemas[modelName] = schema;
}

function createModel(n, def) {
    var schema = createSchema(n, def);
    registerModel(n, def);
    schemas[n] = schema;
}

createModel('Stats', {});
createModel('File', {});
createModel('Email', {});
createModel('Stripe', {});
createModel('Settings', require('../schemas/schema.diags-settings').def);
createModel('Pdf', require('../schemas/schema.pdf').def);
createModel('Category', require('../schemas/schema.category').def);
createModel('Log', require('../schemas/schema.log').def);
createModel('StripeTransaction', require('../schemas/schema.diags-stripe-transaction').def);
createModel('Balance', require('../schemas/schema.balance').def);
createModel('BalanceItem', require('../schemas/schema.balance-item').def);
createModel('TimeRange', require('../schemas/schema.time-range').def);
createModel('htmls', require('../schemas/schema.htmls').def);
createModel('pages', require('../schemas/schema.pages').def);


configureGridFSActions();

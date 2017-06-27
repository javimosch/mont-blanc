var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var req = (n) => require(process.cwd() + '/controllers/' + n);
var config = require(path.join(process.cwd(), 'model/config'));
require('es6-promise').polyfill();
var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var Schema = mongoose.Schema;
var dbURI = config.DB_URI;
var models = {};
var schemas = {};
var state = {
    configured: true,
    connected: false,
    logger: resolver.loggerFacade({
        name: "DB"
    }),
    gfs:null
};
if (!dbURI) {
    console.warn('dbURI env required');
}
module.exports = {
    state: () => state,
    disconnect: () => {
        mongoose.disconnect()
        state.connected = false;
    },
    waitConnection: waitConnection,
    configure: configure,
    model: models,
    getModel: (n) => {
        if (!models[n.toLowerCase()]) {
            state.logger.warnTerminal("getModel ", n, 'returns null/undefined');
        }
        return models[n.toLowerCase()]
    },
    getSchema: (n) => schemas[n],
    mongoose: mongoose,
    registerModel: registerModel,
    createSchema: createSchema,
};
//********************************************************************


function waitConnection() {
    var start = Date.now();
    return resolver.promise((resolve, reject) => {
        function waitConnection() {
            if (Date.now() - start > 15000) {
                return reject('Timeout');
            }
            if (!state.connected) {
                setTimeout(waitConnection, 1000);
            }
            else {
                return resolve();
            }
        }
        waitConnection();
    });
};

function configure() {
    //console.log('DB:Configure');
    return resolver.promise((resolve, reject) => {
        resolver.co(function*() {

            if (state.connected) {
                state.logger.debugTerminal('Resuming connection');
                return resolve();
            }

            //console.log('DB:Connecting');
            yield connectMongoose();

            //console.log('DB:GridFS');
            var Grid = require('gridfs-stream');
            Grid.mongo = mongoose.mongo;
            state.gfs = Grid(mongoose.connection.db);
            //console.log('DB:Collections');
            configureCollections();
            state.configured = true;
            return true;
        }).then(resolve).catch(reject);
    });
}






//----------------------------------------------------------------------------

function configureCollections() {
    state.logger.debugTerminal('configureCollections');
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
}

function connectMongoose() {
    return resolver.promise((resolve, reject) => {
        mongoose.Promise = global.Promise;

        mongoose.connect(dbURI);
        // CONNECTION EVENTS
        // When successfully connected
        mongoose.connection.on('connected', function() {
            //console.log('DB:Mongoose default connection open to ' + dbURI);
            state.logger.debugTerminal('Connection open', dbURI.substring(dbURI.lastIndexOf('/')));
            state.connected = true;
            resolve();
        });

        // If the connection throws an error
        mongoose.connection.on('error', function(err) {
            state.logger.debugTerminal('Mongoose default connection error: ' + err);
            reject();
        });

        // When the connection is disconnected
        mongoose.connection.on('disconnected', function() {
            state.logger.debugTerminal('Mongoose default connection disconnected');
        });

        // If the Node process ends, close the Mongoose connection 
        process.on('SIGINT', function() {
            mongoose.connection.close(function() {
                state.logger.debugTerminal('Mongoose default connection disconnected through app termination');
                process.exit(0);
            });
        });
    });
}



function createSchema(n, def) {
    if (!def) state.logger.error("Schema definition required",def);
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
    if(!models[modelName.toLowerCase()].paginate){
        state.logger.warn(modelName,'Paginate plugin','not working');
    }else{
        //state.logger.debugTerminal(modelName.toLowerCase(),'registered');
    }
}

function createModel(n, def) {
    var schema = createSchema(n, def);
    registerModel(n, schema);
    schemas[n] = schema;
}

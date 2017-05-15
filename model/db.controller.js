var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var req = (n) => require(process.cwd() + '/model/' + n);
var createDbActions = req('db.actions').create;
var actions = {};
var cwd = () => process.cwd();
var controllers = {};
var resultLogger;
module.exports = {
    register: register,
    create: create
};

function register(name, path, hasModel) {
    hasModel = hasModel === undefined ? true : hasModel;
    path = path || 'controllers/ctrl.' + name.toLowerCase();
    actions[name] = require(cwd() + '/' + path);
    var obj = create(name, hasModel);
}

function create(name, hasModel) {
    hasModel = hasModel === undefined ? true : hasModel;
    if (controllers[name]) return controllers[name];
    var controllerPath = 'controllers/ctrl.' + name.toLowerCase();
    var specialActions = {};
    try {
        specialActions = require(cwd() + '/' + controllerPath);
    }
    catch (e) {
        specialActions = {};
        console.log('db.controller.' + name + '.create', e);
    }

    var actions = {};

    if (specialActions.configureSchema) {

        //console.log('db.controller', 'configureSchema', name);

        var schemaDef = require(path.join(process.cwd(), 'schemas/' + name.toLowerCase() + "-schema")).def;
        var schema = specialActions.configureSchema(resolver.db().createSchema(name, schemaDef)) || null;
        if (!schema) {
            console.log('controller', name, 'configureSchema must return the schema');
            process.exit(1);
        }
        //console.log('DB.CONTROLLER REGISTER MODEL ',name,schema!=null)
        resolver.db().registerModel(name, schema);
        delete specialActions.configureSchema;
    }

    if (hasModel) {
        var coreActions = createDbActions(name);
        Object.assign(actions, coreActions);
        actions.core = coreActions;
    }




    Object.assign(actions, specialActions);

    Object.assign(actions, {
        result: resultAction(name)
    });

    controllers[name] = actions;

    return actions;
}

function resultAction(modelName) {
    return function(res, options) {
        var ctrl = require('./db.controller').create;
        resultLogger = resultLogger || ctrl('Log').createLogger({
            name: "DB",
            category: "RESULT"
        });
        return function(err, r) {

            //||                (Object.keys(err || {}).length === 0 && err !== undefined)
            if (typeof err == 'string') {
                err = {
                    message: err.toString()
                };
            }

            var rta = {
                ok: err === undefined || err === null,
                //message: (err) ? 'Error' : 'Success',
                err: err || null,
                result: (r !== null) ? r : ((r === false) ? false : null)
            };

            //log error
            if (!rta.ok) {
                resultLogger.setSaveData(rta);
                if (err._id) {
                    resultLogger.warn('The follow error contains an _id, did you try to resolve that as a response?');
                }
                resultLogger.warn(modelName, err);
            }

            //when result contains something like {ok,message,result}
            if (rta.result && rta.result.result) {
                if (rta.result.message) {
                    rta.message = rta.result.message;
                    rta.result = rta.result.result;
                }
            }

            //log('result=', JSON.stringify(rta));
            //log('result= ' + (rta.ok == true) + (err ? ' Error: ' + JSON.stringify(err) : ''));
            //
            if (options && options.__res) {
                options.__res(res, rta);
            }
            else {
                res.json(rta);
            }
        };
    }
}

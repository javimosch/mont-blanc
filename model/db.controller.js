var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var controllers = {};
var createDbActions = require(path.join(process.cwd(), '/model/db.actions')).create;
var controllers = {};
var resultLogger;
module.exports = {
    register: register,
    create: create,
    controllers: controllers
};
//---------------------------------------------
register('Order');
register('Category');
register('Notification');
register('Stripe');
register('Text');
register('User');
register('coupons');
register('Stats');
register('File');
register('Email');
register('Pdf');
register('Lemonway');
register('uploads');
register('deploy', null, false);
register('sockets', null, false);
register('ssh', null, false);
register('gitlab', null, false);
register('reports', null, false);
register('sessions');

function camelize(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter, index) {
        return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
    }).replace(/\s+/g, '');
}

function register(name, ctrlPath, isMongoCollection) {
    isMongoCollection = isMongoCollection === undefined ? true : isMongoCollection;
    ctrlPath = ctrlPath || 'controllers/ctrl.' + name.toLowerCase();
    controllers[camelize(name)] = create(name, isMongoCollection); //require(path.join(process.cwd(), ctrlPath));
    //var obj = create(name, hasModel);
}

function create(name, isMongoCollection) {
    isMongoCollection = isMongoCollection === undefined ? true : isMongoCollection;
    if (controllers[name]) return controllers[name];
    var controllerPath = 'controllers/ctrl.' + name.toLowerCase();
    var specialActions = {};
    try {
        specialActions = require(path.join(process.cwd(), controllerPath));
    }
    catch (e) {
        specialActions = {};
        //console.log('db.controller.' + name + '.create', e);
        throw e;
    }

    var actions = {};



    if (isMongoCollection) {

        if (specialActions.configureSchema) {
            //console.log('db.controller', 'configureSchema', name);
            var schemaDef = require(path.join(process.cwd(), 'schemas/' + name.toLowerCase() + "-schema")).def;
            var schema = specialActions.configureSchema(resolver.db().createSchema(name, schemaDef)) || null;
            if (!schema) {
                console.log('controller', name, 'configureSchema must return the schema');
                process.exit(1);
            }
            console.log('DB.CONTROLLER REGISTER MODEL ', name, schema != null)
            resolver.db().registerModel(name, schema);
            delete specialActions.configureSchema;
        }

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

        function errorHandler(err, status, clientError) {
            resultLogger.error(resolver.errorParser(err));
            if (err == 401) status = 401;
            status = status || 400;
            res.status(status).json({
                status: status,
                ok: false,
                err: clientError ? clientError : err,
                result: null
            });
        }


        var ctrl = require('./db.controller').create;
        resultLogger = resultLogger || ctrl('Log').createLogger({
            name: "CONTROLLER",
            category: "RESPONSE"
        });
        return function(err, r) {
            
            if(err===401) return errorHandler(401);

            //||                (Object.keys(err || {}).length === 0 && err !== undefined)
            if (typeof err == 'string') {
                err = {
                    message: err.toString()
                };
            }

            var result = (r !== null) ? r : ((r === false) ? false : null);

            if (result && typeof result.length !== 'undefined') {
                result = result.map(o => {
                    if (typeof o.password !== 'undefined') {
                        o.password = undefined; //Avoid sending password property
                    }
                    return o;
                });
            }


            var rta = {
                status: 200,
                ok: err === undefined || err === null,
                err: err !== undefined ? err : null,
                result: result
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
    };
}

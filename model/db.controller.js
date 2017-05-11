var req = (n) => require(process.cwd() + '/model/' + n);
var createDbActions = req('db.actions').create;
var actions = {};
var cwd = () => process.cwd();
var controllers = {};

function register(name, path, hasModel) {
    hasModel = hasModel === undefined ? true : hasModel;
    
    path = path || 'controllers/ctrl.' + name.toLowerCase();
    actions[name] = require(cwd() + '/' + path);
    var obj = create(name, hasModel);
    EXPORT['$' + name] = obj;
    if (obj._configure && !obj._configuredFlag) {
        obj._configuredFlag = true;
        obj._configure(obj._hook);
    }
}

function create(name, hasModel) {
    hasModel = hasModel === undefined ? true : hasModel;
    if (controllers[name]) return controllers[name];
    var path = path || 'controllers/ctrl.' + name.toLowerCase();
    var specialActions = {};
    try {
        specialActions = require(cwd() + '/' + path);
    }
    catch (e) {
        specialActions = {};
        console.log('db.controller.' + name + '.create', e);
    }

    var actions = {};

    if (hasModel) {
        Object.assign(actions, createDbActions(name));
    }

    Object.assign(actions, specialActions);
    controllers[name] = actions;
    
    return actions;
}
var EXPORT = {
    register: register,
    create: create
};
module.exports = EXPORT;

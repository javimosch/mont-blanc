var req         = (n) => require(process.cwd()+'/model/'+n);
var createDbActions = req('db.actions').create;
var actions = {};


var cwd = ()=> process.cwd();

function register(name, path) {
    path = path || 'controllers/ctrl.' + name.toLowerCase();
    actions[name] = require(cwd() + '/' + path);
    //console.log('db.controller ' + name + " register " + Object.keys(actions[name]).length + " actions.");
    //console.log('db.controller '+name+' register the following actions '+JSON.stringify(Object.keys(actions[name])));
    var obj = create(name);
    EXPORT['$' + name] = obj;

    if (obj._configure && !obj._configuredFlag) {
        obj._configuredFlag = true;
       // console.log(name.toUpperCase() + ": Configure");
        obj._configure(obj._hook);
    }
}

function create(name) {
    //if (EXPORT['$' + name]) return EXPORT['$' + name];
    //
    //var specialActions = actions[name] || {};
    
    var path = path || 'controllers/ctrl.' + name.toLowerCase();
    var specialActions = {};
    try{
        //console.log(cwd() + '/' + path);
        specialActions = require(cwd() + '/' + path);
        
    }catch(e){
        specialActions = {};
        console.log('db.controller.'+name+'.create',e);
    }
    //console.log('db.controller '+ name + ' special actions are '+JSON.stringify(Object.keys(specialActions)));
    var rta = Object.assign(createDbActions(name), specialActions);
    return rta;
}
var EXPORT = {
    register: register,
    create: create
};
module.exports = EXPORT;var req         = (n) => require(process.cwd()+'/model/'+n);
var createDbActions = req('db.actions').create;
var actions = {};


var cwd = ()=> process.cwd();

function register(name, path) {
    path = path || 'controllers/ctrl.' + name.toLowerCase();
    actions[name] = require(cwd() + '/' + path);
    //console.log('db.controller ' + name + " register " + Object.keys(actions[name]).length + " actions.");
    //console.log('db.controller '+name+' register the following actions '+JSON.stringify(Object.keys(actions[name])));
    var obj = create(name);
    EXPORT['$' + name] = obj;

    if (obj._configure && !obj._configuredFlag) {
        obj._configuredFlag = true;
       // console.log(name.toUpperCase() + ": Configure");
        obj._configure(obj._hook);
    }
}

function create(name) {
    //if (EXPORT['$' + name]) return EXPORT['$' + name];
    //
    //var specialActions = actions[name] || {};
    
    var path = path || 'controllers/ctrl.' + name.toLowerCase();
    var specialActions = {};
    try{
        //console.log(cwd() + '/' + path);
        specialActions = require(cwd() + '/' + path);
        
    }catch(e){
        specialActions = {};
        console.log('db.controller.'+name+'.create',e);
    }
    //console.log('db.controller '+ name + ' special actions are '+JSON.stringify(Object.keys(specialActions)));
    
    var _coreActions = createDbActions(name);
    var coreActions = Object.assign({},_coreActions);
    var rta = Object.assign(coreActions, specialActions);
    rta.core = _coreActions;
    return rta;
}
var EXPORT = {
    register: register,
    create: create
};
module.exports = EXPORT;
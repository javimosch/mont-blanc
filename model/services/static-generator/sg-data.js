var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));

var PROD = process.env.PROD && process.env.PROD.toString() == '1' || false;
var _data = {
    PROD: PROD,
    ENV: resolver.env()
};
module.exports = (addData) => {
    if (addData) {
        Object.assign(_data, addData);
    }
    return _data
};

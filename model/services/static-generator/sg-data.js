var PROD = process.env.PROD && process.env.PROD.toString() == '1' || false;
var _data = {
    PROD: PROD,
    ENV: process.env
};
module.exports = (addData) => {
    if (addData) {
        Object.assign(_data, addData);
    }
    return _data
};

var PROD = process.env.PROD && process.env.PROD.toString() == '1' || false;
var _data = {
    PROD: PROD
};
module.exports = () => _data;

var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var CryptoJS = require("crypto-js");
const SECRET = resolver.env().ENCRYPT_SECRET;

module.exports = {
    encodeObject: (data) => {
        return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET);
    },
    decodeObject: (ciphertext) => {
        var bytes = CryptoJS.AES.decrypt(ciphertext.toString(), SECRET);
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    }
}

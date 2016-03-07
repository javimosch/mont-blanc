((ctx) => {
    var fs = require('fs')

    ctx.readFileSync = readFileSync;
    ctx.readJSONFileSync = readJSONFileSync;

    function readFileSync(file, options) {
        options = options || {}
        if (typeof options === 'string') {
            options = { encoding: options }
        }
        var shouldThrow = 'throws' in options ? options.throws : true
        var content = fs.readFileSync(file, options)
        if (options.json === true) {
            try {
                return JSON.parse(content, options.reviver)
            } catch (err) {
                if (shouldThrow) {
                    err.message = file + ': ' + err.message
                    throw err
                } else {
                    return null
                }
            }
        } else {
            return content;
        }
    }

    function readJSONFileSync(file, options) {
        options = Object.assign(options, {
            json: true
        });
        return readFileSync(file, options)
    }
})(
    (typeof exports !== 'undefined' && exports) ||
    (typeof window !== 'undefined' && window) ||
    this
);

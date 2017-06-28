var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var sander = require('sander');
var naturalName = new(require('natural-filename-generator'));
const fileType = require('file-type');
//var streamToPromise = require('stream-to-promise');
const del = require('del');
const _ = require('lodash');
var streamToBuffer = require('stream-to-buffer');
var logger = resolver.ctrl('Log').createLogger({
    name: "UPLOADS",
    category: ""
});
const IMAGE_UPLOAD_TIMEOUT = 20000;
const IMAGE_PATH = path.join(resolver.resourcesPath(), 'image');

var resolveFileName = (data, defaultName) => data.fileName ? (data.fileName.substring(0, data.fileName.lastIndexOf('.') === -1 ? undefined : data.fileName.lastIndexOf('.')) + '.' + data.ext) : defaultName;
var resolveResourceSubfolder = (data) => {
    const ext = data.ext;
    if (_.includes(['png', 'jpg', 'git'], ext)) return IMAGE_PATH;
    throw "Unsupported extension " + ext;
};
var resolveTypeField = (data) => {
    const ext = data.ext;
    if (_.includes(['png', 'jpg', 'git'], ext)) return 'image';
    throw "Unsupported extension " + ext;
};
var resolveOutputPath = (data, newFileName) => path.join(resolveResourceSubfolder(data), resolveFileName(data, newFileName));

var streamToBufferPromise = (stream) => resolver.promise((resolve, reject) => streamToBuffer(stream, function(err, buffer) {
    if (err) return reject(err);
    resolve(buffer);
}));

module.exports = {
    saveImage: (data, cb, req, res) => {
        resolver.co(function*() {

            data = yield fetchFormData(req, ['file', 'code'], IMAGE_UPLOAD_TIMEOUT);
            if (!data.file) {
                return cb('file not detected');
            }
            if (!data.code) {
                return cb('code required');
            }
            const buffer = yield streamToBufferPromise(data.file);
            const type = fileType(buffer); //=> {ext: 'png', mime: 'image/png'}

            if (!type.mime.indexOf('image') === -1) {
                return cb('image required');
            }

            data.ext = type.ext;
            const newFileName = naturalName.generate(data.ext);

            var doc = yield resolver.ctrl('uploads').model.findOne({
                code: data.code
            }).exec();

            if (doc) {
                yield del([path.join(resolver.resourcesPath(), doc.type, doc.fileName)], {
                    force: true
                });
            }

            yield sander.writeFile(resolveOutputPath(data, newFileName), buffer, {
                encoding: 'binary'
            });

            var dataset = {
                type: resolveTypeField(data),
                code: data.code,
                fileName: resolveFileName(data, newFileName),
                fileNameOriginal: data.fileNameOriginal,
                mimeType: type.mime
            };


            if (doc) {
                yield doc.update({
                    $set: dataset
                });
                cb(null, Object.assign(doc.toJSON(), dataset));
            }
            else {
                doc = yield resolver.db().model.uploads.create(dataset);
                cb(null, doc.toJSON());
            }
        }).catch(err => logger.error(err, err.stack ? err.stack : '') && err);
    },
    configureSchema: (schema) => schema
};

function fetchFormData(req, requiredFileds, timeout) {
    if (!req) throw Error("req parameter required");
    timeout = timeout || 15000;
    return new resolver.Promise((resolve, reject) => {
        var start = Date.now();
        resolver.co(function*() {
            if (req.busboy) {
                var data = {};
                requiredFileds = requiredFileds || ['fileName', 'mimetype', 'file'];
                //logger.debug('fetchFormData:requiredFileds', requiredFileds);
                var interval = setInterval(() => {
                    var success = true;
                    requiredFileds.forEach((k) => {
                        if (!data[k]) {
                            success = false;
                        }
                    });
                    if (success) {
                        clearInterval(interval);
                        resolve(data);
                    }
                    if (Date.now() - start > timeout) {
                        clearInterval(interval);
                        reject('busboy timeout (' + timeout + ')');
                    }
                }, 100);
                req.busboy.on('field', function(key, value, keyTruncated, valueTruncated) {
                    //logger.debug('fetchFormData:field', key, value);
                    data[key] = value;
                });
                req.busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
                    // logger.debug('fetchFormData:file', filename);
                    data.file = file;
                    data.fileNameOriginal = filename;
                    data.mimetype = mimetype;
                    data.encoding = encoding;
                });
                req.pipe(req.busboy);
            }
            else {
                return reject('busboy required');
            }
        }).catch(reject);
    });

}

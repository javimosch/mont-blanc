var path = require('path');
var selectController = require(path.join(process.cwd(), 'model/db.controller')).create;
var CONFIG = require(path.join(process.cwd(), 'model/config'));
var Logger = selectController('Log').createLogger({
    name: "EXTERNAL-SERVICES",
    category: "MAILGUN"
});
var mime = require('mime-types');
var fs = require('fs');
var mailgun = require('mailgun-js')({
    apiKey: CONFIG.MAILGUN_API_KEY,
    domain: CONFIG.MAILGUN_DOMAIN
});
var getFile = require(process.cwd() + '/model/utils').getFile;
var mailcomposer = require('mailcomposer');
exports.send = send;

function send(options, cb) {
    if (!options.html && options.templateUrl) {
        options.html = getFile(options.html);
    }
    var _options = {
        from: options.from,
        to: options.to,
        subject: options.subject,
        body: options.body,
        html: options.html
    };
    if (options.attachment) {
        if (fs.existsSync(options.attachment.path)) {
            var fileStream = fs.createReadStream(options.attachment.path);
            var fileStat = fs.statSync(options.attachment.path);
            _options.attachments = [{
                filename: options.attachment.fileName,
                content: fileStream
            }];
            Logger.debug('MAILING: Attachment File added ' + options.attachment.fileName + ' type ' + mime.lookup(options.attachment.path) || undefined);
        }
        else {
            Logger.debug('MAILING: Attachment File not found at path ' + options.attachment.path);
        }
    }
    var mail = mailcomposer(_options);
    mail.build(function(mailBuildError, message) {
        if (mailBuildError) {
            return cb(null, {
                error: mailBuildError,
                ok: false
            });
        }
        var dataToSend = {
            to: options.to,
            message: message.toString('ascii')
        };
        Logger.debug('MAILING: sending');
        mailgun.messages().sendMime(dataToSend, function(sendError, body) {
            Logger.debug('MAILING: ' + ((sendError) ? "Error" : "Success"));
            cb(null, {
                message: (sendError) ? "Error" : "Success",
                result: body,
                err: sendError,
                ok: !sendError
            });
        });
    });
}

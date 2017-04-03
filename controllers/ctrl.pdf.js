var ctrl = require('../model/db.controller').create;

var utils = require('../model/utils');
var moment = require('moment');
var _ = require('lodash');
var atob = require('atob'); //decode
var btoa = require('btoa'); //encode

var logger = null;

function initializeLogger() {
    if (!logger) {
        logger = ctrl('Log').createLogger({
            name: "PDF",
            category: "GENERATOR"
        });
    }
};
var fs = require('fs');
var htmlToPdf = require('html-to-pdf');
var decode = require('urldecode')
    //var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;




function generate(data, cb, req, res) {
    initializeLogger();
    //logger.debug('Start');
    data.fileName = data.fileName || "file_" + Date.now();
    data.fileName = data.fileName.replace('.pdf', '') + '.pdf';

    //logger.debug('Determining path to save');
    var pathToSave = utils.getFileTempPath(data.fileName);
   // logger.debug('Path to save is ',pathToSave);
    //
    data.html = decode(data.html);
    //
    ///logger.debug('Html decoded');
    if (data.html) {
       // logger.debug('Html will be compiled to pdf');
        htmlToPdf.setInputEncoding('UTF-8');
        //logger.debug('setInputEncoding to utf8');
        htmlToPdf.setOutputEncoding('UTF-8');
        //logger.debug('setOutputEncoding to utf8');
        //htmlToPdf.setlogger.debug(true);
        logger.debug('Compiling');
        htmlToPdf.convertHTMLString(data.html, pathToSave,
            function(err, res) {
                if (err) {
                    logger.debug('Error');
                    return cb(err);
                }
                else {
                    logger.debug('Success');
                    return cb(null, {
                        ok: true,
                        message: res,
                        localPath: pathToSave,
                        fileName: data.fileName,
                    });
                }
            }
        );
    }
    else {
        logger.error('Html string required');
        return cb(null, {
            ok: false,
            message: "html required",
            localPath: '',
            fileName: data.fileName,
        });
    }
}

function stream(data, cb, req, res) {
    logger.debug('stream:start');
    data = atob(data);
    data = JSON.parse(data);
    //
    res.setHeader("content-type", "application/pdf");
    res.setHeader('Content-disposition', ' filename=' + (data.name || 'file') + '.pdf'); //attachment;
    //
    var path = utils.getFileTempPath(data.fileName);

    if (!fs.existsSync(path)) {
        return res.send("Invalid file path or file deleted: " + data.fileName);
    }

    logger.debug('stream:path:' + path);
    var stream = fs.createReadStream(path, {
        bufferSize: 64 * 1024
    })
    var had_error = false;
    stream.on('error', function(_err) {
        logger.debug('stream:error:' + JSON.stringify(_err));
        had_error = true;
    });
    stream.on('close', function() {
        logger.debug('stream:close');
        if (!had_error) {
            setTimeout(function() {
                try {
                    if (fs.existsSync(path)) {
                        fs.unlink(path);
                    }
                }
                catch (e) {};
            }, 60000);
            logger.debug('stream:delete-file', path);
        }
    });
    /*
    stream.on('finish', function() {
        logger.debug('stream:finish');
        if (!had_error) {
            fs.unlink(path);
            logger.debug('stream:delete-file',path);
        }
    });*/
    stream.pipe(res);
    logger.debug('stream:streaming', path);
}

function view(data, cb, req, res) {
    generate(data, (err, r) => {

        if (err) {
            ctrl('Log').save({
                message: 'Attached file generation error',
                type: 'error',
                level: 'error',
                category: 'invoicing',
                data: {
                    name: 'ctrl.pdf.generate',
                    err: err,
                    payload: data
                }
            });
        }

        function next() {

            var protocol = process.env.PROTOCOL || req.protocol;

            var data = btoa(JSON.stringify({
                fileName: r.fileName
            }));
            var url = protocol + '://' + req.get('host') + '/ctrl/Pdf/stream/' + data;

/*
            ctrl('Log').save({
                message: 'Attached file generation success',
                type: 'info',
                level: 'info',
                category: 'invoicing',
                data: {
                    host: req.get('host'),
                    url: protocol + '://' + req.get('host') + '/ctrl/Pdf/stream/' + data
                }
            });*/
            
            return cb(null, url);
        }

        if (err && (!r || !r.ok)) return cb(err, r);
        return next();

    });
}

module.exports = {
    generate: generate,
    view: view,
    stream: stream
};

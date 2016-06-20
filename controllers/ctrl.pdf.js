var ctrl = require('../model/db.controller').create;
var moment = require('moment');
var _ = require('lodash');
var atob = require('atob'); //decode
var btoa = require('btoa'); //encode
var log = (m) => {
    console.log("pdf".toUpperCase() + ': ' + m);
};
var fs = require('fs');
var htmlToPdf = require('html-to-pdf');
var decode = require('urldecode')
    //var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;


function generate(data, cb, req, res) {
    log('generate:start');
    data.fileName = data.fileName || "file_" + Date.now();
    data.fileName = data.fileName.replace('.pdf', '') + '.pdf';
    if (fs.existsSync(process.cwd() + '/www/temp/' + data.fileName)) {
        data.fileName = "file_" + Date.now();
    }
    //
    data.html = decode(data.html);
    //
    if (data.html) {
        htmlToPdf.setInputEncoding('UTF-8');
        htmlToPdf.setOutputEncoding('UTF-8');
        htmlToPdf.setDebug(true);
        log('generate:build-start');
        htmlToPdf.convertHTMLString(data.html, process.cwd() + '/www/temp/' + data.fileName,
            function(err, res) {
                log('generate:build-end');
                if (err) {
                    log('generate:rta:err');
                    return cb(err);
                }
                else {
                    log('generate:rta:success');
                    return cb(null, {
                        ok: true,
                        message: res,
                        fileName: data.fileName,
                    });
                }
            }
        );


    }
    else {
        log('generate:html-required');
        return cb(null, {
            ok: false,
            message: "html required",
            fileName: data.fileName,
        });
    }
}

function stream(data, cb, req, res) {
    log('stream:start');
    data = atob(data);
    data = JSON.parse(data);
    //
    res.setHeader("content-type", "application/pdf");
    res.setHeader('Content-disposition', ' filename=' + (data.name || 'file') + '.pdf'); //attachment;
    //
    var path = process.cwd() + '/www/temp/' + data.fileName;

    if (!fs.existsSync(path)) {
        return res.send("Invalid file path or file deleted: "+data.fileName);
    }

    log('stream:path:' + path);
    var stream = fs.createReadStream(path, {
        bufferSize: 64 * 1024
    })
    var had_error = false;
    stream.on('error', function(_err) {
        log('stream:error:' + JSON.stringify(_err));
        had_error = true;
    });
    stream.on('close', function() {
        log('stream:close');
        if (!had_error) {
            setTimeout(function() {
                try {
                    if (fs.existsSync(path)) {
                        fs.unlink(path);
                    }
                }
                catch (e) {};
            }, 60000);
            log('stream:delete-file', path);
        }
    });
    /*
    stream.on('finish', function() {
        log('stream:finish');
        if (!had_error) {
            fs.unlink(path);
            log('stream:delete-file',path);
        }
    });*/
    stream.pipe(res);
    log('stream:streaming', path);
}

function view(data, cb, req, res) {
    generate(data, (err, r) => {

        if (err) {
            ctrl('Log').save({
                message: 'Order Invoice PDF Generation Error',
                type: 'error',
                data:{
                    name: 'ctrl.pdf.generate',
                    err:err,
                    payload:data
                }
            });
        }
        
        function next() {
            var data = btoa(JSON.stringify({
                fileName: r.fileName
            }));
            var url = req.protocol + '://' + req.get('host') + '/ctrl/Pdf/stream/' + data;
            
             ctrl('Log').save({
                message: 'Order Invoice PDF Generation Url Debug',
                type: 'info',
                data:{
                    host: req.get('host'),
                    url:req.protocol + '://' + req.get('host') + '/ctrl/Pdf/stream/' + data
                }
            });
            
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
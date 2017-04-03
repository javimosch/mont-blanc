var path = require('path');
var selectController = require(path.join(process.cwd(), 'model/db.controller')).create;
var moment = require('moment');
var _ = require('lodash');
var shortid = require('shortid');
var Logger = selectController('Log').createLogger({
    name: "INVOICE-FACADE",
    category: ""
});
const serverURL = require(path.join(process.cwd(), 'model/config')).serverURL;
var encodeURIComponent = require(path.join(process.cwd(), 'model/utils')).encodeURIComponent;

var Promise = require('promise');

const ERRORS = {
    TEMPLATE_MISSING: "Server error, check the logs...",
    TEMPLATE_EMPTY: "Invoice template empty",
    UNABLE_TO_PARSE_ORDER_TO_HTML: "Unable to parse order to html",
    UNABLE_TO_GENERATE_PDF: "Unable to generate pdf"
};

module.exports = {
    htmlFromOrder: htmlFromOrder,
    pdfFromHtml: pdfFromHtml,
    fromOrderToDatabase: fromOrderToDatabase
}

function fromOrderToDatabase(_order,dbFileName) {
    var fileName = shortid.generate();
    return new Promise((resolve, reject) => {
        htmlFromOrder(_order, (err, html) => {
            if (err) {
                Logger.setSaveData(err);
                Logger.error(ERRORS.UNABLE_TO_PARSE_ORDER_TO_HTML);
                return reject(err);
            }
            //Logger.debug('Lengh of html', html.length);
            pdfFromHtml(html, fileName).then((res) => {
                //Logger.debug('Pdf compiled at', res.localPath);
                selectController('File').moveFromFileSytemToDatabase(res.localPath,dbFileName).then(file=>{
                    Logger.debug('Moved to database', file);
                    resolve(file);
                }).catch(err=>{
                    reject(err);
                });
            }).catch((err) => {
                Logger.setSaveData(err);
                Logger.errorSave(ERRORS.UNABLE_TO_GENERATE_PDF);
                return reject(err);
            });

        });

        //return resolve({});
    });
}

function pdfFromHtml(html, fileName) {
    return new Promise((resolve, reject) => {
        selectController('Pdf').generate({
            fileName: fileName,
            html: html
        }, (err, res) => {
            if (err) {
                return reject(err);
            }
            if (!res.ok) {
                return reject(res);
            }
            resolve(res);
        });
    });
}

function htmlFromOrder(_order, cb) {
    selectController('Category').createUpdate({
        code: "DIAGS_SETTINGS",
        __select: "_id",
        __match: ['code']
    }, CategoryHandler);

    function CategoryHandler(err, _category) {
        if (err) {
            cb(ERRORS.TEMPLATE_MISSING, null);
            return Logger.withData(err).errorSave('Unable to retrieve invoice _category');
        }
        selectController('Text').get({
            _category: _category._id,
            code: 'INVOICE',
            __match: ['code', "_category"]
        }, TextHandler);

        function TextHandler(err, _text) {
            if (err) {
                cb(ERRORS.TEMPLATE_MISSING, null);
                return Logger.withData(err).errorSave('Unable to retrieve invoice _text');
            }
            if (_text.content == '') {
                cb(ERRORS.TEMPLATE_EMPTY, null);
                Logger.withData(_text).warnSave('Invoice template is empty');
            }
            var html =
                encodeURIComponent(
                    OrderReplaceHTML(decodeURIComponent(_text.content), _.cloneDeep(_order)));
            cb(null, html);
        }
    }
}

function formatTomomentFrenchDateTime(date) {
    return moment(date).format('DD/MM/YYYY [à] HH[h]mm');
}

function OrderReplaceHTML(html, _order) {
    _order["LOGO"] = "<img src='" + serverURL + '/img/logo.jpg' + "'>";
    _order['ORDER_DESCRIPTION'] = _order.info.description;
    _order['CLIENT_FULLNAME'] = _order._client.firstName + ' ' + (_order._client.lastName || '');
    _order['CLIENT_FIRSTNAME'] = _order._client.firstName;
    _order['CLIENT_LASTNAME'] = _order._client.lastName || '';
    _order['CLIENT_EMAIL'] = _order._client.email;
    _order['CLIENT_ADDRESS'] = _order._client.address;
    _order['CLIENT_COMPANY_NAME'] = _order._client.companyName;
    _order['CLIENT_SIRET'] = _order._client.siret;

    _order['DIAG_FULLNAME'] = _order._diag.firstName + ' ' + (_order._diag.lastName || '');
    _order['DIAG_FIRSTNAME'] = _order._diag.firstName;
    _order['DIAG_LASTNAME'] = _order._diag.lastName || '';
    _order['DIAG_EMAIL'] = _order._diag.email;
    _order['DIAG_ADDRESS'] = _order._diag.address;
    _order['DIAG_COMPANY_NAME'] = _order._diag.companyName;
    _order['DIAG_SIRET'] = _order._diag.siret;
    _order['DIAG_TVA_INTRA_COMM'] = _order._diag.tva_intra_comm || '';
    _order['DIAG_IS_AUTOENTREPRENEUR'] = _order._diag.isAutoentrepreneur || '';
    ///isAutoentrepreneur

    if (_order.createdAt) _order.createdAt_format = formatTomomentFrenchDateTime(_order.createdAt);
    if (_order.paidAt) _order.paidAt_format = formatTomomentFrenchDateTime(_order.paidAt);
    if (_order.start) _order.start_format = formatTomomentFrenchDateTime(_order.start);
    if (_order.end) _order.end_format = formatTomomentFrenchDateTime(_order.end);

    _order.landLordFullName = _order.landLordFullName || undefined;
    _order.landLordEmail = _order.landLordEmail || undefined;
    _order.landLordPhone = _order.landLordPhone || undefined;
    _order.landLordAddress = _order.landLordAddress || undefined;

    function isNumber(key) {
        return key.toUpperCase().indexOf('PRICE') != -1 || key.toUpperCase().indexOf('HT') != -1;
    }

    for (var key in _order) {

        //add a [KEY]_FORMAT version to each key with has PRICE keyword.
        //EX: VATPRICE (23.33333) now can be used like VATPRICE_FORMAT (23,33)
        if (isNumber(key) && key.toUpperCase().indexOf('_FORMAT') == -1) {
            _order[key + '_FORMAT'] = parseFloat(_order[key]).toFixed(2).replace('.', ',');
        }

        //remove country from address
        if (_order[key] && key.toUpperCase().indexOf('ADDRESS') != -1) {
            _order[key] = _order[key].replace(', France', '');
            _order[key] = _order[key].replace(', Francia', '');
        }
        
        _order[key.toUpperCase()] = _order[key];
    }

    function _removeConditionalBlock(key, removeContent) {
        if (!_hasBlock(key)) return;

        var openBlock = _blockName(key, true);
        var closeBlock = _blockName(key, false);
        var openBlockStart = html.indexOf(openBlock);
        //text -> {{IF... (text left side of block)
        var leftHtml = html.substring(0, openBlockStart);

        var openBlockEnd = html.indexOf(openBlock) + openBlock.length;
        var closeBlockStart = html.indexOf(closeBlock);
        //(text inside block)
        var contentHtml = html.substring(openBlockEnd, closeBlockStart);

        var closeBlockEnd = html.indexOf(closeBlock) + closeBlock.length;
        //END IF..}} --> text (text right side of block)
        var rightHtml = html.substring(closeBlockEnd);

        html = leftHtml + (removeContent ? '' : contentHtml) + rightHtml;

        //console.log('remove block', key, removeContent);
    }

    function _blockName(key, open) {
        key = key.toString().toUpperCase();
        if (open) return "{{IF " + key + "}}";
        return "{{END IF " + key + "}}";
    }

    function _hasBlock(key) {
        return html.indexOf(_blockName(key, true)) != -1 && html.indexOf(_blockName(key, false)) != -1;
    }

    function _parseBlock(key) {
        if (!_hasBlock(key)) return;
        if (_order[key] != undefined && _order[key] != null && _order[key] != '') {
            _removeConditionalBlock(key, false); //IF TRUE
        }
        else {
            _removeConditionalBlock(key, true); //IF FALSE
        }

    }

    function _parseConditionalBlocks() {
        //first pass
        Object.keys(_order).forEach(function(k) {
            _parseBlock(k);
        });
    }
    //Shows the block only if the variable exists.
    _parseConditionalBlocks(); //ex: {{IF DIAG_EMAIL}} Diag email: {{DIAG_EMAIL}} {{END IF}}
    return replaceHTML(html, _order);
}

function replaceHTML(html, obj) {
    String.prototype.replaceAll = function(search, replacement) {
        var target = this;
        return target.replace(new RegExp(search, 'g'), replacement);
    };
    for (var x in obj) {
        html = html.replaceAll("{{" + x.toUpperCase() + "}}", obj[x] && obj[x].toString() || '');
    }
    return html;
}

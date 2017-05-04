var path = require('path');
var template = require(path.join(process.cwd(),'utils/template'));
var adminUrl = require(path.join(process.cwd(),'model/utils')).adminUrl;
var moment = require('moment-timezone');
var btoa = require('btoa');

module.exports = {
    compile:compile,
    replaceDiagnosticalData: replaceDiagnosticalData
};

function compile(templateName, templateData){
    var html = template(templateName, replaceDiagnosticalData(templateData));
    return html;
}

function tryParseFloatToFixed(v, n) {
    try {
        return parseFloat(v).toFixed(n || 2);
    }
    catch (err) {
        return v;
    }
}

function removeCountryFromString(string) {
    string = string.replace(', France', '');
    string = string.replace(', Francia', '');
    return string;
}

function htmlOrderSelectedDiagsList(_order) {
    var rta = "<ul>";
    Object.keys(_order.diags).forEach(key => {
        if (_order.diags[key]) {
            rta += "<li>" + diagNameConvertion(key) + "</li>";
        }
    })
    return rta + '</ul>';
}

function diagNameConvertion(key) {
    if (key == 'electricity') return 'Electricité';
    if (key == 'parasitaire') return 'Parasitaire';
    if (key == 'gaz') return 'Gaz';
    if (key == 'termites') return 'Termites';
    if (key == 'ernt') return 'État des risques naturels, miniers et technologiques';
    if (key == 'loiCarrez') return 'Carrez';
    if (key == 'crep') return 'Plomb';
    if (key == 'dta') return 'Amiante';
    if (key == 'dpe') return 'DPE';
    return key;
}

function dateTime2(d) {
    return moment(d).tz(TIME_ZONE).format('[Le] dddd DD MMMM YY [à] HH[h]mm')
}
var TIME_ZONE = 'Europe/Paris';

function time(d) {
    return moment(d).tz(TIME_ZONE).format('HH[h]mm');
}


function replaceDiagnosticalData(data) {
    moment.locale('fr');
    var _user = data._user;
    var _order = data._order;
    var _admin = data._admin;
    var _client = data._client;
    var loginQueryData = '?email=' + _user.email + '&k=' + btoa(_user.password || 'dummy');
    var replaceData = {
        '$BACKOFFICE_URL': adminUrl('login' + loginQueryData)
    };
    if (_user) {
        Object.assign(replaceData, {
            '$USER_EMAIL': _user.email,
            '$USER_FULL_NAME': _user.firstName || _user.email + ' ' + (_user.lastName || ''),
            '$USER_FIRSTNAME': _user.firstName || _user.email,
            '$USER_LASTNAME': _user.lastName,
            '$USER_PASSWORD': _user.password || '[Press reset password in the login screen]',
            '$USER_EMAIL': _user.email,
            '$USER_COMPANY_NAME': _user.companyName,
            '$USER_PHONE': _user.cellPhone,
            '$USER_ADDRESS': _user.address,
            '$USER_CLIENT_TYPE': _user.clientType,
            '$USER_EDIT_URL': adminUrl('/clients/edit/' + _user._id + loginQueryData)
        });
    }
    if (_client) {
        Object.assign(replaceData, {
            '$CLIENT_EMAIL': _client.email,
            '$CLIENT_COMPANY_NAME': _client.companyName,
            '$CLIENT_FIRSTNAME': _client.firstName,
            '$CLIENT_LASTNAME': _client.lastName,
            '$CLIENT_PHONE': _client.cellPhone,
            '$CLIENT_ADDRESS': _client.address,
            '$CLIENT_TYPE': _client.clientType,
            '$CLIENT_EDIT_URL': adminUrl('/clients/edit/' + _client._id + loginQueryData)
        });
    }
    if (_admin) {
        Object.assign(replaceData, {
            '$ADMIN_EMAIL': _admin.email,
            '$ADMIN_FIRSTNAME': _admin.firstName,
            '$ADMIN_LASTNAME': _admin.lastName
        });
    }
    if (_order) {

        //229 //remove country from address
        for (var key in _order) {
            if (_order[key] && key.toUpperCase().indexOf('ADDRESS') != -1) {
                _order[key] = removeCountryFromString(_order[key]);
            }
        }


        Object.assign(replaceData, {
            '$CLIENT_LANDLORD_DISPLAY': (_order._client.clientType == 'landlord') ? 'block' : 'none',
            '$CLIENT_COMPANY_DISPLAY': (_order._client.clientType !== 'landlord') ? 'block' : 'none',
            '$CLIENT_HAS_COMPANY_NAME': (_order._client.companyName) ? 'block' : 'none',
            '$CLIENT_COMPANY_NAME': _order._client.companyName,
            '$CLIENT_HAS_NAME': (_order._client.firstName) ? 'block' : 'none',
            '$CLIENT_FULL_NAME': _order._client.firstName + ' ' + (_order._client.lastName || ''),
            '$CLIENT_FIRSTNAME': _order._client.firstName,
            '$CLIENT_HAS_PHONE': (_order._client.cellPhone || _order._client.fixedTel) ? 'block' : 'none',
            '$CLIENT_PHONE_NUMBER': _order._client.cellPhone || _order._client.fixedTel,
            '$CLIENT_EMAIL': _order._client.email,
            '$DIAG_EMAIL': _order._diag.email,
            '$DIAG_FULL_NAME': _order._diag.firstName + ' ' + _order._diag.lastName,
            '$DIAG_FIRSTNAME': _order._diag.firstName,
            '$DIAG_LASTNAME': _order._diag.lastName,
            '$LANDLORD_FULLNAME': _order.landLordFullName,
            '$LANDLORD_EMAIL': _order.landLordEmail,
            '$LANDLORD_PHONE': _order.landLordPhone,
            '$ORDER_DIAG_LIST': htmlOrderSelectedDiagsList(_order),
            '$ORDER_ADDRESS': _order.address,
            '$ORDER_KEYS_INFO': _order.keysAddress + ' / ' + dateTime2(_order.keysTimeFrom) + ' - ' + time(_order.keysTimeTo),

            '$ORDER_OBSERVATION': _order.obs,
            '$OBS_DISPLAY': (_order.obs) ? 'block' : 'none',

            '$ORDER_PRICE_TTC': tryParseFloatToFixed(_order.price),
            '$ORDER_PRICE_HT': tryParseFloatToFixed(_order.priceHT),
            '$ORDER_DIAG_REMUNERATION_HT': tryParseFloatToFixed(_order.diagRemunerationHT),
            '$ORDER_REVENUE_HT': tryParseFloatToFixed(_order.revenueHT),
            '$ORDER_MONTH_REVENUE_HT': tryParseFloatToFixed(_order.currentMonthTotalRevenueHT),

            '$ORDER_DATE_HOUR': dateTime2(_order.start),
            '$ORDER_DESCRIPTION': _order.info.description,
            '$ORDER_URL': adminUrl('/orders/edit/' + _order._id + loginQueryData),
            '$ORDER_PUBLIC_URL': adminUrl('/orders/view/' + _order._id)
                //'$ORDER_DESCR': _order.address + ' (' + time(_order.diagStart) + ' - ' + time(_order.diagEnd) + ')',
        });
    }
    return replaceData;
}

/*global moment*/
/*global $U*/
/*global StripeCheckout*/
/*global _*/

var $D = {
    ORDER_STATUS: {
        CREATED:'created', //just created
        ORDERED:'ordered', //client (agency/other) clicks invoice end of the month
        PREPAID:'prepaid', //client paid first. When upload pdf -> complete
        DELIVERED:'delivered', // PDF uploaded first. When client paid -> complete
        COMPLETED:'completed' //pdf uploaded and order paid.
    },
    ORDER_STATUS_PAID:['prepaid', 'completed']
};

function rangeCollide(d1s, d1e, d2s, d2e) {
    d1s = moment(d1s);
    d1e = moment(d1e);
    d2s = moment(d2s);
    d2e = moment(d2e);
    //D1S---D1E
    //D2S---D2E
    //
    var collide = false;
    //C1
    //D1S--D2S--D1E
    collide = d2s.isAfter(d1s) && d2s.isBefore(d1e);
    if (collide) return collide;
    //C2
    //D1S--D2E--D1S
    collide = d2e.isAfter(d1s) && d2e.isBefore(d1e);
    //C3
    //D1S--D2S--D2E--D1S
    //
    //C4
    //D2S--D1S--D2E
    collide = d1s.isAfter(d2s) && d1s.isBefore(d2e);
    if (collide) return collide;
    //C2
    //D2S--D1E--D2S
    collide = d1e.isAfter(d2s) && d1e.isBefore(d2e);
    return collide;
}


function openStripeModalPayOrder(order, cb, opt) {
    opt = opt || {};
    var handler = StripeCheckout.configure({
        key: 'pk_test_MDkxtBLcBpHwMCgkqX2dJHjO',
        image: 'https://stripe.com/img/documentation/checkout/marketplace.png',
        locale: 'auto',
        token: function(token) {
            //id email created
            //console.info('TOKEN', token);

            cb(token);

        }
    });


    // Open Checkout with further options
    handler.open({
        name: r.config.companyName || "[r.config.companyName]",
        description: 'Order payment',
        email: opt.email || order._client.email,
        currency: "eur",
        amount: order.price * 100,
        //billingAddress:true,
        zipCode: false,
        allowRememberMe: false
    });

}

function normalizeOrderStartTime(t, forwardOnly, backwardOnly) {
    if (t.minutes < 30) {
        if (!forwardOnly) {
            t.minutes = 0;
        }
        else {
            t.minutes = 30;
        }
    }
    if (t.minutes == 30) t.minutes = 30;
    if (t.minutes > 30) {
        if (!backwardOnly) {
            t.minutes = 0;
            t.hours++;
        }
        else {
            t.minutes = 30;
        }
    }
    return t;
}

function normalizeOrderTime(t, eachTreintaOnly) {
    if (t.minutes > 0 && t.minutes < 15) {
        t.minutes = 15;
        if (eachTreintaOnly) t.minutes = 0;
    }
    if (t.minutes > 15 && t.minutes < 30) {
        t.minutes = 30;
    }
    if (t.minutes > 30 && t.minutes < 45) {
        t.minutes = 45;
        if (eachTreintaOnly) t.minutes = 30;
    }
    if (t.minutes > 45 && t.minutes < 59) {
        t.hours += 1;
        t.minutes = 0;
    }
    return t;
}

var subTotal = function(model, diags, basePrice, opt) {
    opt = opt || {}; //s:scope
    if (opt.s) {
        opt.s.priceInfo = opt.s.priceInfo || {};
        opt.s.priceInfo.basePrice = opt.s.priceInfo.basePrice;
    }
    var total = 0;
    model.diags = model.diags || {};
    Object.keys(model.diags).forEach(function(mkey) {
        if (!model.diags[mkey]) {
            if (opt.s && opt.s.priceInfo[mkey]) {
                delete opt.s.priceInfo[mkey]
            }
            return;
        }
        diags.forEach(function(dval, dkey) {
            if (!dval.show) {
                return;
            }
            if (dval.name == mkey) {
                if (opt.s) opt.s.priceInfo[mkey] = dval.price;
                total += dval.price || 0;
                return false;
            }
        });
    });
    var rta = basePrice + total;
    if (total === 0) {
        if (opt.s) opt.s.priceInfo.basePrice = 0;
        rta = 0;
    }
    else {
        if (opt.s) opt.s.priceInfo.basePrice = basePrice;
    }
    return rta;
};
var sizePrice = (model, diags, squareMetersPrice, basePrice, opt) => {
    var rta = 0;
    //
    var isHouse = model.info ? model.info.house : model.house;
    var squareMeters = model.info ? model.info.squareMeters : model.squareMeters;
    //
    if (isHouse && squareMeters) {
        var porcent = squareMetersPrice[squareMeters];
        if (_.isUndefined(porcent) || _.isNull(porcent)) {
            console.warn('sizePrice: squareMeters missing in model.');
            porcent = 0;
        }
        if (parseInt(porcent) === 0) {
            rta = 0;
        }
        else {
            var sub = subTotal(model, diags, basePrice, opt);
            rta = sub * parseInt(porcent);
            rta = rta / 100;
        }
    }
    if (opt && opt.s) {
        opt.s.priceInfo = opt.s.priceInfo || {};
        opt.s.priceInfo.sizePrice = rta;
    }
    return rta;
}

var isToday = (d) => moment().isSame(moment(d), 'day');
var isTomorrow = (d) => moment().add(1, 'day').isSame(moment(d), 'day');
var isSaturday = (d) => moment(d).day() === 6;

var totalPrice = (showRounded, model, diags, squareMetersPrice, basePrice, opt) => {
    opt = opt || {};
    if(opt.basePrice){
        basePrice = opt.basePrice;
    }
    var tot = subTotal(model, diags, basePrice, opt) + sizePrice(model, diags, squareMetersPrice, basePrice, opt);

    if (opt.s) {
        opt.s.priceInfo = opt.s.priceInfo || {};
    }

    if (opt.s) {
        if (opt.s.settings) {
            if (opt.s.settings.pricePercentageIncrease && model.date) {
                var increase = opt.s.settings.pricePercentageIncrease;
                var percentage = 0;
                if (isSaturday(model.date)) {
                    percentage = (percentage > increase.saturday) ? percentage : increase.saturday;
                    delete opt.s.priceInfo['increase-today'];
                    delete opt.s.priceInfo['increase-tomorrow'];
                    opt.s.priceInfo['increase-saturday'] = tot * (percentage / 100) + ' (' + percentage + '%)';
                }
                if (isTomorrow(model.date)) {
                    percentage = (percentage > increase.tomorrow) ? percentage : increase.tomorrow;
                    delete opt.s.priceInfo['increase-today'];
                    delete opt.s.priceInfo['increase-saturday'];
                    opt.s.priceInfo['increase-tomorrow'] = tot * (percentage / 100) + ' (' + percentage + '%)';
                }
                if (isToday(model.date)) {
                    percentage = (percentage > increase.today) ? percentage : increase.today;
                    delete opt.s.priceInfo['increase-tomorrow'];
                    delete opt.s.priceInfo['increase-saturday'];
                    opt.s.priceInfo['increase-today'] = tot * (percentage / 100) + ' (' + percentage + '%)';
                }


                tot = tot + tot * (percentage / 100);
            }
        }

        //_client discount (if any)
        if ($U.val(model, '_client.discount')) {
            var discount = $U.val(model, '_client.discount');
            if (discount > 0) {
                opt.s.priceInfo['client-discount'] = -tot * (discount / 100) + ' (' + discount + '%)';
                tot = tot - tot * (discount / 100);
            }
        }
    }

    var realTot = parseInt(parseInt(tot) / 10, 10) * 10;


    if (opt.s) {
        opt.s.priceInfo = opt.s.priceInfo || {};
        opt.s.priceInfo['Round-to-near-10'] = (tot - realTot) * -1;
    }

    if (opt.overwriteModel === false) {

    }
    else {
        model.price = realTot;
    }

    return showRounded ? realTot : tot;
};

function OrderTotalTime(selectedDiags, diags) {
    var total = 0;
    if (!selectedDiags) return 0;
    Object.keys(selectedDiags).forEach(function(mkey) {
        if (!selectedDiags[mkey]) return;
        diags.forEach(function(dval, dkey) {
            if (dval.name == mkey) {
                dval.time = dval.price / 4;
                total += dval.time || 0;
                return false;
            }
        });
    });
    total = parseInt(parseInt(total) / 10, 10) * 10 + 10;
    var hours = Math.floor(total / 60);
    var minutes = total % 60;
    var t = {
        hours: hours,
        minutes: minutes
    };
    return t;
};

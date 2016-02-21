function openStripeModalPayOrder(order,cb) {
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
        email: order._client.email,
        currency: "eur",
        amount: order.price * 100,
        //billingAddress:true,
        zipCode: false,
        allowRememberMe: false
    });

}


function normalizeOrderTime(t) {
    if (t.minutes > 0 && t.minutes < 15) {
        t.minutes = 15;
    }
    if (t.minutes > 15 && t.minutes < 30) {
        t.minutes = 30;
    }
    if (t.minutes > 30 && t.minutes < 45) {
        t.minutes = 45;
    }
    if (t.minutes > 45 && t.minutes < 59) {
        t.hours += 1;
        t.minutes = 0;
    }
    return t;
}

var subTotal = function(model, diags, basePrice) {
    var total = 0;
    model.diags = model.diags || {};
    Object.keys(model.diags).forEach(function(mkey) {
        if (!model.diags[mkey]) return;
        diags.forEach(function(dval, dkey) {
            if (!dval.show) {
                return;
            }
            if (dval.name == mkey) {
                total += dval.price || 0;
                return false;
            }
        });
    });
    return basePrice + total;
};
var sizePrice = (model, diags, squareMetersPrice, basePrice) => {
    var rta = 0;
    if (model.house && model.squareMeters) {
        var porcent = squareMetersPrice[model.squareMeters];
        if (_.isUndefined(porcent) || _.isNull(porcent)) {
            console.warn('sizePrice: squareMeters missing in model.');
            porcent = 0;
        }
        if (parseInt(porcent) === 0) {
            rta = 0;
        } else {
            rta = (subTotal(model, diags, basePrice) * parseInt(porcent)) / 100;
        }
    }
    return rta;
}
var totalPrice = (showRounded, model, diags, squareMetersPrice, basePrice) => {
    var tot = subTotal(model, diags, basePrice) + sizePrice(model, diags, squareMetersPrice, basePrice);
    var realTot = parseInt(parseInt(tot) / 10, 10) * 10;
    model.price = realTot;
    return showRounded ? realTot : tot;
};

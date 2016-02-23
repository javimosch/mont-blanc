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

var subTotal = function(model, diags, basePrice,opt) {
    opt = opt || {}; //s:scope
    if(opt.s){
        opt.s.priceInfo = opt.s.priceInfo || {};
        opt.s.priceInfo.basePrice = opt.s.priceInfo.basePrice;
    }
    var total = 0;
    model.diags = model.diags || {};
    Object.keys(model.diags).forEach(function(mkey) {
        if (!model.diags[mkey]) {
            if(opt.s && opt.s.priceInfo[mkey]){
                delete opt.s.priceInfo[mkey]
            }
            return;
        }
        diags.forEach(function(dval, dkey) {
            if (!dval.show) {
                return;
            }
            if (dval.name == mkey) {
                if(opt.s)opt.s.priceInfo[mkey] = dval.price;
                total += dval.price || 0;
                return false;
            }
        });
    });
    var rta = basePrice + total;
    if(total===0){
        if(opt.s)opt.s.priceInfo.basePrice = 0;
        rta = 0;
    }else{
        if(opt.s)opt.s.priceInfo.basePrice = basePrice;
    }
    return rta;
};
var sizePrice = (model, diags, squareMetersPrice, basePrice,opt) => {
    var rta = 0;
    //
    var isHouse = model.info?model.info.house:model.house; 
    var squareMeters = model.info?model.info.squareMeters:model.squareMeters;
    //
    if (isHouse && squareMeters) {
        var porcent = squareMetersPrice[squareMeters];
        if (_.isUndefined(porcent) || _.isNull(porcent)) {
            console.warn('sizePrice: squareMeters missing in model.');
            porcent = 0;
        }
        if (parseInt(porcent) === 0) {
            rta = 0;
        } else {
            var sub = subTotal(model, diags, basePrice,opt);
            rta = sub * parseInt(porcent);
            rta = rta / 100;
        }
    }
    if(opt && opt.s){
        opt.s.priceInfo = opt.s.priceInfo || {};
        opt.s.priceInfo.sizePrice = rta;
    }
    return rta;
}
var totalPrice = (showRounded, model, diags, squareMetersPrice, basePrice,opt) => {
    var tot = subTotal(model, diags, basePrice,opt) + sizePrice(model, diags, squareMetersPrice, basePrice,opt);
    var realTot = parseInt(parseInt(tot) / 10, 10) * 10;

    opt = opt||{};
    if(opt.s){
        opt.s.priceInfo = opt.s.priceInfo || {};
        opt.s.priceInfo['Round-to-near-10']= (tot-realTot) * -1;
    }

    if(opt.overwriteModel === false){

    }else{
        model.price = realTot;    
    }
    
    return showRounded ? realTot : tot;
};

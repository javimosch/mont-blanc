var path = require('path');


module.exports = {
    orderFacade: () => require(path.join(process.cwd(), 'model/facades/order-facade')),
    mailFacade: () => require(path.join(process.cwd(), 'model/facades/mail-facade')),
    responseFacade: () => require(path.join(process.cwd(), 'model/facades/response-facade')),
    validatorFacade: () => require(path.join(process.cwd(), 'model/facades/validator-facade'))
};

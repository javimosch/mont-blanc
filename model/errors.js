function createInvalidRequestErrorFor(field) {
    return {
        message: "La propriété " + field + " est requise dans le request",
        detail: "The follow field is required in the payload: " + field,
        code: 45
    };
}

module.exports = {
    GUESS_ACCOUNT_RESTRICTION: {
        message: "Les comptes invités ne peuvent pas entrer dans backoffice",
        detail: "Guest accounts do not have access to backoffice",
        code: 44
    },
    UNKOWN_ERROR: {
        message: "Erreur inconnue",
        detail: "Une erreur a été lancée mais aucune information n'a été présentée",
        code: 300
    },
    VALIDATE_FIELD_EMAIL: createInvalidRequestErrorFor('email'),
    VALIDATE_FIELD_PHONE: createInvalidRequestErrorFor('phone'),
    VALIDATE_FIELD_FULLNAME: createInvalidRequestErrorFor('fullName'),
    VALIDATE_FIELD_IS_GUEST_ACCOUNT: createInvalidRequestErrorFor('isGuestAccount'),
    VALIDATE_FIELD_ORDER: createInvalidRequestErrorFor('order'),
    VALIDATE_FIELD_USER: createInvalidRequestErrorFor('user'),
    VALIDATE_FIELD_VALID_ORDER: createInvalidRequestErrorFor('order, order._id'),

    ID_REQUIRED: createInvalidRequestErrorFor('_id'),
    DESCRIPTION_REQUIRED: createInvalidRequestErrorFor('description'),
    CODE_REQUIRED: createInvalidRequestErrorFor('code'),

    ORDER_NOT_FOUND: {
        message: "Order not found",
        code: 500
    },
    ORDER_ID_REQUIRED: {
        message: 'orderId requis',
        code: 5101
    },
    USER_REQUIRED: {
        message: 'userId or _user requis',
        code: 5100
    },
    EMAIL_NOT_FOUND: {
        message: "Le compte n&#39;existe pas",
        code: 600
    },
    INVALID_VARIABLE_AT_PATH_ERROR: {
        message: "Invalid variable at path",
        code: 70
    },
    DATABASE_OBJECT_MISMATCH_ERROR: {
        code: 71
    },
    COUPON_ALREADY_USED:{
        code:6301,
        message:"Le coupon de réduction a déjà été utilisé"
    },
    COUPON_CANNOT_BE_USED:{
        code:6300,
        message:"Le coupon de réduction ne peut pas être utilisé"
    },
    fn: {
        COUPON_CANNOT_BE_USED: function(detail) {
            return {
                code: 6300,
                message: "Le coupon de réduction ne peut pas être utilisé",
                detail: detail
            };
        },
    },
    INVALID_VARIABLE_AT_PATH: function(variableName, path) {
        return {
            code: 70,
            message: "Server variable cannot be resolved",
            detail: path
        };
    },
    DATABASE_OBJECT_MISMATCH: function(variableName, path) {
        return {
            code: 71,
            message: "An object do not exist in database",
            detail: variableName + " at " + path
        };
    }
};

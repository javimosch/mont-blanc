function createInvalidRequestErrorFor(field) {
    return {
        message: "La propriété " + field + " est requise dans le request",
        detail: "The follow field is required in the payload: " + field,
        code: 45
    }
}

module.exports = {
    GUESS_ACCOUNT_RESTRICTION: {
        message: "Les comptes invités ne peuvent pas entrer dans backoffice",
        detail: "Guest accounts do not have access to backoffice",
        code: 44
    },
    VALIDATE_FIELD_EMAIL: createInvalidRequestErrorFor('email'),
    VALIDATE_FIELD_IS_GUEST_ACCOUNT: createInvalidRequestErrorFor('isGuestAccount')
}

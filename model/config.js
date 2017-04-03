module.exports = {

    PROD: process.env.PROD && process.env.PROD.toString() == '1' || false,
    PORT: process.env.PORT || 3000,

    serverURL: process.env.serverURL || 'https://www.diagnostical.fr',
    isMailingDisabled: process.env.disableMailing === '1',

    MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN || 'diagnostical.fr',
    MAILGUN_API_KEY: process.env.MAILGUN_API_KEY || 'key-537daa84b8e3ea8797c895c8b5725ee0',

    ERROR: {
        DATABASE_ISSUE: "Database Issue (Code:200)"
    }
};

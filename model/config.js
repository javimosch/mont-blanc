module.exports = {

    FILE_LOGGING_LEVEL: process.env.FILE_LOGGING_LEVEL || "DEBUG",

    DB_URI: process.env.dbURI,

    SOCKETS_PORT: 8081,

    RESOURCES_PATH: process.env.RESOURCES_PATH, //EX: /var/staticPermanentFolder

    SSH_HOST: process.env.SSH_HOST || '62.210.97.81',
    SSH_USER: process.env.SSH_USER || 'root',
    SSH_PWD: process.env.SSH_PWD,

    GITLAB_API_KEY: process.env.GITLAB_API_KEY,

    PROD: process.env.PROD && process.env.PROD.toString() == '1' || false,
    PORT: process.env.PORT || 3000,

    serverURL: process.env.serverURL || 'https://www.diagnostical.fr',
    serverRawURL: process.env.serverRawURL || 'http://62.210.97.81:8080',
    isMailingDisabled: process.env.disableMailing === '1',

    MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN || 'diagnostical.fr',
    MAILGUN_API_KEY: process.env.MAILGUN_API_KEY || 'key-537daa84b8e3ea8797c895c8b5725ee0',

    //This will set mail address for every email sent (only development)
    USE_MAIL_TO: process.env.USE_MAIL_TO && process.env.USE_MAIL_TO.toString() == '1' || false,
    MAIL_TO: process.env.MAIL_TO || "arancibiajav@gmail.com",

    ERROR: {
        DATABASE_ISSUE: "Database Issue (Code:200)"
    },

    DEBUG_PDF_GENERATION: process.env.DEBUG_PDF_GENERATION && process.env.DEBUG_PDF_GENERATION.toString() == '1' || false,

    DISABLE_LEMONWAY: process.env.DISABLE_LEMONWAY && process.env.DISABLE_LEMONWAY.toString() == '1',
    
    MIXPANEL_TOKEN: process.env.MIXPANEL_TOKEN,
    AMPLITUDE_TOKEN: process.env.AMPLITUDE_TOKEN
};

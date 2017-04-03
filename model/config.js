module.exports = {
    PROD: process.env.PROD && process.env.PROD.toString() == '1' || false,
    PORT: process.env.PORT || 3000,
    serverURL: process.env.serverURL,
    isMailingDisabled: process.env.disableMailing === '1',
    
    ERROR:{
        DATABASE_ISSUE:"Database Issue (Code:200)"
    }
};

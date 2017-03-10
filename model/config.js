module.exports = {
    PROD: process.env.PROD && process.env.PROD.toString() == '1' || false,
    PORT: process.env.PORT || 3000
};

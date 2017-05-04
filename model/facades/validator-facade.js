module.exports = {
    validMongooseObject: (object) => {
        return object && object._id
    }
};

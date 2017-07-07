var path = require('path');
var resolver = require(path.join(process.cwd(), 'model/facades/resolver-facade'));
var notificationFacade = resolver.getFacade('notification');
var status = {
    processing: []
}
var logger = resolver.loggerFacade({
    name: "Diagnostical-notification",
    category: "Facade"
});
module.exports = {
    addNotification: addNotification
};


function createHash(type, data) {
    var order = data._order || null;
    var user = data._user || null;
    var admin = data._admin || null;
    var id = (order ? order._id : "");
    id += (id === '' ? '' : '_') + (user ? user._id : "");
    id += (id === '' ? '' : '_') + (admin ? admin._id : "");
    return id + '_' + type;
}

function isProcessing(type, data) {
    var hash = createHash(type, data);
    return (status.processing.indexOf(hash) != -1);
}

function markAsProcessing(type, data) {
    if (isProcessing(type, data)) return;
    status.processing.push(createHash(type, data));
}

function unmarkAsProcessing(type, data) {
    setTimeout(function() {
        if (!isProcessing(type, data)) return;
        status.processing.splice(status.processing.indexOf(createHash(type, data)), 1);
    }, 2000);
}

function addNotification(type, data) {
    return resolver.promise((resolve, reject) => {

        var attachDocument = data.attachDocument;
        if (!attachDocument) {
            return reject(RESPONSE_ERROR('Document to attach notification missing.'));
        }

        if (isProcessing(type, data)) return resolve(RESPONSE_PROCESSING());
        markAsProcessing(type, data);

        if (data.forceSend) {
            return withValidatedNotification();
        }

        //Legacy validation: flag present in the attachDocument
        if (attachDocument.notifications) {
            if (attachDocument.notifications[type]) {
                return resolve(RESPONSE_ALREADY_PROCESSED_LEGACY(type));
            }
            else {

                //Bug fix: misspelled type alredy in prod. (Wrong: DIAGS_)
                if ((type === 'DIAG_DIAG_ACCOUNT_ACTIVATED' && attachDocument.notifications['DIAGS_DIAG_ACCOUNT_ACTIVATED']) || (type === 'DIAG_DIAG_ACCOUNT_CREATED' && attachDocument.notifications['DIAGS_DIAG_ACCOUNT_CREATED'])) {
                    return resolve(RESPONSE_ALREADY_PROCESSED_LEGACY(type));
                }
            }

            if (data.to) {
                
                var legacyImprovedHashKey = type+'_'+data.to.replace(new RegExp("\\.", 'g'), '_dot_');

                if (attachDocument.notifications[legacyImprovedHashKey]) {
                    logger.debugTerminal('Already processed, flag present was legacy improved');
                    return resolve(RESPONSE_ALREADY_PROCESSED(type));
                }
            }
        }
        else {
            logger.warn('Legacy validation skip. notifications attribute missing.');
        }

        //Validation: reference present in _notifications
        if (!data.to) {
            return reject(RESPONSE_ERROR('to attribute missing.'));
        }

        attachDocument.populate({
            path: '_notifications',
            match: {
                to: data.to,
                type: type
            }
        }).execPopulate().then(doc => {
            if (doc._notifications.length !== 0) {
                logger.debugTerminal('validation halt: reference in _notifications', data.to, type);
                return resolve(RESPONSE_ALREADY_PROCESSED(type));
            }
            else {
                return withValidatedNotification();
            }
        });



        function withValidatedNotification() {
            resolver.ctrl('Notification').trigger(type, data).then(res => {
                var notification = res.doc;

                if (!notification) {
                    unmarkAsProcessing(type, data);
                    return reject(RESPONSE_ERROR('Notification added. Notification document was not present. Attachment was not possible'));
                }

                //Attach notification to Order or User    

                notificationFacade.attachNotification(attachDocument, notification).then(res => {
                    logger.debugTerminal("Notification added ", createHash(type, data));
                    unmarkAsProcessing(type, data);
                    resolve(RESPONSE_QUEUED());
                }).catch(err => {
                    unmarkAsProcessing(type, data);
                    reject(err);
                });

            }).catch(err => {
                unmarkAsProcessing(type, data);
                reject(err);
            });
        }

    });
}

function RESPONSE_PROCESSING() {
    return {
        message: "Already processing"
    };
}

function RESPONSE_QUEUED() {
    return {
        message: "Notification queued"
    };
}



function RESPONSE_ERROR(msg) {
    var msg = "Implementation error: " + msg;
    logger.error(msg);
    return {
        message: msg
    };
}

function RESPONSE_ALREADY_PROCESSED(type) {
    logger.debugTerminal('Already processed:', type);
    return {
        message: "Already processed (" + type + ")"
    };
}


function RESPONSE_ALREADY_PROCESSED_LEGACY(type) {
    logger.debugTerminal('Already processed, flag present was legacy:', type);
    return {
        message: "Already processed (" + type + ")"
    };
}

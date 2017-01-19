var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    def: {
        level: {
            type: String,
            default: 'error'
        },
        category: {
            type: String,
            default: 'other'
        },
        type: {
            type: String,
            default: 'error'
        }, //deprecated. It should be replaced in favor of level property.
        message: {
            type: String
        },
        data: {
            type: {},
            default: {}
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }
};
/*
Critical Error
30
Critical
Events that demand the immediate attention of the system administrator. They are generally directed at the global (system-wide) level, such as System or Application. They can also be used to indicate that an application or system has failed or stopped responding.
Error
40
Error
Events that indicate problems, but in a category that does not require immediate attention.
Warning
50
Warning
Events that provide forewarning of potential problems; although not a response to an actual error, a warning indicates that a component or application is not in an ideal state and that some further actions could result in a critical error.
Information
80
Informational
Events that pass noncritical information to the administrator, similar to a note that says: "For your information."
Verbose
*/
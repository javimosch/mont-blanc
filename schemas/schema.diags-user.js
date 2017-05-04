var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = {
    def: {

        email: {
            type: String,
            unique: true
        },
        userType: {
            type: String,
            default: 'admin'
        }, //admin client diag
        password: String,
        firstName: String,
        lastName: String,

        fixedTel: String,
        cellPhone: String,


        //DIAG / CLIENT
        _orders: [{
            type: Schema.Types.ObjectId,
            ref: 'Order'
        }],

        //google address
        address: String,
        city: String,
        department: String,
        departments: [{
            type: String,
        }],
        region: String,
        country: String,
        postCode: String,

        stripeCustomer: {
            type: String,
            default: null
        },

        //DIAG
        priority: {
            type: Number
        },
        //diagWebsiteComission:{type:Number,default:0},
        diplomes: [{
            type: Schema.Types.ObjectId,
            ref: 'fs.files'
        }],
        diplomesInfo: {
            type: {}
        }, //expiration date, obtention date, file info, etc.
        commission: Number,
        disabled: {
            type: Boolean,
            default: false
        },
        notifications: {
            type: {},
            default: {}
        },

        //A system user is created automatically by the app. 
        isSystemUser: {
            type: Boolean,
            default: false
        },

        //CLIENT
        legalStatus: {
            type: String, //(0 morale,1 indivision,2 physic)
            default: '0'
        },
        clientType: {
            type: String
        }, //(landlord / agency / Foncière)
        discount: {
            type: Number,
            default: 0
        },
        isGuestAccount: {
            type: Boolean,
            default: false
        },

        //CLIENT  DIAG
        companyName: {
            type: String
        },
        siret: String,
        tva_intra_comm: String,
        isAutoentrepreneur: {
            type: Boolean,
            default: false
        },

        //wallet ID
        wallet: {
            type: String,
            default: null
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

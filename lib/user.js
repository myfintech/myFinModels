'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var models = require('./waitlistUser'); 
var Sms = require('../remote/sms');
var encrypt = require('mongoose-encryption'); 
var fs = require('fs'); 
var path = require('path'); 
var Promise = require('bluebird'); 
var BaseAccount = require('./account').BaseAccount; 


var UserSchema = new models.BaseSchema({
  birthday: {type: Date },
  zipCode: {type: Number },
  // add other types at some point 
  phoneNumber: {type: String,  minlength: 10, maxlength: 10},
  pin: {type: String, select: false},
  // Admin, User 
  roles: [String], 
  yodlee_username: {type: String, select: false}, 
  yodlee_password: {type: String, select: false}, 
  // make this a hash
  institutionsAttemptedToLink: Object, 
  financialProfile: [{
    cash: {type: Number}, 
    stash: {type: Number}, 
    loans: {type: Number}, 
    investments: {type: Number}, 
    creditCards: {type: Number}, 
    dateCreated: {type: Date, default: Date.now}
  }], 
  cashFlowProfile: [{
    made: {type: Number}, 
    spent: {type: Number}, 
    fromFriends: {type: Number}, 
    net: {type: Number} 
  }], 
  institutionsLinked: [{type: Schema.Types.ObjectId, ref: 'Institution'}]
 
}, {collection: "users", discriminatorKey: '__t'});

UserSchema.set('toObject', {
  virtuals: true
})


// UserSchema.path('__t').index(true)

/**
 * Methods
 *
***/

UserSchema.methods = {
 
  sms: function(msg) {
    var self = this;
    if(!this.phoneNumber) {
      return Promise.reject(new Error(self.name + " has no phone number"));
    }
    var sms = new Sms(self.phoneNumber, msg)
    return sms.send();
  },
  
  getAccounts: function(){
    return mongoose.model('Accounts').find({user: this._id})
  }, 

  doesUserHaveInstitution: function(institutionId){
    return this.institutionsLinked.some(function(id){
      return id.equals(institutionId)
    })
  }
};


UserSchema.statics = { 
  findAdmins: function(){
    return this.find({ roles : {$elemMatch: {$eq: 'Admin' } } } )
  }
};



// // mongoose doc lock: 
UserSchema.plugin(require('../components/mongoose-doc-lock.plugin'))


// // login plugin 
UserSchema.plugin(require('../components/login.plugin'))


// //  mongoose-encryption docs: https://github.com/joegoldbeck/mongoose-encryption
// //   mongoose-encryption code: 

// // development only 
var encKey = fs.readFileSync(path.join(process.cwd(), '/certs/test_key.pem'), "utf8");
var sigKey = fs.readFileSync(path.join(process.cwd(), '/certs/test_sign.pem'), "utf8");


// UserSchema.plugin(encrypt, { encryptionKey: encKey, signingKey: sigKey , excludeFromEncryption: ['email', 'confirmEmailToken', 'confirmEmailTokenExpires', 'resetPasswordToken', 'resetPasswordTokenExpires', 'phoneVerificationCodeExpires', 'phoneVerificationCode']});
UserSchema.plugin(encrypt, { encryptionKey: encKey, signingKey: sigKey , encryptedFields: ['firstName', 'lastName']});
// This adds _ct and _ac fields to the schema, as well as pre 'init' and pre 'save' middleware,
// and encrypt, decrypt, sign, and authenticate instance methods

module.exports = models.Base.discriminator('User', UserSchema)

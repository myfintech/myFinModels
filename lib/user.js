"use strict"; 

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var fs = require("fs"); 
var path = require("path"); 
var util = require("util")
// DOCS: https://github.com/Automattic/mongoose/pull/1647
var Sms = require('../components/sms');
var encrypt = require('mongoose-encryption'); 
var Promise = require('bluebird'); 
var BaseAccount = require('./account').BaseAccount; 

// baseSchema holds all of the fields common to all users 
function BaseSchema(){

  Schema.apply(this, arguments)

  this.add({
    firstName: {type: String },
    lastName: {type: String },
    email: { type: String, lowercase: true },
    gender: {type: String}

  })
}


// make the base inherit from the generic mongoose schema 
util.inherits(BaseSchema, Schema)

// create baseUser class from the base
var BaseUserSchema = new BaseSchema();

BaseUserSchema.set("collection", "users"); 

// create waitList class from the base
var WaitListUserSchema = new BaseSchema({
  mailChimpId: {type: String}, 
  // this is in user too, so DRY out
  phoneNumber: {type: String},
  birthday: {type: Date}, 
  checking: {type: String}, 
  savings: {type: String}, 
  creditCards: {type: String}, 
  venmo: {type: String}, 
  paypal: {type: String}, 
  piba: {type: String}, 
  "401K": {type: String}, 
  ira: {type: String}, 
  trust: {type: String}, 
  sloan: {type: String}, 
  cloan: {type: String}, 
  mortgage: {type: String}, 
  fulltimeJob: {type: String}, 
  parttimeJob: {type: String}, 
  freelance: {type: String}, 
  semployed: {type: String}, 
  ustudent: {type: String}, 
  gstudent: {type: String}, 
  unemployed: {type: String}, 
  other: {type: String}, 
  aincome: {type: String}, 
  rent: {type: String} 
});  

WaitListUserSchema.set("collection", "users")

var encKey = fs.readFileSync(path.join(process.cwd(), '/certs/test_key.pem'), "utf8");
var sigKey = fs.readFileSync(path.join(process.cwd(), '/certs/test_sign.pem'), "utf8");


// BaseUserSchema.plugin(encrypt, { encryptionKey: encKey, signingKey: sigKey , excludeFromEncryption: ['email']});


// This adds _ct and _ac fields to the schema, as well as pre 'init' and pre 'save' middleware,
// and encrypt, decrypt, sign, and authenticate instance methods




////////////////////////////// USER 

var UserSchema = new BaseSchema({
  birthday: {type: Date },
  zipCode: {type: Number },
  phoneNumber: {type: String,  minlength: 12, maxlength: 12},
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


// register baseUser model 
var BaseUserModel = mongoose.model('BaseUser', BaseUserSchema)

// WaitListUserSchema.plugin(encrypt, { encryptionKey: encKey, signingKey: sigKey});
// add waitlist user as a type of the baseUser
var WaitListUserModel = BaseUserModel.discriminator('WaitListUser', WaitListUserSchema)

var UserModel = BaseUserModel.discriminator('User', UserSchema)



module.exports = {
  
  // export base model so user model can be a discriminator of it 
  BaseUser: BaseUserModel, 
  WaitListUser: WaitListUserModel, 
  User: UserModel
}
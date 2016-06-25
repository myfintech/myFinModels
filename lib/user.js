"use strict";

var config = require('../components/config')
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
var PlaidAccount = require('./plaidAccount');
var BaseInstitution = require('./institution').BaseInstitution;

var FirebaseTokenGenerator = require("firebase-token-generator");
var tokenGenerator = new FirebaseTokenGenerator(config.firebase.clientSecret);


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
  email: {type: String},
  fname: {type: String},
  lname: {type: String},
  pNumber: {type: String},
  bday: {type: Date},
  checking: {type: String},
  savings: {type: String},
  ccards: {type: String},
  mailChimpId: {type: String},
  venmo: {type: String},
  ppal: {type: String},
  piba: {type: String},
  "401K": {type: String},
  trust: {type: String},
  ira: {type: String},
  sloan: {type: String},
  cloan: {type: String},
  mortgage: {type: String},
  ftimeJob: {type: String},
  ptimeJob: {type: String},
  freelance: {type: String},
  semployed: {type: String},
  ustudent: {type: String},
  gstudent: {type: String},
  unemployed: {type: String},
  eother: {type: String},
  aincome: {type: String},
  mrent: {type: String},
  wnumber: {type: Number},
  askus: {type: String},
  // // AW: this will haved to be stored as a string,
  // //  since this Users are in the same collection as WaitListUsers
  userId: {type: String}
});

WaitListUserSchema.set("collection", "users")


////////////////////////////// USER //////////////////////////////////////////////////////

var UserSchema = new BaseSchema({
  birthday: {type: Date },
  zipCode: {type: Number },
  phoneNumber: {type: String,  minlength: 12, maxlength: 12},
  hashedPin: {type: String, select: false},
  pin: {type: String, select: false},
  firebase_token: {type: String, select: false},

  // Admin, User
  roles: [String],
  yodlee_username: {type: String },
  yodlee_password: {type: String, select: false},
  // make this a hash
  institutionsAttemptedToLink: {type: Object, default: {}},
  financialProfiles: [{
    cash: {type: Number},
    stash: {type: Number},
    loan: {type: Number},
    investment: {type: Number},
    creditCard: {type: Number},
    dateCreated: {type: Date, default: Date.now}
  }],
  cashFlowProfiles: [{
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

  getSms: function() {
    var self = this;
    if(!this.phoneNumber) {
      return Promise.reject(new Error(self.name + " has no phone number"));
    }
    var sms = new Sms(self.phoneNumber)
    return sms.get();
  },

  getAccounts: function(){
    return mongoose.model('Accounts').find({user: this._id})
  },

  doesUserHaveInstitution: function(institutionId){
    return this.institutionsLinked.some(function(id){
      return id.equals(institutionId)
    })
  },

  authenticatePin: function(plainText){
    return this.encryptPin(plainText) === this.hashedPin;
  },

  findInstitutions: function(){
    return Promise.props({
      plaidAccounts: PlaidAccount.find({user: this._id}), 
      yodleeAccounts: BaseAccount.find({user: this._id})
    })
    .then(function(data){
      var allAccounts = data.yodleeAccounts.concat(data.plaidAccounts); 
      var institutionIds = allAccounts.map(function(account){
        return account.institution; 
      })
      return BaseInstitution.find({_id: {$in: institutionIds } }) 
    })
  },

  encryptPin: function(pin) {
    if (!pin || !this.salt) return '';
    var salt = new Buffer(this.salt, 'base64');
    return crypto.pbkdf2Sync(pin, salt, 10000, 64).toString('base64');
  }
};


UserSchema.statics = {
  findAdmins: function(){
    return this.find({ roles : {$elemMatch: {$eq: 'Admin' } } } )
  }
};

UserSchema
  .pre('save', function(next) {
    if (!this.isModified("pin")) return next();
    // salt will already exist because user must set password before setting pin
    this.hashedPin = this.encryptPin(this.pin);
    this.set("pin", undefined);
    next();
  })

UserSchema
  .pre('save', function(next){
    this.wasNew = this.isNew; 
    next(); 
  })

UserSchema
  .pre('save', function(next){
    if (!this.isNew) return next(); 
    /// if a user has just been created 
    // use the user's id to generate a token 
    // need to pass an options object that keeps the session from timing out 
    var token = tokenGenerator.createToken({uid: this._id.toString()});
    this.firebase_token = token; 
    next();
  })


// // mongoose doc lock:
UserSchema.plugin(require('../components/mongoose-doc-lock.plugin'))


// // login plugin
UserSchema.plugin(require('../components/login.plugin'))


// //  mongoose-encryption docs: https://github.com/joegoldbeck/mongoose-encryption
// //   mongoose-encryption code:

// // development only
// if (process.env.NODE_ENV === "development"){

//   // TODO : add waitlist user encryption logic to this

//   var encKey = fs.readFileSync(__dirname + '/../components/certs/test_key.pem', "utf8");
//   var sigKey = fs.readFileSync(__dirname + '/../components/certs/test_sign.pem', "utf8");
//   // UserSchema.plugin(encrypt, { encryptionKey: encKey, signingKey: sigKey , excludeFromEncryption: ['email', 'confirmEmailToken', 'confirmEmailTokenExpires', 'resetPasswordToken', 'resetPasswordTokenExpires', 'phoneVerificationCodeExpires', 'phoneVerificationCode']});
//   UserSchema.plugin(encrypt, { encryptionKey: encKey, signingKey: sigKey , encryptedFields: ['firstName', 'lastName']});
//   // This adds _ct and _ac fields to the schema, as well as pre 'init' and pre 'save' middleware,
//   // and encrypt, decrypt, sign, and authenticate instance methods
// }

// if (process.env.NODE_ENV === "development"){

//   // TODO : add waitlist user encryption logic to this
//   var encKey = fs.readFileSync(path.join(process.cwd(), '/certs/test_key.pem'), "utf8");
//   var sigKey = fs.readFileSync(path.join(process.cwd(), '/certs/test_sign.pem'), "utf8");
//   // UserSchema.plugin(encrypt, { encryptionKey: encKey, signingKey: sigKey , excludeFromEncryption: ['email', 'confirmEmailToken', 'confirmEmailTokenExpires', 'resetPasswordToken', 'resetPasswordTokenExpires', 'phoneVerificationCodeExpires', 'phoneVerificationCode']});
//   UserSchema.plugin(encrypt, { encryptionKey: encKey, signingKey: sigKey , encryptedFields: ['firstName', 'lastName']});
//   // This adds _ct and _ac fields to the schema, as well as pre 'init' and pre 'save' middleware,
//   // and encrypt, decrypt, sign, and authenticate instance methods
// }



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
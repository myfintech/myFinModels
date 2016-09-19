"use strict";

var config = require('../components/config');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var fs = require("fs");
var path = require("path");
var util = require("util");
// DOCS: https://github.com/Automattic/mongoose/pull/1647
var Sms = require('../components/sms');
var encrypt = require('mongoose-encryption');
var Promise = require('bluebird');
var BaseAccount = require('./account').BaseAccount;
var BaseTransaction = require('./transaction').BaseTransaction;
var ReferralCode = require("./referralCode"); 
var InfoNudge = require('./nudge').InfoNudge;
var Balance = require('./balance');
var PlaidAccount = require('./plaidAccount');
var BaseInstitution = require('./institution').BaseInstitution;
var mailchimp = require('@myfintech/mailchimp');
var Firebase = require("firebase");
var FirebaseTokenGenerator = require("firebase-token-generator");
var tokenGenerator = new FirebaseTokenGenerator(config.firebase.clientSecret);
var firebaseRef = new Firebase('https://myfintech.firebaseio.com/');
var sendgrid = require("sendgrid")(process.env.SENDGRID_API_KEY);
var sendEmail = Promise.promisify(sendgrid.send).bind(sendgrid);
var readFile = Promise.promisify(require("fs").readFile);
var _ = require('lodash');
var moment = require("moment");
var authWithCustomTokenAsync = Promise.promisify(firebaseRef.authWithCustomToken).bind(firebaseRef);


// baseSchema holds all of the fields common to all users
function BaseSchema(){

  Schema.apply(this, arguments)

  this.add({
    firstName: {type: String },
    lastName: {type: String },
    email: { type: String, lowercase: true },
    gender: {type: String},
    dateCreated: {type: Date, default: Date.now}

  })
}


// make the base inherit from the generic mongoose schema
util.inherits(BaseSchema, Schema)

// create baseUser class from the base
var BaseUserSchema = new BaseSchema();

// sends sms to a user
BaseUserSchema.methods.sendSms = function (msg, mediaUrl) {
  var self = this;
  if(!this.phoneNumber) {
    return Promise.reject(new Error(self.name + " has no phone number"));
  }
  var sms = new Sms(self.phoneNumber, msg, mediaUrl)
  return sms.send();
}

// finds a user by their unique phone number
BaseUserSchema.statics.findByPhoneNumber = function(phoneNumber){
  return this.findOne({phoneNumber: phoneNumber});
};

BaseUserSchema.set("collection", "users");

// create waitList class from the base
var WaitListUserSchema = new BaseSchema({
  email: {type: String},
  firstName: {type: String},
  lastName: {type: String},
  phoneNumber: {type: String},
  birthday: {type: Date},
  waitlistNumber: {type: String},
  askUs: {type: String},
  zipCode: {type: String},
  mailChimpId: {type: String},
  untourchLink: {type: String},
  confirmed: {type: Boolean, default: false},

  checkingAccount: {type: Boolean},
  savingsAccount: {type: Boolean},
  cd: {type: Boolean},
  moneyMarketFund: {type: Boolean},
  creditCardOne: {type: Boolean},
  creditCardTwoThree: {type: Boolean},
  creditCardMoreThanThree: {type: Boolean},
  venmo: {type: Boolean},
  payPal: {type: Boolean},
  personalInvestmentOrTradingAccount: {type: Boolean},
  fourZeroOneK: {type: Boolean},
  IRA: {type: Boolean},
  trustAccount: {type: Boolean},
  studentLoan: {type: Boolean},
  carLoan: {type: Boolean},
  mortgage: {type: Boolean},

  fullTimeJob: {type: Boolean},
  partTimeJob: {type: Boolean},
  freelancer: {type: Boolean},
  selfEmployed: {type: Boolean},
  studentUndergrad: {type: Boolean},
  studentGrad: {type: Boolean},
  unemployed: {type: Boolean},
  itsComplicated: {type: Boolean},
  alreadyFallingForMyFin: {type: Boolean},
  employedOther: {type: Boolean},

  noIncome: {type: Boolean},
  lessThanThirtyFiveK: {type: Boolean},
  thirtyFiveToFiftyK: {type: Boolean},
  fiftyToOneHundredK: {type: Boolean},
  oneHundredToOneFiftyK: {type: Boolean},
  moreThanOneHundredFiftyK: {type: Boolean},

  noRent: {type: Boolean},
  rentLessThanOneK: {type: Boolean},
  rentOneToTwoK: {type: Boolean},
  rentTwoToThreeK: {type: Boolean},
  rentOverThreeK: {type: Boolean},

  yesISave: {type: Boolean},
  noIDontSave: {type: Boolean},
  yesIInvest: {type: Boolean},
  noIDontInvest: {type: Boolean},

  male: {type: Boolean},
  female: {type: Boolean},
  genderOther: {type:Boolean}
});



WaitListUserSchema.methods = {

  sendOptInEmail: function(optInBaseUrl) {
    return Promise.resolve(readFile(__dirname + '/../components/opt-in-confirmation.html', 'utf-8')).bind(this)
    .then(function(optInEmail){
      optInEmail = optInEmail.replace('{{MyFinLink}}', 'http://www.myfin.tech');
      optInEmail = optInEmail.replace('{{ConfirmEmailLink}}',  optInBaseUrl + '/my-profile?id=' + this._id);
      var email = new sendgrid.Email();
      email.addTo(this.email);
      email.setFrom("fin@myfin.tech");
      email.setFromName("MyFin");
      email.setSubject("Confirm your email");
      email.setHtml(optInEmail);
      return sendEmail(email);
    })
  },

  createOrUpdateOnMailChimpList: function(data) {
    data.mergeFields = data.mergeFields || {};
    data.mergeFields["MYFINID"] = this._id;
    data.mergeFields["FNAME"] = this.firstName;
    data.mergeFields["LNAME"] = this.lastName;
    data.mergeFields["BDAY"] = this.birthday;
    data.mergeFields["ASKUS"] = this.askUs;
    data.mergeFields["ZIP"] = this.zipCode;
    data.mergeFields["PNUMBER"] = this.phoneNumber;
    data.mergeFields["UNTOURCH"] = this.untourchLink;
    data.status = data.status || 'subscribed';
    var interests = {};
    _.each(mailchimp.interestMaps[data.listId], function(value, key) {
      if (this[key]) {
        interests[value] = true;
      } else {
        interests[value] = false;
      }
    }.bind(this))
    return mailchimp.addOrUpdateListMember(data.listId, this.email, data.mergeFields, data.status, interests);
  },

};


WaitListUserSchema.set("collection", "users")


////////////////////////////// USER //////////////////////////////////////////////////////

var UserSchema = new BaseSchema({
  isEmailSet: {type: Boolean, default: false},
  isPasswordSet: {type: Boolean, default: false}, 
  birthday: {type: Date },
  zipCode: {type: Number },
  cards: [{type: mongoose.Schema.Types.ObjectId, ref: 'InfoNudge'}],
  phoneNumber: {type: String,  minlength: 12, maxlength: 12},
  hashedPin: {type: String, select: false},
  pin: {type: String },
  firebase_token: {type: String, select: false},
  firebase_uid: {type: String},
  // Admin, User
  roles: [String],
  referralCode: {type: mongoose.Schema.Types.ObjectId, ref: 'ReferralCode'}, 
  yodlee_username: {type: String },
  yodlee_password: {type: String, select: false},
  // make this a hash
  institutionsAttemptedToLink: {type: Object, default: {}},
  institutions: [{type: Schema.Types.ObjectId, ref: 'Institution'}],
  historicalTransactionsLinked: {type: Array, default: []},
  // financialProfiles: [{type: Schema.Types.ObjectId, ref: 'FinancialProfile'}], 
  // cashFlowProfiles: [{type: Schema.Types.ObjectId, ref: 'CashFlowProfile'}], 
  sourceAccountIdToAccountMyFinTypeMap: {type: Object, default: {}},

  // new 
  sourceInstitutionIdToGetsTransactionsMap: {type: Object, default: {}},
  sourceAccountIdToBirthdateMap: {type: Object, default: {}},

  sourceAccountIdToMyFinInstitutionIdMap: {type: Object, default: {}},
  hasYodlee: {type: Boolean},
  hasPlaid: {type: Boolean},
  hasFullContact: {type: Boolean, default: false},
  hasSeenProfile: {type: Boolean, default: false},
  fullContact: {type: Object, default: {}},
  sourceInstitutions: {type: Array, default: []},
  // this will point to an object id
  phoneContacts: {type: Array, select: false, default: []},
  settings: {type: Object, default: {}},
  monthlyRent: {type: Number},
  income: {type: Number},
  reportedAccounts: {type: Array, default: []},
  reportedSituation: {type: Array, default: []}, 
  stateMap: {type: Object, default: {}},
//   budget: {
//     // percentage 
//     savingsTargetRate: {type: Number}, 
//     monthlyTakeHome: {type: Number},
//     monthlyRent: {type: Number}, 
//     monthlyNonRentRecurring: {type: Number}, 
//     lastUpdated: {type: Date},
//     dateCreated: {type: Date, default: Date.now}, 
//     taxStatus: {type: String}
// }, 
  // budget: {type: Object},
  leftInTheTank: {
    // percentage 
    savingsTargetRate: {type: Number, min: 0}, 
    monthlyTakeHome: {type: Number, min: 0},
    monthlyRent: {type: Number, min: 0}, 
    monthlyNonRentRecurring: {type: Number, min: 0}, 
    lastUpdated: {type: Date},
    dateCreated: {type: Date}, 
    taxStatus: {type: String}
  },
  hasBeenTexted: {type: Boolean },
  institutionTokenStatusMap: {type: Object, default: {}}
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

  sms: function(msg, mediaUrl) {
    var self = this;
    if(!this.phoneNumber) {
      return Promise.reject(new Error(self.name + " has no phone number"));
    }
    var sms = new Sms(self.phoneNumber, msg, mediaUrl)
    return sms.send();
  },

  getAccounts: function(){
    return mongoose.model('BaseAccount').find({user: this._id});
  },

  doesUserHaveInstitution: function(institutionId){
    // return this.institutions.some(function(id){
    //   return id.equals(institutionId);
    // })

    var statusArr = this.institutionTokenStatusMap[institutionId];
    // if key does not point to an array, then false
    if (!Array.isArray(statusArr)) return false; 
    // if array has no length, then false
    if (!statusArr.length) return false; 

    var tokenReceivedObj = _.find(statusArr, function(obj){
      return obj.status === "TOKEN RECEIVED";
    })
    return typeof tokenReceivedObj === "object";  
  },


  hasLinkedChecking: function(){
    // keys are account ids 
    var accountTypes = _.values(this.sourceAccountIdToAccountMyFinTypeMap); 
    var hasLinkedVenmo = this.sourceInstitutions.indexOf("30671") > -1 ? true : false;
    var count = 0;
    for (var i = 0, len = accountTypes.length; i < len; i++){
      if (accountTypes[i] === "cash") count++
    }
    if (hasLinkedVenmo && count >= 2) return true; 
    if (!hasLinkedVenmo && count >= 1) return true; 
    else return false; 
  }, 

  ownsChecking: function(){
    return this.reportedAccounts.length && this.reportedAccounts.indexOf("Checking account") > 0;
  },

  hasLinkedCC: function(){
    // keys are account ids 
    var keys = Object.keys(this.sourceAccountIdToAccountMyFinTypeMap); 
    for (var i = 0, len = keys.length; i < len; i++){
      if (this.sourceAccountIdToAccountMyFinTypeMap[keys[i]] === "creditCard") return true; 
    }
    return false;     
  },

  ownsCC: function(){
    return this.reportedAccounts.length && (
      (this.reportedAccounts.indexOf("Credit Card (only 1 card)") > 0) || (this.reportedAccounts.indexOf("Credit Card (2 - 3 cards)") > 0) 
      || (this.reportedAccounts.indexOf("Credit Card (>3 cards)") > 0) ); 
  },

  authenticatePin: function(plainText){
    return this.encryptPin(plainText) === this.hashedPin;
  },

  encryptPin: function(pin) {
    if (!pin || !this.salt) return '';
    var salt = new Buffer(this.salt, 'base64');
    return crypto.pbkdf2Sync(pin, salt, 10000, 64).toString('base64');
  },

  addAccountsToUserAccountMap: function(type, accounts){
    var primaryKey = type === "plaid" ? "plaidId" : "yodleeId";
    for (var i = 0, len = accounts.length; i < len; i++){
      // account id
      this.sourceAccountIdToAccountMyFinTypeMap[accounts[i][primaryKey]] = accounts[i].myFinType;
    }

    this.markModified("sourceAccountIdToAccountMyFinTypeMap");
    return this;
  },

  addSourceInstitutionIdsToGetsTransactionsMap: function(id, bool){
    this.sourceInstitutionIdToGetsTransactionsMap[id] = bool; 
    this.markModified("sourceInstitutionIdToGetsTransactionsMap"); 
    return this;
  },

  // this method replaces the plaid account id to myfinInstitution Id json
  // and the yodlee account id to myFinInstitution Id json
  mapSourceAccountIdsToMyFinInstitutionIds: function(type, accounts, myFinInstitutionId){
    var primaryKey = type === "plaid" ? "plaidId" : "yodleeId";
    for (var i = 0, len = accounts.length; i < len; i++){
      // account id
      this.sourceAccountIdToMyFinInstitutionIdMap[accounts[i][primaryKey]] = myFinInstitutionId;
    }

    this.markModified("sourceAccountIdToMyFinInstitutionIdMap");
    return this;
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
    console.log('here is the pin!!!!!!!!!!!!!!!!', this.pin)
    // this.hashedPin = this.encryptPin(this.pin);
    // this.set("pin", undefined);
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
    var self = this; 
    return InfoNudge.find({state: "newUser"})
    .then(function(cards){
      self.cards = cards;
      next(); 
    })
    .then(null, function(err){
      console.log("Something went oh so wrong while adding cards to a new user:", err)
      next(err);
    })
  })

UserSchema
  .pre('save', function(next){
    if (!this.isNew) return next();
    var self = this; 
    var code = this.generateReferralCode(); 
    return ReferralCode.create({
      code: code, 
      sender: this._id
    })
    .then(function(rc){
      self.referralCode = rc._id; 
      next(); 
    })
    .then(null, function(err){
      console.log("Something went oh so wrong while generating a referral code for this user:", err)
      next(err);
    })
  })

// UserSchema
//   .pre('save', function(next){
//     if (!this.isNew) return next();
//     var self = this;
//     // if a user has just been created use the user's id to generate a token
//     // need to pass an options object that keeps the session from timing out timestamp
//     var pastOurLifetime = moment().add(100, "years").unix();
//     var token = tokenGenerator.createToken({uid: this._id.toString()}, {expires: pastOurLifetime});
//     this.firebase_token = token;
//     return authWithCustomTokenAsync(this.firebase_token)
//     .then(function(data){
//       console.log("Something went oh so right while authenticating the user into firebase, here's the firebase uid:", data.uid)
//       self.firebase_uid = data.uid;
//       /// set child
//       // firebaseRef.child("users").set(self.firebase_uid) 
//       next();
//     })
//     .then(null, function(err){
//       console.log("Something went oh so wrong while authenticating the user into firebase, here's the error:", err)
//       next(err);
//     })
//   })


UserSchema
  .pre('remove', function(next){
    return Promise.props({
      removeTransactions: BaseTransaction.remove({user: this._id}), 
      removeAccounts: BaseAccount.remove({user: this._id}), 
      removeBalances: Balance.remove({user: this._id})
    })
    .then(function(){
      console.log('pre remove was successful!')
      next();
    })
    .then(null, function(err){
      console.log("Something when wrong in the pre remove hook for users", err)
      next(err)
    })
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
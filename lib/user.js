"use strict";

var config = require('../components/config')
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
var PlaidAccount = require('./plaidAccount');
var BaseInstitution = require('./institution').BaseInstitution;
var mailchimp = require('@myfintech/mailchimp');
var FirebaseTokenGenerator = require("firebase-token-generator");
var tokenGenerator = new FirebaseTokenGenerator(config.firebase.clientSecret);
var sendgrid = require("sendgrid")(process.env.SENDGRID_API_KEY);
var sendEmail = Promise.promisify(sendgrid.send);
var readFile = Promise.promisify(require("fs").readFile);
var _ = require('lodash');


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
  firstName: {type: String},
  lastName: {type: String},
  phoneNumber: {type: String},
  birthday: {type: Date},
  waitlistNumber: {type: String},
  askUs: {type: String},
  zipCode: {type: String},
  mailChimpId: {type: String},
  confirmed: {type: Boolean},

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
    data.status = data.status || 'subscribed';
    var interests = {};
    _.each(mailchimp.interestMaps[data.listId], function(value, key) {
      if (this[key]) {
        interests[value] = true;
      } else {
        interests[value] = false;
      }
    }, this)
    return mailchimp.addOrUpdateListMember(data.listId, this.email, data.mergeFields, data.status, interests);
  },

};


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
  institutions: [{type: Schema.Types.ObjectId, ref: 'Institution'}],
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
    transfer: {type: Number},
    net: {type: Number},
    dateCreated: {type: Date, default: Date.now}
  }],
  sourceAccountIdToAccountMyFinTypeMap: {type: Object, default: {}},
  hasYodlee: {type: Boolean},
  hasPlaid: {type: Boolean}
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

  getSms: function() {
    var self = this;
    if(!this.phoneNumber) {
      return Promise.reject(new Error(self.name + " has no phone number"));
    }
    var sms = new Sms(self.phoneNumber)
    return sms.get();
  },

  getAccounts: function(){
    return mongoose.model('BaseAccount').find({user: this._id});
  },

  doesUserHaveInstitution: function(institutionId){
    return this.institutionsLinked.some(function(id){
      return id.equals(institutionId);
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
      return BaseInstitution.find({_id: {$in: institutionIds } });
    })
  },


  // findInstitutions: function(){
  //   return BaseInstitution.find({_id: {$in: this.institutions } })
  // },

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
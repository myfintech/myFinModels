"use strict"; 

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var fs = require("fs"); 
var path = require("path"); 
var util = require("util")
// DOCS: https://github.com/Automattic/mongoose/pull/1647


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
 
// register baseUser model 
var Base = mongoose.model('BaseUser', BaseUserSchema)

// WaitListUserSchema.plugin(encrypt, { encryptionKey: encKey, signingKey: sigKey});
// add waitlist user as a type of the baseUser
var WaitListUserModel = Base.discriminator('WaitListUser', WaitListUserSchema)


// This adds _ct and _ac fields to the schema, as well as pre 'init' and pre 'save' middleware,
// and encrypt, decrypt, sign, and authenticate instance methods

module.exports = {
  // export base schema so UserSchema can inherit from it 
  BaseSchema: BaseSchema,   
  // export base model so user model can be a discriminator of it 
  Base: Base, 
  WaitListUser: WaitListUserModel
}
"use strict"; 

var mongoose = require('mongoose'); 
var encryption = require('../components/encryption');
var encryptStringify = encryption.encryptStringify;
var decryptParse = encryption.decryptParse;

var UserPhoneContactSchema = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}, 
  data: {type: String, get: decryptParse, set: encryptStringify}
});

UserPhoneContactSchema.set('toObject', {getters: true});
UserPhoneContactSchema.set('toJSON', {getters: true});

module.exports = mongoose.model('UserPhoneContact', UserPhoneContactSchema);


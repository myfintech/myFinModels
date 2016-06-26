'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var sourceTypes = ['yodlee', 'plaid']
var myFinTypes = ['cash', 'stash', 'creditCard', 'loan', 'investment']

var PlaidAccountSchema = new Schema({
  _original: Object,
  user: {type: Schema.Types.ObjectId, ref: 'User'},
  institution: {type: Schema.Types.ObjectId, ref: 'Institution'},
  plaidInstitutionId: String,
  plaidId: String,
  type: String,
  subtype: String,
  myFinType: { type: String, enum: myFinTypes},
  finType: String,
  name: String, 
  number: Number,
  meta: Object,
  balance: Object,
  displayName: String,
  active: {type: Boolean, default: true},
  source: { type: String, enum: sourceTypes },
});

PlaidAccountSchema.set("collection", "accounts");  

PlaidAccountSchema.statics.findByUser = function(user){
  var userId = user._id ? user._id : user; 
  return this.find({user: userId});
}

module.exports = mongoose.model('PlaidAccount', PlaidAccountSchema);


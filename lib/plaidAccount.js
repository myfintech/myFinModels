'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var sourceTypes = ['yodlee', 'plaid'];
var myFinTypes = ['cash', 'stash', 'creditCard', 'loan', 'investment', "unknown"];

var PlaidAccountSchema = new Schema({
  dateCreated: {type: Date, default: Date.now}, 
  _original: Object,
  user: {type: Schema.Types.ObjectId, ref: 'User'},
  institution: {type: Schema.Types.ObjectId, ref: 'Institution'},

  // // plaid speific stuff
  plaidId: String,
  plaidInstitutionId: String,

  // // abstract stuff
  sourceId: String, 
  sourceInstitutionId: String,
  sourceInstitutionName: String, 
  type: String,
  subtype: String,
  myFinType: { type: String, enum: myFinTypes},
  finType: String,
  name: String, 
  number: Number,
  meta: Object,
  limit: Number, 
  displayBalance: Number,
  balance: Object,
  displayName: String,
  active: {type: Boolean, default: true},
  source: { type: String, enum: sourceTypes },
  includeInCalculations: {type: Boolean, default: true},
  userDeleted: {type: Boolean, default: false}
});

PlaidAccountSchema.set("collection", "accounts");  

PlaidAccountSchema.statics.findByUser = function(user){
  var userId = user._id ? user._id : user; 
  return this.find({user: userId});
}

PlaidAccountSchema
  .pre('remove', function(next){
    return Balance.remove({account: this._id})
    .then(function(){
      console.log('pre remove was successful!')
      next();
    })
    .then(null, function(err){
      console.log("Something when wrong in the pre remove hook for users", err)
      next(err)
    })
  })

PlaidAccountSchema.index({"user": 1})
PlaidAccountSchema.index({"plaidId": 1})


module.exports = mongoose.model('PlaidAccount', PlaidAccountSchema);


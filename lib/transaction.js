"use strict"; 

var mongoose = require('mongoose'); 
var Schema = mongoose.Schema; 
var util = require('util');

//// enums!
var transactionStatus = [ "MERGED","POSTED","PENDING", "SCHEDULED", "IN_PROGRESS",
"FAILED", "CLEARED", "DISBURSED"]
var transactionBaseType = [ "CREDIT", "DEBIT", "OTHER", "UNKNOWN"]
var containerTypes = ['bank', 'creditCard', 'investment', 'insurance', 'loan', 'reward', 'bill']; 


function BaseSchema(){
  mongoose.Schema.apply(this, arguments)

  this.add({
    _original: Object, 
    account: {type: Schema.Types.ObjectId, ref: 'BaseAccount'},
    user: {type: Schema.Types.ObjectId, ref: 'User'}
  })
}

util.inherits(BaseSchema, mongoose.Schema);

var BaseTransactionSchema = new BaseSchema(); 

var PlaidTransactionSchema = new BaseSchema({
  plaidAccountId: String, 
  plaidId: String, 
  amount: Number, 
  date: String, 
  name: String, 
  meta: {
    location: {
      city: String,
      state: String, 
      address: String
    }
  }, 
  pending: Boolean, 
  type: {
    primary: String, 
  }, 
  category: [String], 
  categoryId: String, 
  score: {
    location: {
      city: Number, 
      state: Number, 
      address: Number
    }, 
    name: Number
  }
})

var YodleeTransactionSchema = new BaseSchema({ 
  yodleeId: { type: Number},
  amount: {
    amount: Number, 
    currency: String
  }, 
  containerType: { type: String, enum: containerTypes, required: true},
  category: String, 
  baseType:  {type: String, enum: transactionBaseType, required: true},
  description: {
    original: String, 
    simple: String
  }, 
  isManual: Boolean, 
  date: String, 
  postDate: String, 
  status: {type: String, enum: transactionStatus, required: true}, 
  yodleeAccountId: Number, 
  merchant: {
    name: String
  } 
})



BaseTransactionSchema.set("collection", "transactions")
YodleeTransactionSchema.set("collection", "transactions")
PlaidTransactionSchema.set("collection", "transactions")



var BaseTransactionModel = mongoose.model("Transaction", BaseTransactionSchema); 
var PlaidTransactionModel =  BaseTransactionModel.discriminator("PlaidTransaction", PlaidTransactionSchema); 
var YodleeTransactionModel = BaseTransactionModel.discriminator("YodleeTransaction", YodleeTransactionSchema);

module.exports = {
  BaseTransaction: BaseTransactionModel, 
  PlaidTransaction: PlaidTransactionModel, 
  YodleeTransaction: YodleeTransactionModel
}

















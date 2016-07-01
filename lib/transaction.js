/***

*  This model is still very much in progress 

**/

var mongoose = require('mongoose'); 
var transactionStatus = [ "MERGED","POSTED","PENDING", "SCHEDULED", "IN_PROGRESS", "FAILED", "CLEARED", "DISBURSED"];
var transactionBaseType = [ "CREDIT", "DEBIT", "OTHER", "UNKNOWN"];
var Schema = mongoose.Schema; 
var util = require('util');
var containerTypes = ['bank', 'creditCard', 'investment', 'insurance', 'loan', 'reward', 'bill']; 
var cashFlowTypes = ['made', 'spent', 'fromFriends', 'transfer', "unknown"];
var moment = require('moment');
require("moment-range"); 
var path = require("path");


function BaseSchema(){
  mongoose.Schema.apply(this, arguments)

  this.add({
    _original: Object,
    // not currently storing myFin account on transaction but each transaction 
    // has a plaid or yodlee account id that can be used to look up the myfin account doc  
    account: {type: Schema.Types.ObjectId, ref: 'BaseAccount'},
    institution: {type: Schema.Types.ObjectId, ref: 'BaseInstitution'},
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    cashFlowType: { type: String, enum: cashFlowTypes}, 
    inverse: Object, 
    inverseToBeCreated: Object, 
    otherPossibleInverses: [Object], 
    absAmount: {type: Number}, 
    baseType: {type: String, enum: transactionBaseType, required: true}


  })
}

util.inherits(BaseSchema, mongoose.Schema);

var BaseTransactionSchema = new BaseSchema(); 


var institutionIdToPlaidId = {
    '25261' :'21010010',              // betterment
    '30671' :'21010001',              // venmo
    '7298'  :'21010004',              // paypal
    '30666' :'21010006',             // coinbase
    '31575' :'21010009',             // digit
    '25707' :'21010003',             // square
    '30342' :'21010005',             // dwolla
  }

var categoryIds = ["21010010", "21010001", "21010004", "21010006", "21010009", "21010003", "21010005"];


BaseTransactionSchema.methods.isWithinRange = function(startOfRange, endOfRange){
  var myDate = moment(this.date);
  return myDate.isBefore(endOfRange) && myDate.isAfter(startOfRange);
};

BaseTransactionSchema.methods.isDebit = function(){
  return this.baseType === "DEBIT"; 
};

BaseTransactionSchema.methods.isCredit = function(){
  return this.baseType === "CREDIT"; 
};

BaseTransactionSchema.methods.isInverse = function(hingeTransaction){
  // hinge transaction is the first half of a transfer
  return this.absAmount === hingeTransaction.absAmount && hingeTransaction.isDebit() && this.isCredit(); 
};

BaseTransactionSchema.methods.isTransferCategoryPresent = function(){
  if (this.__t !== 'PlaidTransaction') return false;
  var internalAccountTransfer = "21001000";
  return categoryIds.indexOf(this.category_id) > -1 || this.category_id === internalAccountTransfer; 
};

BaseTransactionSchema.methods.markDebitWithTransferCategoryAsTransfer = function(){
  // if T is marked with third party transfer category, add target to T 
  if (categoryIds.indexOf(this.category_id) > -1){
    var keys = Object.keys(institutionIdToPlaidId);
    for (var i = 0, len = keys.length; i < len; i ++){
      if (institutionIdToPlaidId[keys[i]] === this.category_id){
        this.targetId = keys[i]; 
      }
    }
  }

  // either way, mark t as transfer and return it 
  this.cashFlowType = "transfer"; 
  return this;    
};

BaseTransactionSchema.methods.markAsMadeOrSpent = function(){
  var baseTypeToMyFinTypeMap = {
    "CREDIT": "made", 
    "DEBIT": "spent",
    "undefined": "unknown"
  }

  this.cashFlowType = baseTypeToMyFinTypeMap[this.baseType]; 
  return this; 
};

BaseTransactionSchema.methods.markAsSpent = function(){
  this.cashFlowType = "spent";
  return this; 
};

BaseTransactionSchema.methods.isCreditToStashAccount = function(user){
  if (!transaction.isCredit()) return false; 
  var accountType = user.sourceAccountIdToAccountMyFinTypeMap[transaction.yodleeAccountId || transaction.plaidAccountId];
  return accountType === 'stash'; 
};

BaseTransactionSchema.methods.isCreditToCreditCardAccount = function(user){
  if (!transaction.isCredit()) return false; 
  var accountType = user.sourceAccountIdToAccountMyFinTypeMap[transaction.yodleeAccountId || transaction.plaidAccountId];
  return accountType === 'creditCard'; 
};

BaseTransactionSchema.methods.markAsTransfer = function(){
  this.cashFlowType = "transfer";
  return this; 
};

BaseTransactionSchema.methods.isSpent = function(){
  return this.cashFlowType === "spent";
};

BaseTransactionSchema.methods.createInverseDocument = function(){
  var inverseToBeCreated = new this.constructor({
    absAmount: this.absAmount,
    //will always be a credit because the `this` MUST be a debit 
    baseType: 'CREDIT'
  });
  this.inverseToBeCreated = inverseToBeCreated;
  if (this.inverseToBeCreated.__t === "PlaidTransaction") {
    // if plaid, amount will be negative since CREDITS are always negative 
    this.inverseToBeCreated.amount = ( -1 * this.absAmount); 
    this.inverseToBeCreated.plaidInstitutionId = this.targetId;  
  }
  // if yodlee, amount of the inverse to be created will be an object with an amount property
  else {
    this.inverseToBeCreated.amount = {
      amount: this.amount.amount
    };
  }
  this.markModified('inverseToBeCreated');
  // console.log('THIS IN CREATE INVERSE DOC!!', this)
  return this; 
};

BaseTransactionSchema.methods.hasPotentialInverse = function(hash){
 return hash[this._id].length;
};

BaseTransactionSchema.methods.hasMoreThanOnePotentialInverse = function(hash){
 return hash[this._id].length > 1;
};

var socialPaymentPlaidInstitutionId = {
  '30671': true,              // venmo
  '7298' : true,              // paypal
  '30666': true,             // coinbase
  '30342': true,             // dwolla TODO look into paypal variantes and other social payment accounts/ varinets
};

var socialPaymentPlaidCategoryId = {
  '21010001': '30671',               // venmo
  '21010004': '7298',               // paypal
  '21010006': '30666',              // coinbase
  '21010005': '30342',              // dwolla
  '21010007': 'chase quickpay',    // chase quickpay
};



/*
to be fromFriends, the transaction must be a CREDIT
the category_id on the account must match one of the social payment plaid category ids 
-OR- it must be going into an account that belongs to a social payment institution

*/
BaseTransactionSchema.methods.markAsFromFriendsOrMade = function(plaidInstitutionIdToMyFinInstitutionIdMapForSocialInstitutions, yodleeInstitutionIdToMyFinInstitutionIdMapForSocialInstitutions){
  var intoLinkedSocialPaymentAccount; 
  if (this.__t === 'PlaidTransaction') {
    intoLinkedSocialPaymentAccount = plaidInstitutionIdToMyFinInstitutionIdMapForSocialInstitutions[this.institution]; 
    var intoNonLinkedSocialPaymentAccount = socialPaymentPlaidCategoryId[this.category_id]; 
    var isFromFriends = intoNonLinkedSocialPaymentAccount || intoLinkedSocialPaymentAccount; 
    if (isFromFriends) this.cashFlowType = "fromFriends"; 
    else this.cashFlowType = "made";
  }
  else if (this.__t === "YodleeTransaction"){
    // it is going INTO a venmo, paypal, coinbase, dwolla, or chase quickpay account
    intoLinkedSocialPaymentAccount = yodleeInstitutionIdToMyFinInstitutionIdMapForSocialInstitutions[this.institution]; 
    if (intoLinkedSocialPaymentAccount) this.cashFlowType = "fromFriends"; 
    else this.cashFlowType = "made";
  }
  return this; 
};


BaseTransactionSchema.methods.isMarkedAsTransfer = function(){
  if (this.__t === 'PlaidTransaction') return this.category.indexOf('Transfer') > -1; 
  else return this.category === "Transfer"; 
};


/*

PLAID TRANSACTION: 

{ 
  _account: 'pJPM4LMBNQFrOwp0jqEyTwyxJQrQbgU6kq37k',
  _id: '4r0aBVa85Kt3BDPk10a4U5OD3XKjE7Hzxpez6B',
  amount: 28.57,
  date: '2014-04-11',
  name: 'Papa Johns Pizza',
  meta: { location: [Object] },
  pending: false,
  type: { primary: 'place' },
  category: [ 'Food and Drink', 'Restaurants', 'Pizza' ],
  category_id: '13005012',
  score: { location: [Object], name: 0.2 } 
}

    
YODLEE TRANSACTION: 
{
  "_id": ObjectId("575db64e6495455dabf0b7ed"),
  "baseType": "DEBIT",
  "category": "Other Bills",
  "isManual": false,
  "date": "2013-12-28",
  "postDate": "2013-12-28",
  "status": "POSTED",
  "_original": {
    "accountId": 10227411,
    "status": "POSTED",
    "postDate": "2013-12-28",
    "date": "2013-12-28",
    "isManual": false,
    "description": {
      "original": "Telephone Bill Paid"
    },
    "category": "Other Bills",
    "baseType": "DEBIT",
    "amount": {
      "currency": "USD",
      "amount": 200
    },
    "id": 13688623,
    "CONTAINER": "creditCard"
  },
  "yodleeId": 13688623,
  "yodleeAccountId": 10227411,
  "containerType": "creditCard",
  "user": ObjectId("575db64c6495455dabf0b7d9"),
  "__t": "YodleeTransaction",
  "description": {
    "original": "Telephone Bill Paid"
  },
  "amount": {
    "amount": 200,
    "currency": "USD"
  },
  "__v": 0
}


{ CONTAINER: 'bank',
    id: 15991545,
    amount: { amount: 9846, currency: 'USD' },
    baseType: 'CREDIT',
    category: 'Uncategorized',
    description: { original: 'DESC' },
    isManual: false,
    date: '2013-01-02',
    transactionDate: '2013-01-16',
    postDate: '2013-01-02',
    status: 'POSTED',
    accountId: 10227410 }

*/


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
  category_id: String, 
  score: {
    location: {
      city: Number, 
      state: Number, 
      address: Number
    }, 
    name: Number
  }, 
  isTransfer: {type: Boolean}, 
  targetId: String
});

PlaidTransactionSchema.methods.fixAmountAndBaseType = function(){
  this.absAmount = Math.abs(this.amount); 
  if (this.amount < 0) this.baseType = "CREDIT"; 
  else this.baseType = "DEBIT"; 
  return this; 
};




var YodleeTransactionSchema = new BaseSchema({ 
  yodleeId: { type: Number},
  amount: {
    amount: Number, 
    currency: String
  }, 
  containerType: { type: String, enum: containerTypes },
  category: String, 
  description: {
    original: String, 
    simple: String
  }, 
  isManual: Boolean, 
  date: String, 
  postDate: String, 
  status: {type: String, enum: transactionStatus}, 
  yodleeAccountId: Number, 
  merchant: {
    name: String
  } 
});

YodleeTransactionSchema.methods.fixAbsAmount = function(){
  this.absAmount = Math.abs(this.amount.amount); 
  return this; 
};

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


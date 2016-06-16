/***

*  This model is still very much in progress 

**/

var mongoose = require('mongoose'); 
var transactionStatus = [ "MERGED","POSTED","PENDING", "SCHEDULED", "IN_PROGRESS",
"FAILED", "CLEARED", "DISBURSED"]
var transactionBaseType = [ "CREDIT", "DEBIT", "OTHER", "UNKNOWN"]
var Schema = mongoose.Schema; 
var util = require('util')
var containerTypes = ['bank', 'creditCard', 'investment', 'insurance', 'loan', 'reward', 'bill']; 
var cashFlowTypes = ['made', 'spent', 'fromFriends', 'transfer', "unknown"]
var moment = require('moment');
require("moment-range"); 

/*

For PLAID

+ amount === inflow 
account is the account into which the money flows


FOR YODLEE 

CREDIT === inflow 
account is the account into which the money flows 


*/

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
    otherPossibleInverses: [Object]

  })
}

var institutionIdToPlaidId = {
    '25261' :'21010010',              // betterment
    '30671' :'21010001',              // venmo
    '7298'  :'21010004',              // paypal
    '30666' :'21010006',             // coinbase
    '31575' :'21010009',             // digit
    '25707' :'21010003',             // square
    '30342' :'21010005',             // dwolla
  }

util.inherits(BaseSchema, mongoose.Schema);

var BaseTransactionSchema = new BaseSchema(); 

BaseTransactionSchema.methods.isWithinRange = function(endOfRange, startOfRange){
  var myDate = moment(this.date)
  return myDate.isBefore(endOfRange) && myDate.isAfter(startOfRange)
}

BaseTransactionSchema.methods.isInverse = function(hingeTransaction){
  var sourceAmount = typeof this.amount === 'number' ? this.amount : this.amount.amount; 
  var hingeTransactionAmount = typeof this.amount === 'number' ? this.amount : this.amount.amount; 
  // if at least one of these is not a plaid transaction, absolute value will suffice

  // both from Yodlee
  if (this.__t === 'YodleeTransaction' && hingeTransaction.__t === 'YodleeTransaction'){
    // amounts are the same and one is a credit and one is a debit 
    return (sourceAmount === hingeTransactionAmount) && (this.baseType !== hingeTransaction.baseType) && ["CREDIT", "DEBIT"].indexOf(this.baseType) > -1 && ["CREDIT", "DEBIT"].indexOf(hingeTransaction.baseType) > -1;   
  }

  // if one is from plaid and one from yodlee
  else if ( this.__t !== hingeTransaction.__t){
    var yodleeTransaction = this.__t === "YodleeTransaction" ? this : hingeTransaction; 
    var plaidTransaction = this.__t === "YodleeTransaction" ? hingeTransaction : this;  
    var inverse; 

    // postive number === outflow === spent 
    if (plaidTransaction.amount > 0 && yodleeTransaction.baseType === "CREDIT"){
      inverse = true; 
    }

    // negative number === inflow === made 
    else if (plaidTransaction.amount < 0 && yodleeTransaction.baseType === "DEBIT"){
      inverse = true; 
    }

    else inverse = false; 
    return Math.abs(sourceAmount) === Math.abs(hingeTransactionAmount) && inverse; 
  }

  // if both are plaid transactions, then check for inverse 
  else if (this.__t === 'PlaidTransaction' && hingeTransaction.__t === 'PlaidTransaction'){
    return this.amount.amount === (-1*hingeTransaction.amount.amount);
  }
}

BaseTransactionSchema.methods.isTransferCategoryPresent = function(){
  var categoryIds = ["21010010", "21010001", "21010004", "21010006", "21010009", "21010003", "21010005"];
  var internalAccountTransfer = "21001000";
  if (this.__t !== 'PlaidTransaction') return false;
  if (this.category_id === internalAccountTransfer) return true; 
  if (categoryIds.indexOf(this.category_id) > -1 ) {
    var keys = Object.keys(institutionIdToPlaidId)
    keys.forEach(function(k){
      if (institutionIdToPlaidId[k] === this.category_id){
        this.targetId = k; 
        return true; 
      }
    })  
  }
  // implement a way to see if there is a transfer coming: 
}

BaseTransactionSchema.methods.markAsMadeOrSpent = function(){
  if (this.__t === 'PlaidTransaction') {
    if (this.amount > 0) this.cashFlowType = "spent"; 
    else if (this.amount < 0) this.cashFlowType = "made"; 
  }
  else if (this.__t === "YodleeTransaction"){
    if (this.baseType === "CREDIT") this.cashFlowType = "made"; 
    else if (this.baseType === "DEBIT") this.cashFlowType = "spent";
    // don't think this will ever happen 
    else this.cashFlowType = "unknown";  
  }

  return this; 
}


BaseTransactionSchema.methods.isSpent = function(){
  return this.cashFlowType === "spent";
}

BaseTransactionSchema.methods.hasPotentialInverse = function(hash){
 return hash[this._id].length;
}

BaseTransactionSchema.methods.hasMoreThanOnePotentialInverse = function(hash){
 return hash[this._id].length > 1;
}

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

  var socialPaymentYodleeInstitutionId = {

  }

BaseTransactionSchema.methods.markAsFromFriendsOrMade = function(){
  if (this.__t === 'PlaidTransaction') {
    // TODO: need to make sure transactions are created with institution ids !
    // it is going INTO a venmo, paypal, coinbase, dwolla, or chase quickpay account
    var intoLinkedSocialPaymentAccount = socialPaymentPlaidInstitutionId[this.plaidInstitutionId]; 
    var fromNonLinkedSocialPaymentAccount = socialPaymentPlaidCategoryId[this.category_id]; 
    var isFromFriends = fromNonLinkedSocialPaymentAccount || fromLinkedSocialPaymentAccount; 
    if (isFromFriends) this.cashFlowType = "fromFriends"; 
    else this.cashFlowType = "made"
    return this; 
  }
  else if (this.__t === "YodleeTransaction"){
    // it is going INTO a venmo, paypal, coinbase, dwolla, or chase quickpay account
     var intoLinkedSocialPaymentAccount = socialPaymentYodleeInstitutionId[this.yodleeInstitutionId]; 
  }
  return this; 
}


BaseTransactionSchema.methods.isMarkedAsTransfer = function(){
  if (this.__t === 'PlaidTransaction') {
    return this.category.indexOf('Transfer') > -1; 
  }
  else if (this.__t === "YodleeTransaction"){
    return this.category === "Transfer"; 
  }
}


/*

Plaid Transaction: 

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
    score: { location: [Object], name: 0.2 } }

    


/// YODLEE 
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
  categoryId: String, 
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
})



/*

Yodlee Transaction:

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




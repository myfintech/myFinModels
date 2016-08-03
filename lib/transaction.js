
var mongoose = require('mongoose'); 
var transactionStatus = [ "MERGED","POSTED","PENDING", "SCHEDULED", "IN_PROGRESS", "FAILED", "CLEARED", "DISBURSED"];
var transactionBaseType = [ "CREDIT", "DEBIT", "OTHER", "UNKNOWN"];
var Schema = mongoose.Schema; 
var util = require('util');
var containerTypes = ['bank', 'creditCard', 'investment', 'insurance', 'loan', 'reward', 'bill']; 
var cashFlowTypes = ['made', 'spent', 'fromFriends', 'transfer', "unknown"];
var subTypes = ['savings', 'loanPayment', 'creditCardPayment', "inflowToChecking", "unknown", "outOfNetworkTransfer", "refund", "transferToVenmo", "withdrawal", "debitSideOfCreditCardPayment", "isTransferToWealthfront", "transferToFidelity", "transferFromFidelity", "paycheck", "transferFromVenmo", "isTransferFromRobinhood", "isTransferToAcorns", "investments", "interestPayment"]; 
var moment = require('moment');
require("moment-range"); 
var path = require("path");
var sourceTypes = ['yodlee', 'plaid'];

// create a 2d array
function createGrid(rows, columns) {
    var grid = new Array(rows);
    for(var i = 0; i < rows; i++) {
        grid[i] = new Array(columns);
        for(var j = 0; j < columns; j++) {
            grid[i][j] = 0;
        }
    }
    return grid;
}

String.prototype.intersection = function(anotherString) {
    var grid = createGrid(this.length, anotherString.length);
    var longestSoFar = 0;
    var matches = [];

    for(var i = 0; i < this.length; i++) {
        for(var j = 0; j < anotherString.length; j++) {
            if(this.charAt(i) == anotherString.charAt(j)) {
                if(i == 0 || j == 0) {
                    grid[i][j] = 1;
                }
                else {
                    grid[i][j] = grid[i-1][j-1] + 1;
                }
                if(grid[i][j] > longestSoFar) {
                    longestSoFar = grid[i][j];
                    matches = [];
                }
                if(grid[i][j] == longestSoFar) {
                    var match = this.substring(i - longestSoFar + 1, i + 1);
                    matches.push(match);
                }
            }
        }
    }
    return matches;
}

function BaseSchema(){
  mongoose.Schema.apply(this, arguments)

  this.add({
    dateCreated: {type: Date, default: Date.now}, 
    _original: Object,
    // not currently storing myFin account on transaction but each transaction 
    // has a plaid or yodlee account id that can be used to look up the myfin account doc  
    account: {type: Schema.Types.ObjectId, ref: 'BaseAccount'},
    institution: {type: Schema.Types.ObjectId, ref: 'BaseInstitution'},
    myFinAccountType: {type: String},
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    cashFlowType: { type: String, enum: cashFlowTypes}, 
    subType: { type: String, enum: subTypes}, 
    inverse: Object, 
    inverseToBeCreated: Object, 
    otherPossibleInverses: [{type: Schema.Types.ObjectId, ref: 'Transaction'}], 
    absAmount: {type: Number}, 
    baseType: {type: String, enum: transactionBaseType, required: true}, 
    date: String, 
    amount: {
      amount: Number, 
      currency: String
    }, 
    isRefundToCreditCard: Boolean,
    isRefund: Boolean,
    source: { type: String, enum: sourceTypes },
    isAnInverse: {type: Boolean} 
  })
}

util.inherits(BaseSchema, mongoose.Schema);

var BaseTransactionSchema = new BaseSchema(); 


var institutionIdToPlaidId = {
    '30671' :'21010001',              // venmo
    '25707' :'21010003',             // square
    '7298'  :'21010004',              // paypal
    '30342' :'21010005',             // dwolla
    '30666' :'21010006',             // coinbase
    '31575' :'21010009',             // digit
    '25261' :'21010010',              // betterment
    // "": "21010008"                   // acorns    
    // "":  "21010007"                  // chase quickpay 

  }

var categoryIds = ["21010001", "21010003", "21010005", "21010006", "21010009", "21010010"];


//////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////// EXISTENTIAL FUNCTIONS ////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////


BaseTransactionSchema.methods.isWithinRange = function(startOfRange, endOfRange){
  var dateOfCredit = moment(this.date);
  return ( dateOfCredit.isSame(startOfRange) || dateOfCredit.isAfter(startOfRange) ) && ( dateOfCredit.isBefore(endOfRange) || dateOfCredit.isSame(endOfRange) ); 
};

BaseTransactionSchema.methods.isDebit = function(){
  return this.baseType === "DEBIT"; 
};

BaseTransactionSchema.methods.isCredit = function(){
  return this.baseType === "CREDIT"; 
};

BaseTransactionSchema.methods.isCreditFromDifferentAccount = function(hingeTransaction){
  if (!this.isCredit()) return false; 
  return this.sourceAccountId !== hingeTransaction.sourceAccountId; 
};

BaseTransactionSchema.methods.isCreditFromSameAccount = function(hingeTransaction){
  if (!this.isCredit()) return false; 
  return this.sourceAccountId === hingeTransaction.sourceAccountId; 
};


BaseTransactionSchema.methods.isCreditToNonVenmoInstitution = function(){
  if (!this.isCredit()) return false;
  // if there is a sourceInstitution Id, use this  
  if (this.sourceInstitutionId) return this.sourceInstitutionId !== "30671"; 
  else return this.institution.toString() !== process.env.VENMO_ID;
};

BaseTransactionSchema.methods.isCreditToVenmo = function(){
  // is a credit to venmo 
  return this.isCredit() && (this.sourceInstitutionId === "30671" || this.institution.toString() === process.env.VENMO_ID);
};

BaseTransactionSchema.methods.isATMWithdrawal= function(){
  // specifically denotes ATM withdrawal
  return this.isDebit() && this.category_id === "21012002";
};

BaseTransactionSchema.methods.hasSameNameAsDebit = function(hingeTransaction){
  if (this.name === hingeTransaction.name) return true;
  var len = this.name.length > hingeTransaction.name.length ? this.name.length : hingeTransaction.name.length; 
  if (!this.name.intersection(hingeTransaction.name).length) return false; 
  return this.name.intersection(hingeTransaction.name)[0].length / len > 0.5;
};

BaseTransactionSchema.methods.isInternalAccountTransfer= function(){
  return this.category_id === "21001000"; 
};

BaseTransactionSchema.methods.isTransferFromBrokerageAccount = function(){
  return this.isCredit() && Array.isArray(this.name.match(/brokerage/i));  
};

BaseTransactionSchema.methods.isProbablyAPaycheck = function(){
  return this.isCredit() && this.category_id === "21009000"; 
};

BaseTransactionSchema.methods.isInverse = function(hingeTransaction){
  // hinge transaction is the first half of a transfer
  return this.absAmount === hingeTransaction.absAmount && hingeTransaction.isDebit() && this.isCredit(); 
};


BaseTransactionSchema.methods.isMarkedAsTransfer = function(){
  if (this.__t === 'PlaidTransaction') return this.category.indexOf('Transfer') > -1; 
  else return this.category === "Transfer"; 
};

BaseTransactionSchema.methods.isDebitThatTransfersMoneyToAcorns = function(){
  // must be a DEBIT that moves money into acorns!
  return this.isDebit() && this.category_id === "21010008";
};

BaseTransactionSchema.methods.isDebitSendingMoneyToVenmoWithoutInverseDoc = function(){
  // if this debit indicates the destination is VENMO, it does not have a reciprocal
  return this.isDebit() && this.category_id === "21010001";
};

BaseTransactionSchema.methods.isCreditToLinkedAccountThatIsTransferFromRobinhood = function(){
  if (!this.isCredit()) return false; 
  return /robinhood/i.test(this.name);
};

BaseTransactionSchema.methods.isDebitForKeepTheChange = function(){
  return this.isDebit() && ( /keep the change/i.test(this.name) || this.category_id === "21008000");
};

BaseTransactionSchema.methods.isCreditForKeepTheChangeLikeTheDebitOrNeitherAreKeepTheChange = function(hingeTransaction){
  if (!this.isCredit()) return false; 
  return (/keep the change/i.test(this.name) && /keep the change/i.test(hingeTransaction.name)) || (!/keep the change/i.test(this.name) && !/keep the change/i.test(hingeTransaction.name) ) || (this.category_id === "21008000" && hingeTransaction.category_id === "21008000") || (this.category_id !== "21008000" && hingeTransaction.category_id !== "21008000");
};



BaseTransactionSchema.methods.isCashOutFromVenmo = function(){
  // DEBITS with name "CASHED OUT" from Venmo that are not marked with 21010001 are TRANSFERS
  return this.isDebit() && /cashed out/i.test(this.name) &&  this.category_id !== "21010001" && (this.sourceInstitutionId === "30671" || this.institution.toString() === process.env.VENMO_ID);   
};


BaseTransactionSchema.methods.isDebitFromVenmoThatIsntCashedOut = function(){
  // if this debit is from VENMO and it's name is NOT cashed out, then it's probably spent
  return this.isDebit() && !/cashed out/i.test(this.name) && this.category_id !== "21010001" && (this.sourceInstitutionId === "30671" || this.institution.toString() === process.env.VENMO_ID);   
};

BaseTransactionSchema.methods.isACHTransfer = function(){
  return this._original.meta && this._original.meta.payment_method && this._original.meta.payment_method === "ACH" && this._original.type.primary !== "place";
};

BaseTransactionSchema.methods.isDebitSideOfCreditCardPayment = function(){
  return this.isDebit() && this.category_id === "16001000";
};


BaseTransactionSchema.methods.isSaveAsYouGoLikeTheDebitOrIsntSaveAsYouGoLikeTheDebit= function(hingeTransaction){
  // must be called on the CREDIT
  if (!this.isCredit()) return false;
  // if the credit doesnt have save as you go category id but the debit does, return false 
  if (this.category_id !== "21013000" && hingeTransaction.category_id === "21013000") return false; 
  // if the credit is save as you go but the debit isn't, return false 
  if (this.category_id === "21013000" && hingeTransaction.category_id !== "21013000") return false;
  // if neither has a category id, return true 
  if (!this.category_id && !hingeTransaction.category_id) return true;  
  // if neither has a category id that is save as you go, return true 
  if (this.category_id !== "21013000" && hingeTransaction.category_id !== "21013000") return true; 
  // if they both have the category id, return true 
  if (this.category_id === "21013000" && hingeTransaction.category_id === "21013000") return true; 
};


// // TO DO: remove!
// a credit to a credit card account is either 1) a user paying a credit card bill or 2) a business refunding an item 
BaseTransactionSchema.methods.isCreditToCreditCardAccount = function(user){
  if (!this.isCredit()) return false; 
  var accountType = user.sourceAccountIdToAccountMyFinTypeMap[this.yodleeAccountId || this.plaidAccountId];
  // there is no metadata that indicates whether a transaction is a refund / reimbursement 
  return accountType === 'creditCard' &&  ( this.category === "Credit Card Payments" || this.absAmount > 200); 
};



BaseTransactionSchema.methods.isTransferCategoryPresent = function(){
  if (this.__t !== 'PlaidTransaction') return false;
  if (categoryIds.indexOf(this.category_id) > -1){
    var keys = Object.keys(institutionIdToPlaidId);
    for (var i = 0, len = keys.length; i < len; i ++){
      if (institutionIdToPlaidId[keys[i]] === this.category_id){
        this.targetId = keys[i]; 
        // if the CREDIT has a category_id of 2101001, it's a transfer FROM venmo (indicates a debit from venmo)
        // if the DEBIT has a category_id of 2101001, it's a transfer INTO venmo, not FROM venmo (indicates credit into venmo)
        if (this.targetId === "30671") {
          this.subType = this.isCredit() ? "transferToVenmo" : "transferFromVenmo"; 
        }; 
        return true; 
      }
    }
  }
  return false; 
};

BaseTransactionSchema.methods.isCreditToStashAccount = function(user){
  if (!this.isCredit()) return false; 
  var accountType = user.sourceAccountIdToAccountMyFinTypeMap[this.yodleeAccountId || this.plaidAccountId];
  return accountType === 'stash'; 
};

BaseTransactionSchema.methods.isCreditToLoanAccount = function(user){
  if (!this.isCredit()) return false; 
  var accountType = user.sourceAccountIdToAccountMyFinTypeMap[this.yodleeAccountId || this.plaidAccountId];
  return accountType === 'loan'; 
};

BaseTransactionSchema.methods.isCreditToCheckingAccount= function(user){
  if (!this.isCredit()) return false; 
  var accountType = user.sourceAccountIdToAccountMyFinTypeMap[this.yodleeAccountId || this.plaidAccountId];
  return accountType === 'cash'; 
};

// a credit to a credit card account is either 1) a user paying a credit card bill or 2) a business refunding an item 
BaseTransactionSchema.methods.isCreditCardPayment = function(user){
  if (!this.isCredit()) return false; 
  var accountType = user.sourceAccountIdToAccountMyFinTypeMap[this.yodleeAccountId || this.plaidAccountId];
  // there is no metadata that indicates whether a transaction is a refund / reimbursement 
  // BUT 16001000 is a category id that indicates a credit card payment 
  // and 16000000 is a category id that indicates a generic payment 
  return accountType === 'creditCard' && ( this.category_id === "16001000" || this.category_id === "16000000"); 
};

BaseTransactionSchema.methods.isProbablyCreditCardPayment = function(user){
  if (!this.isCredit()) return false; 
  var accountType = user.sourceAccountIdToAccountMyFinTypeMap[this.yodleeAccountId || this.plaidAccountId];
  // theres a good chance that greater than 600 
  return accountType === 'creditCard' && this.absAmount > 800; 
};

BaseTransactionSchema.methods.hasPrimaryTypeThatIsPlace = function(){ 
  return this._original.type.primary === "place"; 
}

BaseTransactionSchema.methods.isProbablyARefund = function(user){
  if (!this.isCredit()) return false; 
  var accountType = user.sourceAccountIdToAccountMyFinTypeMap[this.yodleeAccountId || this.plaidAccountId];
  // theres a good chance that greater than 600 
  return accountType === 'creditCard' && this.absAmount > 800; 
};

BaseTransactionSchema.methods.isFeeRebate = function(){
  return this.isCredit() && this.category_id === "10002000";
};

BaseTransactionSchema.methods.isInterestEarned = function(){
  return this.isCredit() && this.category_id === "15001000";
};

// BaseTransactionSchema.methods.isProbablyAnInternalTransfer = function(user){
//   if (!this.isCredit()) return false; 
//   var accountType = user.sourceAccountIdToAccountMyFinTypeMap[this.yodleeAccountId || this.plaidAccountId];
//   // theres a good chance that greater than 600 
//   return accountType === 'creditCard' && this.absAmount > 800; 
// };


BaseTransactionSchema.methods.isTransferToWealthfront = function(){
  return this.isDebit() && /apex clearing ach/i.test(this.name); 
};

BaseTransactionSchema.methods.isCreditFromFidelityInvestments = function(){
  return this.isCredit() && /fid bkg svc llc moneyline/i.test(this.name); 
};

BaseTransactionSchema.methods.isRefundToCreditCardAccount = function(user){
  if (!this.isCredit()) return false; 
  var accountType = user.sourceAccountIdToAccountMyFinTypeMap[this.yodleeAccountId || this.plaidAccountId];
  // there is no metadata that indicates whether a transaction is a refund / reimbursement 
  // but we will assume that any CREDIT to a credit card that is not tagged with 16001000 (credit card payment category) and not tagged with 16000000 (generic payment) is a REFUND!
  return accountType === 'creditCard' && this.category_id !== "16001000" && this.category_id !== "16000000"; 
};


//////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////// CATEGORIZING FUNCTIONS ///////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////

BaseTransactionSchema.methods.markAsInverse = function(){
  this.isAnInverse = true; 
  return this; 
};

BaseTransactionSchema.methods.markAsMade = function(){
  this.cashFlowType = "made"; 
  this.isAnInverse = false; 
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

BaseTransactionSchema.methods.markSubtypeAsWithdrawal = function(){
  this.subType = "withdrawal"; 
  return this; 
};

BaseTransactionSchema.methods.markSubtypeAsTransferToWealthfront = function(){
  this.subType = "isTransferToWealthfront"; 
  return this; 
};

BaseTransactionSchema.methods.markSubtypeAsTransferFromRobinhood = function(){
  this.subType = "isTransferFromRobinhood"; 
  return this; 
};

BaseTransactionSchema.methods.markSubtypeAsTransferToAcorns = function(){
  this.subType = "isTransferToAcorns"; 
  return this; 
};

BaseTransactionSchema.methods.markSubtypeAsTransferFromBrokerageAccount = function(){
  this.subType = "investments"; 
  return this; 
};


BaseTransactionSchema.methods.markAsSpent = function(){
  this.cashFlowType = "spent";
  this.isAnInverse = false; 
  return this; 
};

BaseTransactionSchema.methods.markAsFromFriends = function(){
  this.cashFlowType = "fromFriends"; 
  this.isAnInverse = false; 
  return this; 
};

BaseTransactionSchema.methods.markAsDebitSideOfCreditCardPayment = function(){
  this.subType = "debitSideOfCreditCardPayment";
  return this; 
};


BaseTransactionSchema.methods.markSubtypeAsInflowToChecking= function(){
  this.subType = "inflowToChecking"; 
  return this; 
};

BaseTransactionSchema.methods.markSubtypeAsPaycheck = function(){
  this.subType = "paycheck"; 
  return this; 
};

BaseTransactionSchema.methods.markSubtypeAsInterestPayment = function(){
  this.subType = "interestPayment"; 
  return this; 
};


BaseTransactionSchema.methods.markSubtypeAsTransferFromFidelity= function(){
  this.subType = "transferFromFidelity"; 
  return this; 
};


BaseTransactionSchema.methods.markAsRefundToCreditCardAccount = function(user){
  this.isRefundToCreditCard = true;
  this.subType = "refund"; 
  return this; 
};


BaseTransactionSchema.methods.markAsRefund = function(user){
  this.isRefund = true;
  this.subType = "refund"; 
  return this; 
};

BaseTransactionSchema.methods.markAsTransfer = function(){
  this.cashFlowType = "transfer";
  return this; 
};

BaseTransactionSchema.methods.markSubtypeAsLoanPayment = function(user){
  this.subType = "loanPayment"; 
  return this; 
};

BaseTransactionSchema.methods.markSubtypeAsCreditCardPayment = function(){
  this.subType = 'creditCardPayment'; 
  this.isRefundToCreditCard = false; 
  return this; 
};

BaseTransactionSchema.methods.markSubtypeAsSavings = function(){
  this.subType = 'savings'; 
  return this; 
};

BaseTransactionSchema.methods.markSubtypeAsUnknown = function(){
  this.subType = 'unknown'; 
  return this; 
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
    this.inverseToBeCreated.amount = {
      amount: ( -1 * this.absAmount),
      currency: "USD" 
    }; 
    this.inverseToBeCreated.plaidInstitutionId = this.targetId;  
  }
  // if yodlee, amount of the inverse to be created will be an object with an amount property
  else {
    this.inverseToBeCreated.amount = {
      amount: this.amount.amount
    };
  }
  this.markModified('inverseToBeCreated');
  return this; 
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

// ['21010004', '21010005', '21010006', '21010007']

/*
to be fromFriends, the transaction must be a CREDIT
the category_id on the account must match one of the social payment plaid category ids 
-OR- it must be going into an account that belongs to a social payment institution

*/
BaseTransactionSchema.methods.markAsFromFriendsOrMade = function(){
  var intoLinkedSocialPaymentAccount = (this.institution.toString() === process.env.VENMO_ID) || (this.institution.toString() === process.env.PAYPAL_ID) || (this.sourceInstitutionId === "30671"); 
  // finds transactions with paypal or venmo category id
  var intoNonLinkedSocialPaymentAccount = socialPaymentPlaidCategoryId[this.category_id]; 
  var isFromFriends = intoNonLinkedSocialPaymentAccount || intoLinkedSocialPaymentAccount; 
  if (isFromFriends) this.cashFlowType = "fromFriends"; 
  else this.cashFlowType = "made";
  this.isAnInverse = false; 
  return this; 
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
  sourceInstitutionId: String,
  sourceAccountId: String, 
  sourceId: String, 

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
  this.absAmount = Math.abs(this.amount.amount); 
  if (this.amount.amount < 0) this.baseType = "CREDIT"; 
  else this.baseType = "DEBIT"; 
  return this; 
};




var YodleeTransactionSchema = new BaseSchema({ 
  yodleeId: { type: Number},
  yodleeAccountId: Number, 

  sourceId: Number, 
  sourceAccountId: Number, 

  // amount: {
  //   amount: Number, 
  //   currency: String
  // }, 
  containerType: { type: String, enum: containerTypes },
  category: String, 
  description: {
    original: String, 
    simple: String
  }, 
  isManual: Boolean, 
  postDate: String, 
  status: {type: String, enum: transactionStatus}, 
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


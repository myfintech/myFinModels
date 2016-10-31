
var mongoose = require('mongoose'); 
var transactionStatus = [ "MERGED","POSTED","PENDING", "SCHEDULED", "IN_PROGRESS", "FAILED", "CLEARED", "DISBURSED"];
var transactionBaseType = [ "CREDIT", "DEBIT", "OTHER", "UNKNOWN"];
var Schema = mongoose.Schema; 
var util = require('util');
var containerTypes = ['bank', 'creditCard', 'investment', 'insurance', 'loan', 'reward', 'bill']; 
var cashFlowTypes = ['made', 'spent', 'fromFriends', 'transfer', "unknown"];
var subTypes = ['savings', 'loanPayment', 'creditCardPayment', "inflowToChecking", "unknown", "outOfNetworkTransfer", "refund", "transferToVenmo", "withdrawal", "debitSideOfCreditCardPayment", "isTransferToWealthfront", "transferToFidelity", "transferFromFidelity", "paycheck", "transferFromVenmo", "isTransferFromRobinhood", "isTransferToAcorns", "investments", "interestPayment", "transferToPaypal"]; 
var moment = require('moment');
require("moment-range"); 
var path = require("path");
var sourceTypes = ['yodlee', 'plaid'];
var PlaidAccount = require("./plaidAccount");
var Promise = require("bluebird"); 

// // http://stackoverflow.com/questions/2250942/javascript-string-matching-pattern-help
// // create a 2d array
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
    date: {type: String}, 
    momentDate: {type: Date},
    _original: Object,
    // not currently storing myFin account on transaction but each transaction 
    // has a plaid or yodlee account id that can be used to look up the myfin account doc  
    account: {type: Schema.Types.ObjectId, ref: 'PlaidAccount'},
    institution: {type: Schema.Types.ObjectId, ref: 'Institution'},
    myFinAccountType: {type: String},
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    cashFlowType: { type: String, enum: cashFlowTypes}, 
    subType: { type: String }, 
    inverse: Object, 
    inverseToBeCreated: Object, 
    otherPossibleInverses: [{type: Schema.Types.ObjectId, ref: 'Transaction'}], 
    absAmount: {type: Number}, 
    baseType: {type: String, enum: transactionBaseType, required: true}, 
    institutionCounterpart: {type: Schema.Types.ObjectId, ref: 'Institution'},
    accountCounterpart: {type: String},
    possibleAccountCounterparts: {type: Array, default: []}, 
    amount: {
      amount: Number, 
      currency: String
    }, 
    isRefundToCreditCard: Boolean,
    isRefund: Boolean,
    source: { type: String, enum: sourceTypes },
    isAnInverse: {type: Boolean}, 
    pendingCounterpart: {type: Object}, 
    pendingDate: {type: Date},
    includeInCalculations: {type: Boolean, default: true}, 
    doNotCategorize: {type: Boolean, default: false}, 
    codeThree: {type: Boolean}
  })
}

util.inherits(BaseSchema, mongoose.Schema);

var BaseTransactionSchema = new BaseSchema(); 


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

BaseTransactionSchema.methods.isATMWithdrawal= function(){
  // specifically denotes ATM withdrawal
  // TODO: add regex for atm 
  return this.isDebit() && this.category_id === "21012002";
};

//wont capture partial refunds
BaseTransactionSchema.methods.hasSameNameAsDebit = function(hingeTransaction){
  if (this.name === hingeTransaction.name) return true;
  var len = this.name.length > hingeTransaction.name.length ? this.name.length : hingeTransaction.name.length; 
  if (!this.name.intersection(hingeTransaction.name).length) return false; 
  return this.name.intersection(hingeTransaction.name)[0].length / len > 0.5;
};

BaseTransactionSchema.methods.isProbablyAPaycheck = function(){
  return this.isCredit() && this.category_id === "21009000"; 
};

BaseTransactionSchema.methods.isCreditToNonVenmoInstitution = function(){
  if (!this.isCredit()) return false;
  // if there is a sourceInstitution Id, use this  
  if (this.sourceInstitutionId) return this.sourceInstitutionId !== "30671"; 
  else return this.institution.toString() !== "579765f01931d21100c0df73";
};

BaseTransactionSchema.methods.isCreditToVenmo = function(){
  // is a credit to venmo 
  return this.isCredit() && (this.sourceInstitutionId === "30671" || this.institution.toString() === "579765f01931d21100c0df73");
};

BaseTransactionSchema.methods.isDebitFromVenmoThatIsntCashedOut = function(){
  // if this debit is from VENMO and it's name is NOT cashed out, then it's probably spent
  return this.isDebit() && !/cashed out/i.test(this.name) && this.category_id !== "21010001" && (this.sourceInstitutionId === "30671" || this.institution.toString() === "579765f01931d21100c0df73");   
};

BaseTransactionSchema.methods.isDebitSendingMoneyToVenmoWithoutInverseDoc = function(){
  // if this debit indicates the destination is VENMO, it does not have a reciprocal
  return this.isDebit() && this.category_id === "21010001";
};

BaseTransactionSchema.methods.isDebitFromVenmoThatIsCashedOut = function(){
  // if this debit is from VENMO and it's name is NOT cashed out, then it's probably spent
  return this.isDebit() && /cashed out/i.test(this.name);   
};

BaseTransactionSchema.methods.isNotAssociatedWithVenmoUnlessCashedOut = function(hingeTransaction){
  if (this.category_id === "21010001" && /cashed out/i.test(hingeTransaction.name)) return true; 
  else return this.category_id !== "21010001"
};


BaseTransactionSchema.methods.isTransferCategoryPresent = function(){
  var categoryIds = ["21010001", "21010003", "21010004", "21010005", "21010006", "21010007", "21010008", "21010009", "21010010"];
  return categoryIds.indexOf(this.category_id) > -1;
};


BaseTransactionSchema.methods.addInstitutionCounterpartByCategoryId = function(){
  var plaidInstitutionIdToMyFinInstitutionIdMapForCategories = {
    "30671": "579765f01931d21100c0df73", // venmo
    "7298": "579765f01931d21100c0df79",  // paypal 
    "30342": "579765f01931d21100c0df77", // dwolla
    "30666": "57bcf5c067dd0a6a002d4a02", // coinbase
    "31575": "579afce9db68050300c59869", // digit
    "25261": "5798a3b84b7fed0300fd77bb"  // betterment
    // this map does not have acorns and chase quickpay because they do not exist as institutions in plaid's database / in plaid's connect service 
  };

  var institutionIdToPlaidId = {
    '30671' :'21010001',             // venmo
    '25707' :'21010003',             // square
    '7298'  :'21010004',             // paypal
    '30342' :'21010005',             // dwolla
    '30666' :'21010006',             // coinbase
    '31575' :'21010009',             // digit
    '25261' :'21010010',             // betterment
    "acorns": "21010008",            // acorns    
    "chase quickpay": "21010007"     // chase quickpay 
  };

  var keys = Object.keys(institutionIdToPlaidId);
  for (var i = 0, len = keys.length; i < len; i++){
    if (institutionIdToPlaidId[keys[i]] === this.category_id){
      this.targetId = keys[i]; 
      // some of these like acorns and chase quickpay will not have an institutionCounterpart, so add it only if it exists  
      if (typeof plaidInstitutionIdToMyFinInstitutionIdMapForCategories[this.targetId] !== "undefined") this.institutionCounterpart = plaidInstitutionIdToMyFinInstitutionIdMapForCategories[this.targetId]; 
    }
  }
  return this; 
}

BaseTransactionSchema.methods.addInstitutionCounterpartByKnownInstitutions = function(){
  // do not need to add betterment since as of 9/3/16, all 166 transactions with "Betterment" in the name also had category_id = 21010010
  var plaidIdToKnownInstitutionsMap = {
    "9913": "5798a4874b7fed0300fd77ce", // Fidelity, 
    "25311": "5798a3f54b7fed0300fd77c5" // Wealthfront
  }
  // required for robinhood 
  if (typeof plaidIdToKnownInstitutionsMap[this.targetId] !== "undefined") this.institutionCounterpart = plaidIdToKnownInstitutionsMap[this.targetId]; 
  return this; 
}


BaseTransactionSchema.methods.isInstitutionCounterpartLinked = function(user){
  return user.sourceInstitutions.indexOf(this.targetId) > -1; 
}

BaseTransactionSchema.methods.isAfterAccountBirthdate = function(user){
  var account = this.accountCounterpart || this.possibleAccountCounterparts[0];
  var accountBirthdate = user.sourceAccountIdToBirthdateMap[account];
  return moment(this.date).isAfter(moment(accountBirthdate)) || moment(this.date).isSame(moment(accountBirthdate)) ;  
}

BaseTransactionSchema.methods.matchesKnownInstitutions = function(user){
  // these are institutions that are not covered by plaid's category_ids but are known to us via regex's 
 if (this.isMovingMoneyToOrFromFidelity()) this.targetId = "9913"; 
 if (this.isMovingMoneyToOrFromWealthfront()) this.targetId = "25311"; 
 if (this.isMovingMoneyToOrFromRobinhood()) this.targetId = "robinhood"; 
 return typeof this.targetId !== "undefined"; 
}

BaseTransactionSchema.methods.inverseDocBelongsToInstitutionWithoutTransactions = function(user){
  //                                        morgan s, sallie mae, fidelity,vanguard,fedloan,wealthf,betterm, lending          gsmr     ascensus studentloans    ameritrade  schwab
  var institutionsThatNeverGetTransactions = ["31248", "31246","30549", "30195", "25686", "25311", "25261", "24307", "15130", "14551", "13404", "13030",  "11814", "9933", "9911", "8041", "8005", "7365", "5640", "5636", "4222", "3152", "3078", "3029", "2916", "2012", "1461", "1460", "1456", "12"]; 
  // if it is linked and the institution does not have transactions
  if (user.sourceInstitutionIdToGetsTransactionsMap[this.targetId] === false) return true; 
  // transfers into digit are always transfers
  if (this.isDebit() && ( this.targetId === "31575" || this.category_id === "21010009") ) return true; 
  // if it is in the list of insts that never get transactions
  if (institutionsThatNeverGetTransactions.indexOf(this.targetId) > -1) return true; 
  // these are institutions that are known to us by plaid's category_ids (acorns, chase quickpay) or by regex's (robinhood) but do not exist in the plaid database 
  if (["robinhood", "acorns", "chase quickpay"].indexOf(this.targetId) > -1 ) return true; 
  else return false 
}

BaseTransactionSchema.methods.isMovingMoneyIntoInstitutionThatGetsIncompleteCreditTransactions = function(){
    /*
      the problem with venmo and paypal is that when you move money into them, you have a debit from your checking account 
      that has a category_id == "30671" || "7298" but you don't have a CREDIT transaction to complete the transfer 
      so this needs to catch DEBITS that indicate paypal and venmo
    */
    // should catch cash out transactions from venmo which dont have category_ids.     
    var idsOfIntsWithIncompleteTransactions = ["30671", "7298"];                                       
  return (idsOfIntsWithIncompleteTransactions.indexOf(this.targetId) > -1 || idsOfIntsWithIncompleteTransactions.indexOf(this.sourceInstitutionId) > -1); 
}

BaseTransactionSchema.methods.isMovingMoneyToOrFromFidelity = function(){
  return /fid bkg svc llc moneyline/i.test(this.name);
}

BaseTransactionSchema.methods.isMovingMoneyToOrFromWealthfront = function(){
  return ( /apex clearing ach/i.test(this.name) || /apex clearing/i.test(this.name) ); 
};

BaseTransactionSchema.methods.isMovingMoneyToOrFromRobinhood = function(){
  return ( /robinhood/i.test(this.name) || /apex clearing/i.test(this.name) ); 
}

BaseTransactionSchema.methods.addAccountCounterpart = function(user){
  var accountIds = Object.keys(user.sourceAccountIdToMyFinInstitutionIdMap); 
  var possibleAccountCounterparts = []; 
  for (var i = 0, len = accountIds.length; i < len; i++){
    if (String(user.sourceAccountIdToMyFinInstitutionIdMap[accountIds[i]]) === String(this.institutionCounterpart)){
      possibleAccountCounterparts.push(accountIds[i]);
    }
  }
  // will either have a length of 1
  if (possibleAccountCounterparts.length === 1){
    this.accountCounterpart = possibleAccountCounterparts[0]; 
  }
  // or a length greater than 1 
  else {
    this.possibleAccountCounterparts = possibleAccountCounterparts; 
    this.markModified("possibleAccountCounterparts"); 
  }
  return this; 
}


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


BaseTransactionSchema.methods.isFeeRebate = function(){
  return this.isCredit() && this.category_id === "10002000";
};

BaseTransactionSchema.methods.isNotDeposit = function(){
  if (!this.isCredit()) return false; 
  return this.category_id !== "21007002";
};

BaseTransactionSchema.methods.isInterestEarned = function(){
  return this.isCredit() && this.category_id === "15001000";
};

BaseTransactionSchema.methods.isRefundToCreditCardAccount = function(user){
  if (!this.isCredit()) return false; 
  var accountType = user.sourceAccountIdToAccountMyFinTypeMap[this.yodleeAccountId || this.plaidAccountId];
  // there is no metadata that indicates whether a transaction is a refund / reimbursement 
  // but we will assume that any CREDIT to a credit card that is not tagged with 16001000 (credit card payment category) and not tagged with 16000000 (generic payment) is a REFUND!
  return accountType === 'creditCard' && this.category_id !== "16001000" && this.category_id !== "16000000"; 
};

BaseTransactionSchema.methods.isCreditForKeepTheChangeLikeTheDebitOrNeitherAreKeepTheChange = function(hingeTransaction){
  if (!this.isCredit()) return false; 
  return (this.category_id === "21008000" && hingeTransaction.category_id === "21008000") || (this.category_id !== "21008000" && hingeTransaction.category_id !== "21008000");
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

BaseTransactionSchema.methods.isNotQuickPay = function(){
  return this.category_id !== "21010007"; 
};

BaseTransactionSchema.methods.isQuickPay = function(){
  return this.category_id === "21010007"; 
};


BaseTransactionSchema.methods.isInternalAccountTransfer= function(){
  return this.category_id === "21001000"; 
};


BaseTransactionSchema.methods.isTransferFromOrToBrokerageAccount = function(){
  var investmentTransactionNames = ["brokerage", "NORTHWESTERN MU ISA PAYMNT", "E*TRADE ACH TRNSFR", "BLACKSTONE CAP CALL", "FUNDRISE", "ACH Electronic Debit - VGI-STAR INVESTMENT 5688091311584", "ACH Electronic Debit VGI-500 IX ADM INVESTMENT", "ACH Electronic Debit 1048 INTL STOCK INVESTMENT", "ACH Electronic Debit 145 STOCK INVESTMENT", "Ach Electronic Debit Withdrawal 145 Stock", "Ach Electronic Debit Withdrawal 1048 Intl Sto", "Other Decrease Vgi 500 Ix Adm Investment", "Other Decrease Fid Bkg Svc Llc Moneyline"]; 
  for (var i = 0, len = investmentTransactionNames.length; i < len; i++){
    var reg = new RegExp(investmentTransactionNames[i], "i");
    if (reg.test(this.name)) return true;
  }
  return false;
};

BaseTransactionSchema.methods.isFromFriends = function(){
  if (!this.isCredit()) return false; 

  var socialPaymentPlaidCategoryId = {
    '21010001': '30671',               // venmo
    '21010004': '7298',               // paypal
    '21010006': '30666',              // coinbase
    '21010005': '30342',              // dwolla
    '21010007': 'chase quickpay',    // chase quickpay
  };

  var intoLinkedSocialPaymentAccount = (this.institution.toString() === "579765f01931d21100c0df73") || (this.institution.toString() === "579765f01931d21100c0df79") || (this.sourceInstitutionId === "30671") || (this.sourceInstitutionId === "7298") || (/quickpay/i.test(this.name)); 
  // finds transactions with paypal or venmo category id
  var matchesCategoryIds = socialPaymentPlaidCategoryId[this.category_id]; 
  var isFromFriends = intoLinkedSocialPaymentAccount || matchesCategoryIds; 
  if (isFromFriends) return true;
  else return false; 
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

BaseTransactionSchema.methods.markSubtypeAsWithdrawal = function(){
  this.subType = "withdrawal"; 
  return this; 
};

BaseTransactionSchema.methods.markSubtypeAsInvestments = function(){
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
  this.isRefund = false; 
  this.subType = null; 
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


/*
to be fromFriends, the transaction must be a CREDIT
the category_id on the account must match one of the social payment plaid category ids 
-OR- it must be going into an account that belongs to a social payment institution

*/
BaseTransactionSchema.methods.markAsFromFriendsOrMade = function(){
  var socialPaymentPlaidCategoryId = {
    '21010001': '30671',               // venmo
    '21010004': '7298',               // paypal
    '21010006': '30666',              // coinbase
    '21010005': '30342',              // dwolla
    '21010007': 'chase quickpay',    // chase quickpay
  };

  var intoLinkedSocialPaymentAccount = (this.institution.toString() === "579765f01931d21100c0df73") || (this.institution.toString() === "579765f01931d21100c0df79") || (this.sourceInstitutionId === "30671") || (this.sourceInstitutionId === "7298"); 
  // finds transactions with paypal or venmo category id
  var intoNonLinkedSocialPaymentAccount = socialPaymentPlaidCategoryId[this.category_id]; 
  var isFromFriends = intoNonLinkedSocialPaymentAccount || intoLinkedSocialPaymentAccount; 
  if (isFromFriends) this.cashFlowType = "fromFriends"; 
  else this.cashFlowType = "made";
  this.isRefund = false; 
  this.subType = null; 
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



PlaidTransactionSchema.statics.findWithAccountAndInstitutionAndUser = function(query){
  function forEachTransaction(t){
    return PlaidAccount.findOne({plaidId: t.plaidAccountId})
    .then(function(account){
      t = t.toObject(); 
      account = account.toObject(); 
      t.account = account; 
      return t; 
    })
  }

  // // some transaction query 
  return this.find(query).populate("institution", "name").populate("user")
  .then(function(transactions){
    return Promise.map(transactions, forEachTransaction); 
  });
};

var myFinInstitutionIdToGetsTransactionsMap = {
"579765f01931d21100c0df73":true,
"57977ac4da35cc03006434b6":true,
"5798252f4b7fed0300fd76b8":true,
"5798a3b84b7fed0300fd77bb":false,  // betterment
"5798a4874b7fed0300fd77ce":true,
"5798a3f54b7fed0300fd77c5":false,
"57976953b3946b0300f5905c":true,
"5798e1c74b7fed0300fd78f9":true,
"57993021e7be710300134efd":true,
"579915c1e7be710300134d1d":true,
"57997d0d094c77030048cc4d":true,
"579afce9db68050300c59869":true,
"5798e1424b7fed0300fd78f8":true,
"579765f01931d21100c0df79":true,
"579cf0a906513f03008495e8":true,
"579927e9e7be710300134de0":true,
"57a0a3d8f294ab0a006e57d3":false,
"57997d62094c77030048ccb9":true,
"57a223460706ff0a004f6469":false,
"57a231d7de4e740f007ae951":false,
"57a2597c07d1000f00a811db":true,
"579a5ed4094c77030048e35e":true,
"57a25bd27c336f0a00c5ece9":true,
"57a4ed8a26770c0f0017727e":true,
"57a78ee5b42eba27d29af492":true,
"579771cbda35cc0300643258":true,
"57a91c723c0b2a0a003b676a":false,
"5799800f094c77030048ce60":false,
"57ab507877b6b30a003fd796":true,
"57acce9ad9367b0a00ef3ff5":false,
"57a28927913e480a0034af0b":true,
"57ad47f5b111030a00298ee3":true,
"57b2619ec705b20f00f39fe7":false,
"57b262e9b6e8150a00fc66d3":true,
"57aca212f3c7e30a0065ad5e":false,
"57b26011ee425d0f0036c312":true,
"57b36071ab3a7c0b008278ef":true,
"57b3667e961c8f0f006b13fe":false,
"57b371bd961c8f0f006b1402":false,
"57b27f009cb9620a00106932":false,
"57b3897bd427380a00f77322":true,
"57b5170218cb900f00d3a336":false,
"57b51a7ea9aa0f74006f2d9f":false,
"57b36f50fae3b00a0040e8d6":false,
"57b71bf64cf7db3d00465076":false,
"57b778feeba2464200d6d887":false,
"57bb762bb3f19a10008c58ac":true,
"57bd74d2a1e94629005af69e":true,
"57bdc43fb33327510006fedb":true,
"57bdea2e281fd23300ea8004":true,
"57a91b6571f2810a001c24fe":false,
"57be183d8dd34e6000d4b437":true,
"57be48b11ebb601f00e3aec3":true,
"57bee7d0966b2e7e0041218e":false,
"57beec7c271e0d7400072d86":false,
"57a8bdaa1f33420a00783b9c":false,
"57bf21b878cfd03d006b1473":true,
"57bf3ac8f73c25740097e89d":false,
"57bfb797b0238488008a6653":false,
"57c2059c25205779003620f0":true,
"57c35ea72278052900311adb":true,
"57bcf2e25293ec74000bd920":false,
"57a2adcf913e480a0034b253":true,
"57c5a2617045486f00195276":false,
"57b51687227cd83300213e45":false,
"57c6c153f57cd54200cf4489":false,
"57c7170fbddce97400ac363f":true,
"57b2641240e1b90a0093f535":true,
"57cadfd04790c26a003d830b":false,
"57cb24edaae9e36a00ce22fb":false
}

var plaidInstitutionIdToGetsTransactionsMap = {
"10":true,
"12":false, // e* trade
"1407":true,
"1450":true,
"1456":false, // citibank mortgage 
"1460":false, // vanguard group brokerage 
"1461":false, // t.rowe price retirement plan services 
"1487":true,
"2012":false, //american century investments 
"2525":true,
"2721":true,
"2812":true,
"2851":true,
"2866":true,
"2916":false, // wells fargo advisors
"3029":false, //scottrade
"3078":false, //vanguard 401K
"3152":false, //tiaa-cref retirement
"3582":true,
"4222":false, // principal financial retirement
"4257":true,
"4970":true,
"4986":true,
"5636":false, //american funds
"5640":false, // nelnet student loan
"6919":true,
"7298":true,
"7365":false, // adp retirement
"8005":false, // american stock transfer and trust 
"8041":false, // goldman sachs private wealth management
"8076":true,
"9911":false, //charles schwab
"9913":true,
"9933":false, // td ameritrade
"10780":true,
"11814":false, // great lakes
"11947":true,
"12549":true,
"13030":false, //nationals student loans
"13312":true,
"13404":false, //ascensus rplink
"13632":true,
"13796":true,
"13840":true,
"14551":false, //gsmr
"15050":true,
"15130":false, // mckreedy, one america
"15671":true,
"20773":true,
"24307":false, //lending club
"24325":true,
"24886":true,
"25261":false, // betterment
"25311":false, // wealthfront
"25686":false, // fedloan servicing 
"26115":true,
"30195":false, // vanguard personal investors 
"30549":false, // netbenefits worldwide - fidelity 
"30671":true,
"31246":false,// sallie mae
"31248":false, // morgan stanley
"31575":true,
"chase":true,
"citi":true,
"bofa":true,
"amex":true,
"wells":true,
"td":true,
"us":true,
"usaa":true
}



BaseTransactionSchema.set("collection", "transactions")
PlaidTransactionSchema.set("collection", "transactions")

// multi field index 
BaseTransactionSchema.index({"__t": 1, "institution": 1, "user": 1, "dateCreated": 1})

var BaseTransactionModel = mongoose.model("Transaction", BaseTransactionSchema); 
var PlaidTransactionModel =  BaseTransactionModel.discriminator("PlaidTransaction", PlaidTransactionSchema); 

module.exports = {
  BaseTransaction: BaseTransactionModel, 
  PlaidTransaction: PlaidTransactionModel, 
}




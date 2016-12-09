'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var BalanceSchema = new Schema({
  dateCreated: {type: Date, default: Date.now}, 
  __t: String, 
  user: {type: Schema.Types.ObjectId, ref: 'User'},
  account : {type: Schema.Types.ObjectId, ref: 'PlaidAccount'},
  institution: {type: Schema.Types.ObjectId, ref: 'Institution'},
  includeInCalculations: {type: Boolean, default: true},
  userDeleted: {type: Boolean, default: false},
  manufactured: {type: Boolean, default: false},
  endOfDay: {type: Boolean},


  // // yodlee specific
  // yodleeAccountId: {type: Number},
  // yodleeDate: {type: Date},
  // yodleeProviderId: {type: Number},
  plaidInstitutionId: {type: String}, 


  // // abstract 
  sourceInstitutionId: {type: String}, 
  sourceAccountId: {type: String}, 
  sourceInstitutionName: {type: String},
  sourceDate: {type: Date},

  // // bank 
  // availableBalance: { 
  //   amount: {type: Number}, 
  //   currency: {type: String}
  // },
  // currentBalance: { 
  //   amount: {type: Number}, 
  //   currency: {type: String}
  // },
  balance: {
    available: {type: Number},
    current: {type: Number} 
  },
  displayNumber: {type: Number},
  // // // creditCard
  // availableCash: { 
  //   amount: {type: Number}, 
  //   currency: {type: String}
  // },
  // availableCredit: { 
  //   amount: {type: Number}, 
  //   currency: {type: String}
  // },
  // totalCashLimit: { 
  //   amount: {type: Number}, 
  //   currency: {type: String}
  // },
  // totalCreditLine: { 
  //   amount: {type: Number}, 
  //   currency: {type: String}
  // },

  // // // investment 
  // cash: { 
  //   amount: {type: Number}, 
  //   currency: {type: String}
  // }, 
  // marginBalance: { 
  //   amount: {type: Number}, 
  //   currency: {type: String}
  // }, 

  // /// // insurance types 
  // amountDue: { 
  //   amount: {type: Number}, 
  //   currency: {type: String}
  // }, 
  // dueDate: {type: Date},
  // minimumAmountDue: {
  //   amount: {type: Number}, 
  //   currency: {type: String}
  // },
  // cashValue: {
  //   amount: {type: Number}, 
  //   currency: {type: String}
  // },

  // // loans
  // originalLoanAmount: { 
  //   amount: {type: Number}, 
  //   currency: {type: String}
  // }, 

  plaidBalance: {
    available: {type: Number},
    current: {type: Number}
  }
  // // bill : cant have duplicate keys in strict mode
  // amountDue: { 
  //   amount: {type: Number}, 
  //   currency: {type: String}
  // }, 
  // dueDate: {type: Date},
  // minimumAmountDue: {
  //   amount: {type: Number}, 
  //   currency: {type: String}
  // } 
});

BalanceSchema.statics = {
  
  createBalanceFromCreditCardAccount: function(user, account){
    return this.create({
      account: account._id, 
      user: user._id, 
      institution: account.institution,  
      yodleeProviderId: account.yodleeProviderId,
      yodleeAccountId: account.yodleeId, 
      yodleeDate: account.lastUpdated, 
      // // abstract: 
      sourceInstitutionId: account.sourceInstitutionId, 
      sourceAccountId: account.sourceId, 
      sourceDate: account.lastUpdated,
      sourceInstitutionName: account.sourceInstitutionName,

      availableCash: account.availableCash, 
      availableCredit: account.availableCredit, 
      totalCashLimit: account.totalCashLimit, 
      totalCreditLine: account.totalCreditLine,
      balance: account.balance, 
      __t: "YodleeBalance" 
    })
  }, 

  createBalanceFromBankAccount: function(user, account){
    return this.create({
      account: account._id, 
      user: user._id, 
      institution: account.institution,  
      yodleeProviderId: account.yodleeProviderId,
      yodleeDate: account.lastUpdated, 
      yodleeAccountId: account.yodleeId, 

      // // abstract: 
      sourceInstitutionId: account.sourceInstitutionId, 
      sourceAccountId: account.sourceId, 
      sourceDate: account.lastUpdated,
      sourceInstitutionName: account.sourceInstitutionName,

      availableBalance: account.availableBalance,
      currentBalance: account.currentBalance, 
      balance: account.balance, 
      __t: "YodleeBalance" 
    })
  }, 

  createBalanceFromInvestmentAccount: function(user, account){
    return this.create({
      account: account._id, 
      user: user._id, 
      institution: account.institution,  
      yodleeProviderId: account.yodleeProviderId,
      yodleeDate: account.lastUpdated, 
      yodleeAccountId: account.yodleeId, 
      
      // // abstract: 
      sourceInstitutionId: account.sourceInstitutionId, 
      sourceAccountId: account.sourceId, 
      sourceDate: account.lastUpdated,
      sourceInstitutionName: account.sourceInstitutionName,

      cash: account.cash,
      currentBalance: account.currentBalance, 
      balance: account.balance, 
      __t: "YodleeBalance" 

    })
  }, 

  createBalanceFromInsuranceAccount: function(user, account){
    return this.create({
      account: account._id, 
      user: user._id, 
      institution: account.institution,  
      yodleeProviderId: account.yodleeProviderId,
      yodleeDate: account.lastUpdated, 
      yodleeAccountId: account.yodleeId, 

      // // abstract: 
      sourceInstitutionId: account.sourceInstitutionId, 
      sourceAccountId: account.sourceId, 
      sourceDate: account.lastUpdated,
      sourceInstitutionName: account.sourceInstitutionName,


      amountDue: account.amountDue,
      dueDate: account.dueDate, 
      minimumAmountDue: account.minimumAmountDue,  
      cashValue: account.cashValue, 
      balance: account.balance, 
      __t: "YodleeBalance" 
    })
  }, 

  createBalanceFromBillAccount: function(user, account){
    return this.create({
      account: account._id, 
      user: user._id, 
      institution: account.institution,  
      yodleeProviderId: account.yodleeProviderId,
      yodleeDate: account.lastUpdated, 
      yodleeAccountId: account.yodleeId, 

      // // abstract: 
      sourceInstitutionId: account.sourceInstitutionId, 
      sourceAccountId: account.sourceId, 
      sourceDate: account.lastUpdated,
      sourceInstitutionName: account.sourceInstitutionName,


      amountDue: account.amountDue,
      dueDate: account.dueDate, 
      minimumAmountDue: account.minimumAmountDue,  
      balance: account.balance,
      __t: "YodleeBalance" 
    })
  }, 

  createBalanceFromRewardAccount: function(user, account){
    return this.create({
      account: account._id, 
      user: user._id, 
      institution: account.institution,  
      yodleeDate: account.lastUpdated, 
      yodleeProviderId: account.yodleeProviderId,
      yodleeAccountId: account.yodleeId, 
      
      // // abstract: 
      sourceInstitutionId: account.sourceInstitutionId, 
      sourceAccountId: account.sourceId, 
      sourceDate: account.lastUpdated,
      sourceInstitutionName: account.sourceInstitutionName,

      balance: account.balance, 
      __t: "YodleeBalance" 
    })
  },

  createBalanceFromLoanAccount: function(user, account){
    return this.create({
      account: account._id, 
      user: user._id, 
      institution: account.institution,  
      yodleeDate: account.lastUpdated, 
      yodleeProviderId: account.yodleeProviderId,
      yodleeAccountId: account.yodleeId, 

      // // abstract: 
      sourceInstitutionId: account.sourceInstitutionId, 
      sourceAccountId: account.sourceId, 
      sourceDate: account.lastUpdated,
      sourceInstitutionName: account.sourceInstitutionName,


      balance: account.balance, 
      originalLoanAmount: account.originalLoanAmount, 
      __t: "YodleeBalance" 
    })
  }, 

  createBalanceFromPlaid: function(user, account, bool){
    function fixDisplayNumber(account){
      if (account.myFinType === "creditCard" || account.myFinType === "unknown") {
        if (typeof account.balance.current === "number") return account.balance.current; 
        else return account.balance.available; 
      }
      if (account.myFinType === "cash" || account.myFinType === "stash"){
        return typeof account.balance.available === "number" ? account.balance.available : account.balance.current; 
      }
      if (account.myFinType === "investment" || account.myFinType === "loan"){
        return typeof account.balance.current === "number" ? account.balance.current : account.balance.available; 
      }
    }

    var displayNumber = fixDisplayNumber(account); 
    

    return this.create({
      account: account._id, 
      user: user._id, 
      institution: account.institution, 
      plaidInstitutionId: account.plaidInstitutionId, 
      plaidBalance: account.balance, 
      // // abstract
      sourceInstitutionId: account.sourceInstitutionId,
      sourceAccountId: account.sourceId,
      sourceInstitutionName: account.sourceInstitutionName,
      balance: account.balance,
      displayNumber: displayNumber,
      endOfDay: bool ? true : false,
      __t: "PlaidBalance" 
    })
  }  
}

BalanceSchema.index({"user": 1, "sourceAccountId": 1})


module.exports = mongoose.model('Balance', BalanceSchema);



'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var BalanceSchema = new Schema({
  dateCreated: {type: Date, default: Date.now}, 
  __t: String, 
  user: {type: Schema.Types.ObjectId, ref: 'User'},
  account : {type: Schema.Types.ObjectId, ref: 'Account'},
  institution: {type: Schema.Types.ObjectId, ref: 'Institution'},
  

  // // yodlee specific
  yodleeAccountId: {type: Number},
  yodleeDate: {type: Date},
  yodleeProviderId: {type: Number},


  // // abstract
  sourceInstitutionId: {type: String}, 
  sourceAccountId: {type: String}, 
  sourceInstitutionName: {type: String},
  sourceDate: {type: Date},

  dateCreated: { type: Date, default: Date.now },
  // // bank 
  availableBalance: { 
    amount: {type: Number}, 
    currency: {type: String}
  },
  currentBalance: { 
    amount: {type: Number}, 
    currency: {type: String}
  },
  balance: {
    amount: {type: Number},
    currency: {type: String} 
  },

  // // creditCard
  availableCash: { 
    amount: {type: Number}, 
    currency: {type: String}
  },
  availableCredit: { 
    amount: {type: Number}, 
    currency: {type: String}
  },
  totalCashLimit: { 
    amount: {type: Number}, 
    currency: {type: String}
  },
  totalCreditLine: { 
    amount: {type: Number}, 
    currency: {type: String}
  },

  // // investment 
  cash: { 
    amount: {type: Number}, 
    currency: {type: String}
  }, 
  marginBalance: { 
    amount: {type: Number}, 
    currency: {type: String}
  }, 

  /// // insurance types 
  amountDue: { 
    amount: {type: Number}, 
    currency: {type: String}
  }, 
  dueDate: {type: Date},
  minimumAmountDue: {
    amount: {type: Number}, 
    currency: {type: String}
  },
  cashValue: {
    amount: {type: Number}, 
    currency: {type: String}
  },

  // loans
  originalLoanAmount: { 
    amount: {type: Number}, 
    currency: {type: String}
  }, 

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

  createBalanceFromPlaid: function(user, account, date){
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

      balance: {
        amount: account.balance.current, 
        currency: "USD"
      },
      dateCreated: date, 
      __t: "PlaidBalance" 
    })
  }  
}


module.exports = mongoose.model('Balance', BalanceSchema);



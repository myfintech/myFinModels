'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var BalanceSchema = new Schema({
  user: {type: Schema.Types.ObjectId, ref: 'User'},
  account : {type: Schema.Types.ObjectId, ref: 'Account'},
  institution: {type: Schema.Types.ObjectId, ref: 'Institution'},
  yodleeAccountId: {type: Number},
  dateCreated: { type: Date, default: Date.now },
  yodleeDate: {type: Date},
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
      yodleeDate: account.lastUpdated, 
      yodleeAccountId: account.yodleeId, 
      availableCash: account.availableCash, 
      availableCredit: account.availableCredit, 
      totalCashLimit: account.totalCashLimit, 
      totalCreditLine: account.totalCreditLine,
      balance: account.balance
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
      availableBalance: account.availableBalance,
      currentBalance: account.currentBalance, 
      balance: account.balance 
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
      cash: account.cash,
      currentBalance: account.currentBalance, 
      balance: account.balance
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
      amountDue: account.amountDue,
      dueDate: account.dueDate, 
      minimumAmountDue: account.minimumAmountDue,  
      cashValue: account.cashValue, 
      balance: account.balance
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
      amountDue: account.amountDue,
      dueDate: account.dueDate, 
      minimumAmountDue: account.minimumAmountDue,  
      balance: account.balance
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
      balance: account.balance
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
      balance: account.balance, 
      originalLoanAmount: account.originalLoanAmount
    })
  }, 

  createBalanceFromPlaid: function(user, account){
    return this.create({
      account: account._id, 
      user: user._id, 
      institution: account.institution, 
      plaidInstitutionId: account.plaidInstitutionId, 
      plaidBalance: account.balance 
    })
  }  
}


module.exports = mongoose.model('Balance', BalanceSchema);



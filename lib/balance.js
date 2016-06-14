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
  
  createBalanceFromCreditCardAccount: function(user, account, refreshedAccount){
    // if the refreshed account does not exist, then we are creating the first balance doc for this account
    return this.create({
      account: account._id, 
      user: user._id, 
      institution: account.institution,  
      yodleeProviderId: refreshedAccount ? refreshedAccount.providerId : account.yodleeProviderId,
      yodleeDate: refreshedAccount ? refreshedAccount.lastUpdated : account.lastUpdated, 
      yodleeAccountId: refreshedAccount ? refreshedAccount.id : account.yodleeId, 
      availableCash: refreshedAccount ? refreshedAccount.availableCash : account.availableCash, 
      availableCredit: refreshedAccount ? refreshedAccount.availableCredit : account.availableCredit, 
      totalCashLimit: refreshedAccount ?  refreshedAccount.totalCashLimit : account.totalCashLimit, 
      totalCreditLine: refreshedAccount ? refreshedAccount.totalCreditLine : account.totalCreditLine,
      balance: refreshedAccount ? refreshedAccount.balance : account.balance
    })
  }, 

  createBalanceFromBankAccount: function(user, account, refreshedAccount){
    // if the refreshed account does not exist, then we are creating the first balance doc for this account
    return this.create({
      account: account._id, 
      user: user._id, 
      institution: account.institution,  
      yodleeProviderId: refreshedAccount ? refreshedAccount.providerId : account.yodleeProviderId,
      yodleeDate: refreshedAccount ? refreshedAccount.lastUpdated : account.lastUpdated, 
      yodleeAccountId: refreshedAccount ? refreshedAccount.id : account.yodleeId, 
      availableBalance: refreshedAccount ? refreshedAccount.availableBalance : account.availableBalance,
      currentBalance: refreshedAccount ? refreshedAccount.currentBalance : account.currentBalance, 
      balance: refreshedAccount ? refreshedAccount.balance : account.balance 
    })
  }, 

  createBalanceFromInvestmentAccount: function(user, account, refreshedAccount){
    // if the refreshed account does not exist, then we are creating the first balance doc for this account
    return this.create({
      account: account._id, 
      user: user._id, 
      institution: account.institution,  
      yodleeProviderId: refreshedAccount ? refreshedAccount.providerId : account.yodleeProviderId,
      yodleeDate: refreshedAccount ? refreshedAccount.lastUpdated : account.lastUpdated, 
      yodleeAccountId: refreshedAccount ? refreshedAccount.id : account.yodleeId, 
      cash: refreshedAccount ? refreshedAccount.cash : account.cash,
      currentBalance: refreshedAccount ? refreshedAccount.currentBalance : account.currentBalance, 
      balance: refreshedAccount ? refreshedAccount.balance : account.balance
    })
  }, 

  createBalanceFromInsuranceAccount: function(user, account, refreshedAccount){
    // if the refreshed account does not exist, then we are creating the first balance doc for this account
    return this.create({
      account: account._id, 
      user: user._id, 
      institution: account.institution,  
      yodleeProviderId: refreshedAccount ? refreshedAccount.providerId : account.yodleeProviderId,
      yodleeDate: refreshedAccount ? refreshedAccount.lastUpdated : account.lastUpdated, 
      yodleeAccountId: refreshedAccount ? refreshedAccount.id : account.yodleeId, 
      amountDue: refreshedAccount ? refreshedAccount.amountDue : account.amountDue,
      dueDate: refreshedAccount ? refreshedAccount.dueDate :  account.dueDate, 
      minimumAmountDue: refreshedAccount ? refreshedAccount.minimumAmountDue : account.minimumAmountDue,  
      cashValue: refreshedAccount ? refreshedAccount.cashValue : account.cashValue, 
      balance: refreshedAccount ? refreshedAccount.balance : account.balance
    })
  }, 

  createBalanceFromBillAccount: function(user, account, refreshedAccount){
    // if the refreshed account does not exist, then we are creating the first balance doc for this account
    return this.create({
      account: account._id, 
      user: user._id, 
      institution: account.institution,  
      yodleeProviderId: refreshedAccount ? refreshedAccount.providerId : account.yodleeProviderId,
      yodleeDate: refreshedAccount ? refreshedAccount.lastUpdated : account.lastUpdated, 
      yodleeAccountId: refreshedAccount ? refreshedAccount.id : account.yodleeId, 
      amountDue: refreshedAccount ? refreshedAccount.amountDue : account.amountDue,
      dueDate: refreshedAccount ? refreshedAccount.dueDate :  account.dueDate, 
      minimumAmountDue: refreshedAccount ? refreshedAccount.minimumAmountDue : account.minimumAmountDue,  
      balance: refreshedAccount ? refreshedAccount.balance : account.balance
    })
  }, 

  createBalanceFromRewardAccount: function(user, account, refreshedAccount){
    // if the refreshed account does not exist, then we are creating the first balance doc for this account
    return this.create({
      account: account._id, 
      user: user._id, 
      institution: account.institution,  
      yodleeDate: refreshedAccount ? refreshedAccount.lastUpdated : account.lastUpdated, 
      yodleeProviderId: refreshedAccount ? refreshedAccount.providerId : account.yodleeProviderId,
      yodleeAccountId: refreshedAccount ? refreshedAccount.id : account.yodleeId, 
      balance: refreshedAccount ? refreshedAccount.balance : account.balance
    })
  },

  createBalanceFromLoanAccount: function(user, account, refreshedAccount){
    // if the refreshed account does not exist, then we are creating the first balance doc for this account
    return this.create({
      account: account._id, 
      user: user._id, 
      institution: account.institution,  
      yodleeDate: refreshedAccount ? refreshedAccount.lastUpdated : account.lastUpdated, 
      yodleeProviderId: refreshedAccount ? refreshedAccount.providerId : account.yodleeProviderId,
      yodleeAccountId: refreshedAccount ? refreshedAccount.id : account.yodleeId, 
      balance: refreshedAccount ? refreshedAccount.balance : account.balance, 
      originalLoanAmount: refreshedAccount ? refreshedAccount.originalLoanAmount : account.originalLoanAmount
    })
  }, 

  createBalanceFromPlaid: function(user, account, refreshedAccount){
    return this.create({
      account: account._id, 
      user: user._id, 
      institution: account.institution, 
      plaidInstitutionId: refreshedAccount? refreshedAccount.plaidInstitutionId : account.plaidInstitutionId, 
      balance: refreshedAccount ? refreshedAccount.balance : account.balance 
    })
  }  
}


module.exports = mongoose.model('Balance', BalanceSchema);



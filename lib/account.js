'use strict';

var mongoose = require('mongoose');
var util = require('util'); 
var Schema = mongoose.Schema; 

var containerTypes = ['bank', 'creditCard', 'investment', 'insurance', 'loan', 'reward', 'bill']; 
var accountTypes = ['CHECKING', 'SAVINGS'];
var sourceTypes = ['yodlee', 'plaid'];
var myFinTypes = ['cash', 'stash', 'creditCard', 'loan', 'investment'];


// holds all the fields common to all accounts
function BaseSchema(){

  Schema.apply(this, arguments)

  this.add({
    _original: Object, 
    containerType: { type: String, enum: containerTypes, required: true},
    // TODO: add require true
    source: { type: String, enum: sourceTypes },
    accountType: { type: String, enum: accountTypes},
    accountName: { type: String},
    accountStatus: { type: String},
    accountNumber: { type: String},
    isAsset: { type: Boolean},
    isManual: { type: Boolean},
    myFinType: { type: String, enum: myFinTypes},
    // add validation here
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    institution: {type: Schema.Types.ObjectId, ref: 'Institution'},

    balance: { 
      amount: {type: Number}, 
      currency: {type: String}
    },

    // yodlee specifc stuff 
    yodleeId: { type: Number},
    yodleeProviderAccountId: { type: Number},
    yodleeProviderId: { type: Number},
    yodleeProviderName:{ type: String},

    // abstract ids 
    sourceId: { type: Number},
    sourceInstitutionAccountId: {type: Number}, 
    sourceInstitutionId: {type: Number}, 
    sourceInstitutionName: {type: String},

    lastUpdated: {type: Date}, 
    includeInCalculations: {type: Boolean, default: true}
  })
}

// make base inherit from mongoose schema
util.inherits(BaseSchema, Schema)

// create baseAccount class from the base
var BaseAccountSchema = new BaseSchema()


var BankAccountSchema = new BaseSchema({
    // bank 
  availableBalance: { 
    amount: {type: Number}, 
    currency: {type: String}
  },
  currentBalance: { 
    amount: {type: Number}, 
    currency: {type: String}
  }
})

var CreditCardAccountSchema = new BaseSchema({
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
  }
})

var InvestmentAccountSchema = new BaseSchema({
  cash: { 
    amount: {type: Number}, 
    currency: {type: String}
  }, 
  marginBalance: { 
    amount: {type: Number}, 
    currency: {type: String}
  }
})

var InsuranceAccountSchema = new BaseSchema({
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
  }  
})

var BillAccountSchema = new BaseSchema({
  amountDue: { 
    amount: {type: Number}, 
    currency: {type: String}
  }, 
  dueDate: {type: Date},
  minimumAmountDue: {
    amount: {type: Number}, 
    currency: {type: String}
  } 
})

var LoanAccountSchema = new BaseSchema({
  originalLoanAmount: { 
    amount: {type: Number}, 
    currency: {type: String}
  }
})

BaseAccountSchema.set("collection", "accounts");
BankAccountSchema.set("collection", "accounts"); 
CreditCardAccountSchema.set("collection", "accounts");
InsuranceAccountSchema.set("collection", "accounts");
InvestmentAccountSchema.set("collection", "accounts");
BillAccountSchema.set("collection", "accounts");
LoanAccountSchema.set("collection", "accounts");

var BaseAccountModel = mongoose.model('BaseAccount', BaseAccountSchema); 
var BankAccountModel = BaseAccountModel.discriminator('BankAccount', BankAccountSchema);
var CreditCardAccountModel = BaseAccountModel.discriminator('CreditCardAccount', CreditCardAccountSchema);
var InsuranceAccountModel = BaseAccountModel.discriminator('InsuranceAccount', InsuranceAccountSchema);
var InvestmentAccountModel = BaseAccountModel.discriminator('InvestmentAccount', InvestmentAccountSchema);
var BillAccountModel = BaseAccountModel.discriminator('BillAccount', BillAccountSchema);
var LoanAccountModel = BaseAccountModel.discriminator('LoanAccount', LoanAccountSchema);


module.exports = {
  BaseAccount: BaseAccountModel,
  BankAccount: BankAccountModel, 
  CreditCardAccount: CreditCardAccountModel, 
  InsuranceAccount: InsuranceAccountModel, 
  InvestmentAccount: InvestmentAccountModel, 
  BillAccount: BillAccountModel, 
  LoanAccount: LoanAccountModel
}


"use strict"; 

var AccountModule = require('./lib/account');
var PlaidAccount = require('./lib/plaidAccount');
var BalanceModule = require('./lib/balance');
var InstitutionModule = require('./lib/institution');
var TransactionModule = require('./lib/transaction');
var UserModule = require('./lib/user');
var AccessToken = require('./lib/accessToken');
var CobSessionToken = require('./lib/cobSessionToken');
var Budget = require('./lib/budget');
var Diff = require("./lib/diff"); 
var FinancialProfiles = require("./lib/finProfiles"); 
var CashFlowProfiles = require("./lib/cashFlowProfiles"); 
var HTRecord = require("./lib/htRecord");
var NudgeModule = require("./lib/nudge");
var Invest = require("./lib/invest");  
var mongoose = require('mongoose');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');

var models =  {
    // accounts
    BaseAccount: AccountModule.BaseAccount,
    BankAccount: AccountModule.BankAccount,
    CreditCardAccount: AccountModule.CreditCardAccount,
    InsuranceAccount: AccountModule.InsuranceAccount,
    InvestmentAccount: AccountModule.InvestmentAccount,
    BillAccount: AccountModule.BillAccount,
    LoanAccount: AccountModule.LoanAccount,
    PlaidAccount: PlaidAccount,
    // balance
    Balance: BalanceModule,
    // institutions
    BaseInstitution: InstitutionModule.BaseInstitution,
    PlaidInstitution: InstitutionModule.PlaidInstitution,
    YodleeInstitution: InstitutionModule.YodleeInstitution,
    // transactions
    BaseTransaction: TransactionModule.BaseTransaction,
    PlaidTransaction: TransactionModule.PlaidTransaction,
    YodleeTransaction: TransactionModule.YodleeTransaction,
    // users
    BaseUser: UserModule.BaseUser,
    WaitListUser: UserModule.WaitListUser,
    User: UserModule.User,
    // acesstoken
    AccessToken: AccessToken,
    // cobSessionToken
    CobSessionToken: CobSessionToken, 
    Budget: Budget, 
    HTRecord: HTRecord,
    BaseNudge: NudgeModule.BaseNudge, 
    BadAccessTokenNudge: NudgeModule.BadAccessTokenNudge,
    LinkNudge: NudgeModule.LinkNudge,
    InfoNudge: NudgeModule.InfoNudge,
    Deck: NudgeModule.Deck,
    Diff: Diff,
    Invest: Invest,
    FinancialProfiles: FinancialProfiles, 
    CashFlowProfiles: CashFlowProfiles
  }

exports.initialize = function(uri, config, onComplete){

  if (config)  _.merge(process.env, config)


   var options = { server: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } }, 
                replset: { socketOptions: { keepAlive: 300000, connectTimeoutMS : 30000 } } };  


  mongoose.connect(uri, options, function(err){
    if(err) throw err; 

    var modelsPath = path.join(process.cwd(), '/node_modules/@myfintech/myfinmodels/lib/');

    fs.readdir(modelsPath, function(err, fileList){
      if(err) throw err;
      fileList.forEach(function(name) {
        if(fs.existsSync(name)){
          require(name);
        }
      });
      onComplete(models)
    });
  });
}

exports.models = models;


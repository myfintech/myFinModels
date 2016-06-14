"use strict"; 

var AccountModule = require('./lib/account');
var PlaidAccount = require('./lib/plaidAccount');
var BalanceModule = require('./lib/balance');
var InstitutionModule = require('./lib/institution'); 
var TransactionModule = require('./lib/transaction'); 
var UserModule = require('./lib/user'); 
var AccessToken = require('./lib/accessToken');


module.exports = {
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
  AccessToken: AccessToken
}
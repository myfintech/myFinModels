"use strict";

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var util = require('util');

function BaseSchema(){
  Schema.apply(this, arguments)

  this.add({
    recipient: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    message: {type: String},
    dateCreated: {type: Date, default: Date.now},
    error: {type: Object}
  })
}

util.inherits(BaseSchema, Schema);

var BaseSMSRecordSchema = new BaseSchema();

var BalanceSMSRecordSchema = new BaseSchema();

var PayDaySMSRecordSchema = new BaseSchema({
  transaction: {type: mongoose.Schema.Types.ObjectId, ref: 'Transaction'},
  absAmount: {type: Number}
})

var InterestChargedSMSRecordSchema = new BaseSchema({
  transaction: {type: mongoose.Schema.Types.ObjectId, ref: 'Transaction'},
  absAmount: {type: Number}
})

var TopSpendSMSRecordSchema = new BaseSchema({
  transactions: [{type: mongoose.Schema.Types.ObjectId, ref: 'Transaction'}]
})

var BankFeeSMSecordSchema = new BaseSchema({
  transaction: {type: mongoose.Schema.Types.ObjectId, ref: 'Transaction'},
  absAmount: {type: Number},
  // plaid has a lot of category ids for bank fees so we want to know which one without having to populate the transaction doc
  category_id: {type: String}
})

var RefundToCreditCardSMSRecordSchema = new BaseSchema({
  transaction: {type: mongoose.Schema.Types.ObjectId, ref: 'Transaction'},
  absAmount: {type: Number},
})

var LowBalanceSMSRecordSchema = new BaseSchema({
  account: {type: mongoose.Schema.Types.ObjectId, ref: 'PlaidAccount'},
  balance: {
    available: {type: Number},
    current: {type: Number}
  }
})

var QuoteSMSRecordSchema = new BaseSchema({});


BaseSMSRecordSchema.set("collection", "smsrecords");
PayDaySMSRecordSchema.set("collection", "smsrecords");
BalanceSMSRecordSchema.set("collection", "smsrecords");
BankFeeSMSecordSchema.set("collection", "smsrecords");
QuoteSMSRecordSchema.set("collection", "smsrecords");
TopSpendSMSRecordSchema.set("collection", "smsrecords");
InterestChargedSMSRecordSchema.set("collection", "smsrecords");
LowBalanceSMSRecordSchema.set("collection", "smsrecords");
RefundToCreditCardSMSRecordSchema.set("collection", "smsrecords");

var BaseSMSRecordModel = mongoose.model("BaseSMSRecord", BaseSMSRecordSchema);
var PayDaySMSRecordModel = BaseSMSRecordModel.discriminator("PayDaySMSRecord", PayDaySMSRecordSchema);
var BalanceSMSRecordModel = BaseSMSRecordModel.discriminator("BalanceSMSRecord", BalanceSMSRecordSchema);
var BankFeeSMSRecordModel = BaseSMSRecordModel.discriminator("BankFeeSMSRecord", BankFeeSMSecordSchema);
var QuoteSMSRecordModel = BaseSMSRecordModel.discriminator("QuoteSMSRecord", QuoteSMSRecordSchema);
var TopSpendSMSRecordModel = BaseSMSRecordModel.discriminator("TopSpendSMSRecord", TopSpendSMSRecordSchema);
var InterestChargedSMSRecordModel = BaseSMSRecordModel.discriminator("InterestChargedSMSRecord", InterestChargedSMSRecordSchema);
var LowBalanceSMSRecordModel = BaseSMSRecordModel.discriminator("LowBalanceSMSRecord", LowBalanceSMSRecordSchema);
var RefundToCreditCardSMSRecordModel = BaseSMSRecordModel.discriminator("RefundToCreditCardSMSRecord", RefundToCreditCardSMSRecordSchema);


module.exports = {
  BaseSMSRecord: BaseSMSRecordModel,
  PayDaySMSRecord: PayDaySMSRecordModel,
  BalanceSMSRecord: BalanceSMSRecordModel,
  BankFeeSMSRecord: BankFeeSMSRecordModel,
  QuoteSMSRecord: QuoteSMSRecordModel,
  TopSpendSMSRecord: TopSpendSMSRecordModel,
  InterestChargedSMSRecord: InterestChargedSMSRecordModel,
  LowBalanceSMSRecord: LowBalanceSMSRecordModel,
  RefundToCreditCardSMSRecord: RefundToCreditCardSMSRecordModel
}




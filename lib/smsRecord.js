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
  })
}

util.inherits(BaseSchema, Schema);

var BaseSMSRecordSchema = new BaseSchema();

var PayDaySMSRecordSchema = new BaseSchema({
  transaction: {type: mongoose.Schema.Types.ObjectId, ref: 'Transaction'}, 
  absAmount: {type: Number} 
})

var BalanceSMSRecordSchema = new BaseSchema();

BaseSMSRecordSchema.set("collection", "smsrecords");
PayDaySMSRecordSchema.set("collection", "smsrecords");
BalanceSMSRecordSchema.set("collection", "smsrecords"); 

var BaseSMSRecordModel = mongoose.model("BaseSMSRecord", BaseSMSRecordSchema);
var PayDaySMSRecordModel = BaseSMSRecordModel.discriminator("PayDaySMSRecord", PayDaySMSRecordSchema);
var BalanceSMSRecordModel = BaseSMSRecordModel.discriminator("BalanceSMSRecord", BalanceSMSRecordSchema);

module.exports = {
  BaseSMSRecord: BaseSMSRecordModel, 
  PayDaySMSRecord: PayDaySMSRecordModel, 
  BalanceSMSRecord: BalanceSMSRecordModel
}




"use strict";

var mongoose = require("mongoose"); 
var Schema = mongoose.Schema;
var util = require('util');

function BaseSchema(){
  Schema.apply(this, arguments)

  this.add({
    numQueryResults: {type: Number},
    numTextsSent: {type: Number},
    type: {type: String},
    dateCreated: {type: Date, default: Date.now},
    errs: [Object]
  })
}

util.inherits(BaseSchema, Schema);

var BaseSMSReportSchema = new BaseSchema();

BaseSMSReportSchema.set("collection", "smsreports");

module.exports =  mongoose.model("BaseSMSReport", BaseSMSReportSchema);
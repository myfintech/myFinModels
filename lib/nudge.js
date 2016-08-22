"use strict"; 

var mongoose = require('mongoose'); 
var statuses = ["pending", "archive", "snooze"];
var Schema = mongoose.Schema;
var util = require('util');

function BaseSchema(){
  Schema.apply(this, arguments)

  this.add({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}, 
    dateCreated: {type: Date, default: Date.now}, 
    success: {type: Boolean}, 
  })
}

util.inherits(BaseSchema, Schema);


var BaseNudgeSchema = new BaseSchema(); 

var BadAccessToken = new BaseSchema({
  plaidInstitution: Object, 
  institution: {type: mongoose.Schema.Types.ObjectId, ref: 'Institution'},
  token: String, 
  errorMessage: Object
}); 

BaseNudgeSchema.set("collection", "nudges");

var BaseNudgeModel = mongoose.model("BaseNudge", BaseNudgeSchema);
var BadAccessTokenNudgeModel = BaseNudgeModel.discriminator("BadAccessTokenNudge", BadAccessToken);


/*
user: userId 
__t: BadAccessTokenNudge
institution: institution 
verb: "PATCH"
institutionId: institutionId
token: String 
dateCreated: date 
success: boolean
*/

module.exports = {
  BaseNudge: BaseNudgeModel, 
  BadAccessTokenNudge: BadAccessTokenNudgeModel
};



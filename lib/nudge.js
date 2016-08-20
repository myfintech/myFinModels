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
  data: {
    plaidInstitution: Object, 
    verb: String, 
    institution: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    accessToken: String,
    errorMessage: Object

  }
}); 

BaseNudgeSchema.set("collection", "nudges");

var BaseNudgeModel = mongoose.model("BaseNudge", BaseNudgeSchema);
var BadAccessTokenNudgeModel = mongoose.model("BadAccessTokenNudge", BadAccessToken)


/*
user: userId 
type: BadAccessToken
data  
  institution: institution 
  verb: "PATCH"
  institutionId: institutionId
  accessToken: String 
dateCreated: date 
success: boolean
*/

module.exports = {
  BaseNudge: BaseNudgeModel, 
  BadAccessTokenNudge: BadAccessTokenNudgeModel
};



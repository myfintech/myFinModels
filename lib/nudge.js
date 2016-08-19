"use strict"; 

var mongoose = require('mongoose'); 

var nudgeTypes = ["badAccessToken"];
var statuses = ["pending", "archive", "snooze"];

var NudgeSchema = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}, 
  type: { type: String, enum: nudgeTypes }, 
  data: {type: Object, default: {}}, 
  dateCreated: {type: Date, default: Date.now}, 
  success: {type: Boolean}, 
  status: {type: String, enum: statuses}, 
  snoozeInterval: {type: Number}, 
  snoozeCount: {type: Number}, 
  sendMethod: {
    sms: {}, 
    email: {}
  }
});

NudgeSchema.index({user: 1});


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

module.exports = mongoose.model('Nudge', NudgeSchema);



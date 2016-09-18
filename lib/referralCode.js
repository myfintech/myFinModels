"use strict"; 

var mongoose = require('mongoose'); 

var ReferralCodeSchema = new mongoose.Schema({
  sender: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}, 
  recipients: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}], 
  code: {type: String}, 
  dateEffective: {type: Date, default: Date.now}, 
  limit: {type: Number, default: 10}, 
  noLimit: {type: Boolean, default: false} 
});

module.exports = mongoose.model('ReferralCode', ReferralCodeSchema);



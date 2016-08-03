"use strict"; 

var mongoose = require('mongoose'); 

var CashFlowProfileSchema = new mongoose.Schema({
  user: {type: Schema.Types.ObjectId, ref: 'User'},
  made: {type: Number},
  spent: {type: Number},
  fromFriends: {type: Number},
  transfer: {type: Number},
  net: {type: Number},
  dateCreated: {type: Date, default: Date.now}
});

module.exports = mongoose.model('CashFlowProfile', CashFlowProfileSchema);


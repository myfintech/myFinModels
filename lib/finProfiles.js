"use strict"; 

var mongoose = require('mongoose'); 

var FinancialProfileSchema = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  cash: {type: Number},
  stash: {type: Number},
  loan: {type: Number},
  investment: {type: Number},
  creditCard: {type: Number},
  dateCreated: {type: Date, default: Date.now}
});

module.exports = mongoose.model('FinancialProfile', FinancialProfileSchema);


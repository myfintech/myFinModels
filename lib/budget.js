"use strict"; 

var mongoose = require('mongoose'); 

var BudgetSchema = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}, 
  // percentage 
  savingsTargetRate: {type: Number}, 
  monthlyTakeHome: {type: Number},
  monthlyRent: {type: Number}, 
  monthlyNonRentRecurring: {type: Number}, 
  lastUpdated: {type: Date},
  dateCreated: {type: Date, default: Date.now} 
});

module.exports = mongoose.model('Budget', BudgetSchema);
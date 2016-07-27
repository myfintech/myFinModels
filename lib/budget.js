"use strict"; 

var mongoose = require('mongoose'); 

var BudgetSchema = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}, 
  savingsTarget: {type: Number}, 
  monthlyTakeHome: {type: Number}, 
  dateCreated: {type: Date, default: Date.now} 

});

module.exports = mongoose.model('Budget', BudgetSchema);
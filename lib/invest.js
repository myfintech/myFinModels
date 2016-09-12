"use strict"; 

var mongoose = require('mongoose'); 

var InvestSchema = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}, 
  institution: {type: mongoose.Schema.Types.ObjectId, ref: 'Institution'}, 
  transaction: {type: mongoose.Schema.Types.ObjectId, ref: 'PlaidTransaction'}, 
  firstName: String, 
  lastName: String, 
  transactionName: String, 
  category_id: String, 
  categories: [String],  
  dateCreated: {type: Date, default: Date.now} 
});

module.exports = mongoose.model('Invest', InvestSchema);



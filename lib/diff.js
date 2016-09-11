"use strict"; 

var mongoose = require('mongoose'); 

var DiffSchema = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}, 
  institution: {type: mongoose.Schema.Types.ObjectId, ref: 'Institution'}, 
  absAmount: Number, 
  firstName: String, 
  lastName: String, 
  transactionName: String, 
  baseType: String, 
  category_id: String, 
  alg1cashFlowType: String, 
  alg2cashFlowType: String,
  dateCreated: {type: Date, default: Date.now} 
});

module.exports = mongoose.model('Diff', DiffSchema);



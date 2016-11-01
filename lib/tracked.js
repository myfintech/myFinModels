"use strict"; 

var mongoose = require('mongoose'); 

var TrackedSchema = new mongoose.Schema({
  numAccounts: {type: Number},
  dateCreated: {type: Date, default: Date.now}, 
  total: {type: Number}
});

module.exports = mongoose.model('Tracked', TrackedSchema);

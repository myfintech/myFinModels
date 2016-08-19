"use strict"; 

var mongoose = require('mongoose'); 

var HTRecord = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}, 
  institution: {type: mongoose.Schema.Types.ObjectId, ref: 'Institution'}, 
  token: {type: String}, 
  dateCreated: {type: Date, default: Date.now}, 
  timeToCheck: {type: Date}
});

module.exports = mongoose.model('HTRecord', HTRecord);

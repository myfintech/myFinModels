"use strict"; 

var mongoose = require('mongoose'); 

var UserCohortSchema = new mongoose.Schema({
  last: String, 
  next: String, 
  values: [String]
});

module.exports = mongoose.model('UserCohort', UserCohortSchema);


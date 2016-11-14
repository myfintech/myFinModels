"use strict"; 

var mongoose = require('mongoose'); 

var EntitySchema = new mongoose.Schema({
  string: {type: String}, 
  name: {type: String}
});

module.exports = mongoose.model('Entity', EntitySchema);







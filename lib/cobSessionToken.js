"use strict"; 

var mongoose = require('mongoose'); 

var CobSessionTokenSchema = new mongoose.Schema({
  value: {type: String}
});

module.exports = mongoose.model('CobSessionToken', CobSessionTokenSchema);


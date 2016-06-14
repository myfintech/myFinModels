"use strict"; 

var mongoose = require('mongoose'); 

var AccessTokenSchema = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}, 
  institution: {type: mongoose.Schema.Types.ObjectId, ref: 'Institution'}, 
  token: String
});

module.exports = mongoose.model('AccessToken', AccessTokenSchema);
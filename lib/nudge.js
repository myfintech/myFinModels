"use strict"; 

var mongoose = require('mongoose'); 
var statuses = ["pending", "archive", "snooze"];
var Schema = mongoose.Schema;
var util = require('util');

function BaseSchema(){
  Schema.apply(this, arguments)

  this.add({
    title: String,
    message: String,
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}, 
    dateCreated: {type: Date, default: Date.now}, 
    success: {type: Boolean}, 
  })
}

util.inherits(BaseSchema, Schema);


var BaseNudgeSchema = new BaseSchema(); 

var BadAccessToken = new BaseSchema({
  plaidInstitution: Object, 
  institution: {type: mongoose.Schema.Types.ObjectId, ref: 'Institution'},
  token: String, 
  errorMessage: Object
}); 

BaseNudgeSchema.set("collection", "nudges");


var LinkNudgeSchema = new BaseSchema({
  title: String, 
  message: String,
  buttonLabel: String,
  plaidInstitution: Object,
  loginForm: Object,
  institutionName: String, 
  institution: {type: mongoose.Schema.Types.ObjectId, ref: 'Institution'},
  token: String,
  type: String,
  errorMessage: Object
}); 


LinkNudgeSchema.set("collection", "nudges");

var states = ["newUser"];
var InfoNudgeSchema = new BaseSchema({
  singleton: Boolean,
  title: String, 
  message: String, 
  state: {type: String, enum: states },
  index: Number, 
  deck: {type: mongoose.Schema.Types.ObjectId, ref: 'Deck'}
}); 


InfoNudgeSchema.set("collection", "nudges");

var DeckSchema = new mongoose.Schema({
  name: String
});

DeckSchema.set("collection", "decks");

var DeckModel = mongoose.model('Deck', DeckSchema);

var BaseNudgeModel = mongoose.model("BaseNudge", BaseNudgeSchema);
var BadAccessTokenNudgeModel = BaseNudgeModel.discriminator("BadAccessTokenNudge", BadAccessToken);
var LinkNudgeModel = BaseNudgeModel.discriminator("LinkNudge", LinkNudgeSchema);
var InfoNudgeModel = BaseNudgeModel.discriminator("InfoNudge", InfoNudgeSchema);

/****
* user: userId 
* __t: BadAccessTokenNudge
* institution: institution 
* verb: "PATCH"
* institutionId: institutionId
* token: String 
* dateCreated: date 
* success: boolean
****/

module.exports = {
  BaseNudge: BaseNudgeModel, 
  BadAccessTokenNudge: BadAccessTokenNudgeModel, 
  LinkNudge: LinkNudgeModel,
  InfoNudge: InfoNudgeModel, 
  Deck: DeckModel
};



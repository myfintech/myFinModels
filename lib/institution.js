 'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var util = require('util');

var priorityTypes = [ 'COBRAND', 'SUGGESTED', 'POPULAR'];


function BaseSchema(){
  Schema.apply(this, arguments)

  this.add({
    _original: Object, 
    name: {type: String}, 
    sourceId: {type: String}
  })
}

util.inherits(BaseSchema, Schema);

var BaseInstitutionSchema = new BaseSchema(); 

var PlaidInstitutionSchema = new BaseSchema({
  credentials: {
    username: {type: String}, 
    password: {type: String}
  }, 
  currencyCode: {type: String}, 
  has_mfa: Boolean, 
  // products: [String], 
  
  plaidId: String, 
  url: String
})

var YodleeInstitutionSchema = new BaseSchema({ 
  yodleeId: { type: Number},
  loginUrl: { type: String},
  baseUrl: { type: String},
  favicon: { type: String},
  logo: { type: String},
  status: { type: String},
  mfaType: { type: String},
  oAuthSite:{ type: Boolean},
  primaryLanguageISOCode: { type: String},
  countryISOCode: { type: String},
  forgetPasswordUrl: { type: String},
  containerNames: [String], 
  dateCreated: {type: Date, default: Date.now}, 

})

BaseInstitutionSchema.set("collection", "institutions")

var BaseInstitutionModel = mongoose.model("Institution", BaseInstitutionSchema); 
var PlaidInstitutionModel =  BaseInstitutionModel.discriminator("PlaidInstitution", PlaidInstitutionSchema); 
var YodleeInstitutionModel = BaseInstitutionModel.discriminator("YodleeInstitution", YodleeInstitutionSchema);

module.exports = {
  PlaidInstitution: PlaidInstitutionModel, 
  YodleeInstitution: YodleeInstitutionModel, 
  BaseInstitution: BaseInstitutionModel
}

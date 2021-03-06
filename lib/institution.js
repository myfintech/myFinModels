 'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var util = require('util');


function BaseSchema(){
  Schema.apply(this, arguments)

  this.add({
    _original: Object, 
    name: {type: String}, 
    sourceId: {type: String}, 
    dateCreated: {type: Date, default: Date.now}, 
    logo: { type: String},
  })
}

util.inherits(BaseSchema, Schema);

var BaseInstitutionSchema = new BaseSchema(); 

var PlaidInstitutionSchema = new BaseSchema({
  accountsLocked: String, 
  accountSetup: String, 
  colors: Object, 
  // fields: [{
  //   name: String, 
  //   label: String, 
  //   type: String
  // }], 
  forgottenPassword: String, 
  type: String, 
  video: String,
  currencyCode: {type: String}, 
  products: Object, 
  plaidId: String, 
  url: String
})

var YodleeInstitutionSchema = new BaseSchema({ 
  yodleeId: { type: Number},
  loginUrl: { type: String},
  baseUrl: { type: String},
  favicon: { type: String},
  status: { type: String},
  mfaType: { type: String},
  oAuthSite:{ type: Boolean},
  primaryLanguageISOCode: { type: String},
  countryISOCode: { type: String},
  forgetPasswordUrl: { type: String},
  containerNames: [String]
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

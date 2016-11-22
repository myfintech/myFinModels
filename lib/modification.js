var mongoose = require('mongoose'); 
var Schema = mongoose.Schema; 
var util = require('util');
var moment = require('moment');
require("moment-range"); 
var Promise = require("bluebird"); 


function BaseSchema(){
  mongoose.Schema.apply(this, arguments)

  this.add({
    dateCreated: {type: Date, default: Date.now}, 
    user: {type: Schema.Types.ObjectId, ref: 'User'},
  })
}

// make the base inherit from the generic mongoose schema
util.inherits(BaseSchema, Schema)

// create baseUser class from the base
var BaseModificationSchema = new BaseSchema();

var TransactionModificationSchema = new BaseSchema({
  transaction: {type: Schema.Types.ObjectId, ref: 'Transaction'},
  modType: {type: String,  enum: ['date', 'hide', 'unhide', 'cashFlowType']},
  newProps: {type: Object},
  oldProps: {type: Object},
});



// register baseUser model
var BaseUserModificationModel = mongoose.model('UserModification', BaseModificationSchema)

// WaitListUserSchema.plugin(encrypt, { encryptionKey: encKey, signingKey: sigKey});
// add waitlist user as a type of the baseUser
var TransactionModificationModel = BaseUserModificationModel.discriminator('TransactionModification', TransactionModificationSchema)




module.exports = {
  // export base model so user model can be a discriminator of it
  BaseUserModification: BaseUserModificationModel,
  TransactionModification: TransactionModificationModel,
}

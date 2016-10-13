"use strict"; 

var mongoose = require('mongoose'); 
var Schema = mongoose.Schema;
var util = require('util');

function BaseSchema(){
  Schema.apply(this, arguments)

  this.add({
    last: {type: String}, 
    next: {type: String},
    range: [String] 
  })
}

util.inherits(BaseSchema, Schema);

var BaseQueueSchema = new BaseSchema();

var InspirationQueueSchema = new BaseSchema();

BaseQueueSchema.set("collection", "queues");
InspirationQueueSchema.set("collection", "queues");


var BaseQueueModel = mongoose.model("BaseQueue", BaseQueueSchema);
var InspirationQueueModel = BaseQueueModel.discriminator("InspirationQueue", InspirationQueueSchema);


module.exports = {
  BaseQueue: BaseQueueModel, 
  InspirationQueue: InspirationQueueModel, 
}



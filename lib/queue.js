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

var PayDayQueueSchema = new BaseSchema();


/// maybe a job runs every morning at ten and executes the texts to send 
// problems: the transaction might have changed, the amount, it might have been removed by this point because it became posted 
// think we should hold off on this functionality 
// var JobQueueSchema = new BaseSchema({
//   mapOfJobsByDate: {
//     "2016-10-10": [{
//       timeToSend: Date, 
//       smsPlanner: ObjectId // has information about who to text and what to text 
//     }]
//   }
// });


BaseQueueSchema.set("collection", "queues");
InspirationQueueSchema.set("collection", "queues");
PayDayQueueSchema.set("collection", "queues"); 

var BaseQueueModel = mongoose.model("BaseQueue", BaseQueueSchema);
var InspirationQueueModel = BaseQueueModel.discriminator("InspirationQueue", InspirationQueueSchema);
var PayDayQueueModel = BaseQueueModel.discriminator("PayDayQueue", PayDayQueueSchema); 


module.exports = {
  BaseQueue: BaseQueueModel, 
  InspirationQueue: InspirationQueueModel, 
  PayDayQueue: PayDayQueueModel
}



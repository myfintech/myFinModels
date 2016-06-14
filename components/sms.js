"use strict"; 

var twilio = require('twilio');
var config = require('./config');
var Promise = require('bluebird');
var client = twilio(config.twilio.sid, config.twilio.auth);
var sendMessage = Promise.promisify(client.messages.create);

var Sms = function(to, msg) {
  this.to = to;
  this.msg = msg;
};

// twilio-node 1.4.0 supports callbacks and promises
Sms.prototype.send = function() {
  var self = this;
  if(!self.to) {
    return Promise.reject({ message: 'message not sent. no phone number.' });
  }
  if (config.env !== 'production') {
    return Promise.resolve();
  }
  //returns a promise
  return sendMessage({
    to: this.to,
    from: config.twilio.number,
    body: this.msg
  });
}



module.exports = Sms;
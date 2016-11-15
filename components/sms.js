"use strict";

var twilio = require('twilio');
var config = require('./config');
var Promise = require('bluebird');
var client = twilio(config.twilio.sid, config.twilio.auth);
var sendMessage = Promise.promisify(client.messages.create);
var rp = require('request-promise');
var _ = require('lodash');

var Sms = function(to, msg, mediaUrl, statusCallback) {
  this.to = to;
  this.from = config.twilio.number;
  this.msg = msg;
  this.mediaUrl = mediaUrl;
  this.statusCallback = statusCallback;
};

// twilio-node 1.4.0 supports callbacks and promises
Sms.prototype.send = function() {
  var self = this;
  if(!self.to) {
    return Promise.reject({ message: 'message not sent. no phone number.' });
  }
  if (!self.msg && !self.mediaUrl) {
    return Promise.reject({ message: 'Message not sent. A message must have either a body or an mediaUrl' });
  }
  if (config.env !== 'production') {
    return Promise.resolve();
  }
  //returns a promise
  var message = {
    to: self.to,
    from: 'MG84a128a9ccf3ee83a1275ed9f89f6224',
    body: self.msg,
    // MessagingServiceSid: config.twilio.messagingServiceSidAdminsTalkToUsers,
    // MessagingServiceSid: 'MG84a128a9ccf3ee83a1275ed9f89f6224',
  };
  if (self.mediaUrl) message.mediaUrl = self.mediaUrl;
  if (self.statusCallback) message.statusCallback = self.statusCallback;
  // returns a promise
  return sendMessage(message);
}


module.exports = Sms;
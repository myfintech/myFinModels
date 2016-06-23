"use strict";

var twilio = require('twilio');
var config = require('./config');
var Promise = require('bluebird');
var client = twilio(config.twilio.sid, config.twilio.auth);
var sendMessage = Promise.promisify(client.messages.create);
var rp = require('request-promise');
var _ = require('lodash');

var Sms = function(to, msg) {
  this.to = to;
  this.from = config.twilio.number;
  this.msg = msg;
};

// twilio-node 1.4.0 supports callbacks and promises
Sms.prototype.send = function() {
  var self = this;
  if(!self.to) {
    return Promise.reject({ message: 'message not sent. no phone number.' });
  }
  if(!self.msg) {
    return Promise.reject({ message: 'message not sent. message was empty.' });
  }
  if (config.env !== 'production') {
    return Promise.resolve();
  }
  //returns a promise
  return sendMessage({
    to: self.to,
    from: self.from,
    body: self.msg
  });
}

// get the smsHistory between user and admin
Sms.prototype.get = function() {
  var self = this;
  if(!self.to) {
    return Promise.reject({message: 'cannot get message history. no phone number.' });
  }
  if (config.env !== 'production') {
    return Promise.resolve();
  }

  var uri = 'https://' + config.twilio.sid + ':' + config.twilio.auth + '@api.twilio.com/2010-04-01/Accounts/' + config.twilio.sid + '/Messages.json';
  var qs = '?To=' + self.to + '&From=' + config.twilio.number;
  var headers = {'User-Agent': 'Request-Promise'};

  return rp({uri: uri, qs:qs, headers: headers, json: true})
  .then(function (data) {
    return _.sortBy(data.messages, function (msg) {
      return new Date(msg.date_created)
    })
  })
}


module.exports = Sms;
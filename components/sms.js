"use strict";

var twilio = require('twilio');
var config = require('./config');
var Promise = require('bluebird');
var client = twilio(config.twilio.sid, config.twilio.auth);
var sendMessage = Promise.promisify(client.messages.create);
var rp = require('request-promise');
var _ = require('lodash');

var Sms = function(to, msg, mediaUrl) {
  this.to = to;
  this.from = config.twilio.number;
  this.msg = msg;
  this.mediaUrl = mediaUrl;
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
  var message = {
    to: self.to,
    from: self.from,
    body: self.msg,
  };
  if (self.mediaUrl) message.mediaUrl = self.mediaUrl
  // returns a promise
  return sendMessage(message);
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

  var baseUri = 'https://' + config.twilio.sid + ':' + config.twilio.auth + '@api.twilio.com'
  var messagesUri = baseUri + '/2010-04-01/Accounts/' + config.twilio.sid + '/Messages.json';
  var messagesQueryString  = '?To=' + self.to + '&From=' + config.twilio.number;
  var headers = {'User-Agent': 'Request-Promise'};

  return rp({
    uri: messagesUri,
    qs:messagesQueryString,
    headers: headers,
    json: true
  })
  .then(function (data) {
    var messages = data.messages.map(function(message) {     // build and array of promises (messages with images will have imageUri set)
      if (message.num_media === "0") return Promise.resolve(message);
      return rp({
        uri: baseUri + message.subresource_uris.media,
        headers: headers,
        json: true
      })
      .then(function(data) {
        message.imageUri = 'https://api.twilio.com' + data.media_list[0].uri.replace('.json', ''); // for now just the first media item
        return message;
      })
    })
    return Promise.all(messages);
  })
  .then(function (data) {
    return _.sortBy(data, function (msg) {
      return new Date(msg.date_created)
    })
  })
}


module.exports = Sms;
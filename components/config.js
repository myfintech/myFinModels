'use strict';

var _ = require('lodash');

if (!process.env.NODE_ENV){
  process.env.NODE_ENV = 'development';
}


// All configurations will extend these options
// ============================================
var all = {
  env: process.env.NODE_ENV,

  // Secret for session, you will want to change this and make it an environment variable
  secrets: {
    session: process.env.SESSION_SECRET || "secret",
  },

  twilio: {
    sid: process.env.TWILIO_SID || "GARBAGE_VALUE",
    auth: process.env.TWILIO_AUTH_TOKEN || "GARBAGE_VALUE",
    number: process.env.TWILIO_NUMBER || "GARBAGE_VALUE",
    messagingServiceSidAdminsTalkToUsers: process.env.TWILIO_MESSAGING_SERVICE_ADMINS_TALK_TO_USERS || "GARBAGE_VALUE",
  },

  firebase: {
    clientSecret: process.env.FIREBASE_CLIENT_SECRET || "GARBAGE_VALUE"
  }


};

// Export the config object based on the NODE_ENV
// ==============================================
module.exports = all;

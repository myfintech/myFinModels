"use strict"; 

var crypto = require('crypto');
var Promise = require('bluebird'); 
var _ = require('lodash'); 
var jwt = require('jsonwebtoken'); 
var config = require('./config');
var rp = require('request-promise')

module.exports = function (schema, options) {

  var  fieldsToAdd = {    
    hashedPassword: { type: String, select: false },
    provider: {type: String },
    salt: { type: String, select: false },
  
    online: {type: Boolean},
    lastOnline: {type: Date},

    phoneVerificationCode: {type: String, select: false},
    phoneVerificationCodeExpires: { type: Date, select: false}, 

    resetPasswordToken: { type: String, select: false },
    resetPasswordTokenExpires: { type: Date, select: false },

    confirmEmailToken: {type: String, select: false}, 
    confirmEmailTokenExpires: { type: Date, select: false}, 
    
    google: {},
    googleAccessToken: { type: String, select: false },
    googleRefreshToken: { type: String, select: false },

    linkedIn: {}, 
    linkedInAccessToken: { type: String, select: false}, 
    linkedInRefreshToken: { type: String, select: false },
  
    facebook: {}, 
    facebookAccessToken: { type: String, select: false}, 
    facebookRefreshToken: { type: String, select: false}


  };

  schema.add(fieldsToAdd);

  var authTypes = ['linkedIn', 'google', 'facebook'];

  function doesPasswordMeetCriteria(password){
    var reg = new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*(_|[^\w])).+$/)
    return reg.test(password) && password.length > 8; 
  }

  function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }


  // if (process.env.NODE_ENV !== 'development'){
  
    /**
    * Virtuals
    */
    schema
      .virtual('password')
      .set(function(password) {
        // validates that password contains one number, one uppercase, one lowercase
        // and is greater than 8 characters long 

        if (!doesPasswordMeetCriteria(password)){
          throw new Error('this password does not satisfy criteria')
        }
        this._password = password;
        this.salt = this.makeSalt();
        this.hashedPassword = this.encryptPassword(password);
      })
      .get(function() {
        return this._password;
      });

      /**
      * Validations
      */


      // // Validate empty email 
      schema
        .path('email')
        .validate(function(email) {
          if (authTypes.indexOf(this.provider) !== -1) return true;
          return email.length;
        }, 'Email cannot be blank');
      
      // // Validate empty password
      schema
        .path('hashedPassword')
        .validate(function(hashedPassword) {
          if (authTypes.indexOf(this.provider) !== -1) return true;
          return hashedPassword.length;
        }, 'Password cannot be blank');

      // // validate email is not taken 
      schema
        .path('email')
        .validate(function(value, respond) {
          var self = this;
          return this.constructor.findOne({email: value})
          .then(function(user) {
            if(user) {
              if(self.id === user.id) return respond(true);
              return respond(false);
            }
            respond(true);
          })
          .then(null, function(err){
            throw err;
          });
      }, 'The specified email address is already in use.');


      var validatePresenceOf = function(value) {
        return value && value.length;
      };

      /**
      * Pre-save hook
      */

      schema
        .pre('save', function(next){
          var chars = ['!', '&', '@', '#', '%', '$', '^', '*'];
          chars = shuffle(chars); 
          if (!this.isModified("firstName") && !this.isModified("lastName")) return next(); 
          this.yodlee_username = this.firstName + this.lastName + Math.floor( Math.random() * 10) + 1;
          this.yodlee_password = this.yodlee_username.split('').reverse().join('') + chars.pop(); 
          next();
        })

      // // password is no longer necessary 
      // schema
      //   .pre('save', function(next) {
      //     if (!this.isNew) return next();

      //     if (!validatePresenceOf(this.hashedPassword) && authTypes.indexOf(this.provider) === -1){
      //       next(new Error('Invalid password'));
      //     }
      //     else next();
      //   });
      
      schema
        .pre('save', function(next) {
          if (!this.isNew) return next();

          this.roles = ['User']; 
          next();
        });
    // }

  /**
   *Schema Methods
   */

  _.assign(schema.methods, {

    /**
     * Authenticate - check if the passwords are the same
     *
     * @param {String} plainText
     * @return {Boolean}
     * @api public
    ***/
    // mongoose-encryption adds an `authenticate` method to the prototype so had to change the name 
    authenticatePassword: function(plainText) {
      return this.encryptPassword(plainText) === this.hashedPassword;
    },

    /**
     * Make salt
     *
     * @return {String}
     * @api public
     */
    makeSalt: function() {
      return crypto.randomBytes(16).toString('base64');
    },

    /**
     * Encrypt password
     *
     * @param {String} password
     * @return {String}
     * @api public
     */
    encryptPassword: function(password) {
      if (!password || !this.salt) return '';
      var salt = new Buffer(this.salt, 'base64');
      return crypto.pbkdf2Sync(password, salt, 10000, 64).toString('base64');
    },

    generatePhoneVerificationCode: function(){
      return Math.floor(Math.random()*900000) + 100000;
    },

    generateToken: function() {
      return new Promise(function (resolve, reject) {
        crypto.randomBytes(20, function (err, buffer) {
          var token = buffer.toString('hex');
          if (err) return reject(err);
          resolve(token);
        })
      })
    },

    sanitize: function(){
      return _.omit(this.toJSON(), ['hashedPassword', 'salt', 'hashedPin', 'pin']);
    },

    isAFullUser: function(){
      var user = this.toJSON();
      var keys = Object.keys(user); 
      var okFields = ["password", "id", "isLocked", "__v", "phoneNumber", "firstName", "lastName", "phoneVerificationCodeExpires", "phoneVerificationCode", "provider", "__t", "attempts", "_id", "institutionsLinked", "financialProfile", "cashFlowProfile", "roles"]
      var diff = _.difference(keys, okFields)
      return diff.length > 0; 
    },

    // this sends an email with a link that 
    // hits /users/confirmEmail/:token
    // this route will verify that the token matches 
    sendConfirmEmail: function(host){
      var config = {}; 
      return Promise.resolve(this.generateToken()).bind(this)
      .then(function(token) {
        this.confirmEmailToken = token;
        this.confirmEmailTokenExpires = Date.now() + 3600000;
        config.text = "By clicking the following link, you are confirming your email address "; 
        config.text += "and agreeing to MyFin's terms of service "; 
        config.text += host+'/api/users/confirmEmail/'+this.confirmEmailToken;
        config.subject = "Welcome to MyFin! Please Confirm your email!"; 
        config.important = true;
        return this.sendEmail(config);
      })
      .then(function () {
        return this.save();
      })
    },

    /*

      mergeFields : what we know about the user at this point 
      status: pending on initial add 
    */
    addUserToEmailList: function(mergeFields, status) {
      var self = this; 
      var emailMD5Hash = crypto.createHash('md5').update(this.email.toLowerCase()).digest("hex");
      var endpoint = 'https://us12.api.mailchimp.com/3.0/lists/' + process.env.MAILCHIMP_LIST_ID + '/members/' + emailMD5Hash;
      var options = {
        method: 'PUT',
        json: true,
        uri: endpoint,
        auth: {
          'user': process.env.MAILCHIMP_USER_NAME,
          'password': process.env.MAILCHIMP_API_KEY,
        },
         body: {
            email_type: 'html',
            email_address: self.email,
            status: status,
            "merge_fields": mergeFields,
        },
      };
      return rp(options)
    },
    
    sendReset: function(host) {
      return Promise.resolve(this.generateToken()).bind(this)
      .then(function(token) {
        this.resetPasswordToken = token;
        this.resetPasswordTokenExpires = Date.now() + 3600000;
        var config = {
          text:
            "You are receiving this because you (or someone else) have requested the reset of the password for your account."
            + " Please click on the following link, or paste this into your browser to complete the process:\n\n   " + host+'/reset/'+this.resetPasswordToken + "   "+
            "If you did not request this, please ignore this email and your password will remain unchanged.",
          subject: "MyFin Password Reset Request",
          important: true
        };
        return this.sendEmail(config);
      })
      .then(function () {
        return this.save();
      });
    },

    /**
   * Signs a json web token for authentication purposes
   * @return {String} - json web token containing their id
   */

    signJwt: function() {
      return jwt.sign({ _id: this.id }, config.secrets.session, { expiresInMinutes: 60*24*7 });
    }


  });

};
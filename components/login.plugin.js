// "use strict"; 

var crypto = require('crypto');
var Promise = require('bluebird'); 
var _ = require('lodash'); 
var jwt = require('jsonwebtoken'); 
var config = require('./config');
var rp = require('request-promise');
var encrypt = require('./encryption.js').encrypt;

module.exports = function (schema, options) {

  var fieldsToAdd = {    
        hashedPassword: { type: String, select: false },
        provider: {type: String },
        salt: { type: String, select: false },
      
        online: {type: Boolean},
        lastOnline: {type: Date},

        phoneVerificationCode: {type: String, select: false},
        phoneVerificationCodeExpires: { type: Date, select: false}, 

        resetPasswordCode: { type: Number, select: false },
        resetPasswordCodeExpires: { type: Date, select: false },
        resetAttempts: {type: Number},

        confirmEmailToken: {type: String, select: false}, 
        confirmEmailTokenExpires: { type: Date, select: false}, 
        
        google: {},
        googleAccessToken: { type: String, select: false },
        googleRefreshToken: { type: String, select: false },

        dwolla: {},
        dwollaAccessToken: { type: String, select: false },
        dwollaRefreshToken: { type: String, select: false },

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
    return reg.test(password) && password.length > 7; 
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

  checkRepeat = function (str) {
    var repeats = /(.)\1/;
    return repeats.test(str)
  }

  function removeSequences(str) {
    return str.split("").filter(function(ele, i, arr) {
      return ele !== arr[i-1]; 
    }).join("");
  }

  // if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test'){
  
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

      // // validate email is unique
      schema
        .path('email')
        .validate(function(value, respond) {
          return Promise.resolve(this.constructor.findOne({phoneNumber: encrypt(value)})).bind(this)
          .then(function(user) {
            // it IS, IN FACT, unique
            if (!user) return respond(true); 
            if (this.id === user.id) return respond(true);            
            else return respond(false);
          })
          .then(null, function(err){
            console.log('eeeeeeeeeeeeerrrr in creating an email', err)
            throw err;
          });
      }, 'The specified email is already in use.');
      

      // // Validate empty password
      schema
        .path('hashedPassword')
        .validate(function(hashedPassword) {
          if (authTypes.indexOf(this.provider) !== -1) return true;
          return hashedPassword.length;
        }, 'Password cannot be blank');

      // // validate phone number is not taken 
      schema
        .path('phoneNumber')
        .validate(function(value, respond) {
          if (value === "+11234567890" || value === "+10987654321") return respond(true); 
          return Promise.resolve(this.constructor.findOne({phoneNumber: encrypt(value) })).bind(this)
          .then(function(user) {
            // it IS, IN FACT, unique
            if (!user) return respond(true); 
            if (this.id === user.id) return respond(true);
            
            // if (user && this.id !== user.)
            else return respond(false);
          })
          .then(null, function(err){
            console.log('eeeeeeeeeeeeerrrr in creating phone number', err)
            throw err;
          });
      }, 'The specified phone number is already in use.');



      var validatePresenceOf = function(value) {
        return value && value.length;
      };


      /**
      * Pre-save hook
      */

      schema
        .pre('save', function(next){
          if (!this.isModified("hashedPassword")) return next(); 
          // this.isEmailModified = true; 
          // this.isEmailSet = true;
          this.isPasswordSet = true; 
          next();
        })
      
      schema
        .pre('save', function(next) {
          if (!this.isNew) return next();
          if (!this.roles.length) this.roles = ['User']; 
          else if (this.roles.length) this.roles.push('User');
          next();
        });
    // }
// 
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

    /**
     * Generate phone verification code 
     *
     * @param none
     * @return {Number} 6 digits  
     * @api public
     */

    generatePhoneVerificationCode: function(){
      return Math.floor(Math.random()*900000) + 100000;
    },

    generateReferralCode: function(){
      return String(Math.floor(Math.random()*900000) + 100000);
    },
     /**
     * Generate token
     *
     * @param none
     * @return {String}
     * @api public
     */
    generateToken: function() {
      return new Promise(function (resolve, reject) {
        crypto.randomBytes(20, function (err, buffer) {
          var token = buffer.toString('hex');
          if (err) return reject(err);
          resolve(token);
        })
      })
    },

    /**
     * Sanitize user object
     *
     * @param none
     * @return {Object}
     * @api public
     */

    sanitize: function(){
      return _.omit(this.toJSON(), ['hashedPassword', 'salt', 'hashedPin', 'firebase_token']);
    },

     /**
     * Checks if a user is a full user (has an email and password)
     *
     * @param none
     * @return {Boolean}
     * @api public
     */

    isAFullUser: function(){
      return this.isPasswordSet === true;
    },

     /**
     * Sends an email with a link that hits /api/users/confirmEmail/:token
     *
     * @param {String} host
     * @return {Object}
     * @api public
     */
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

     /**
     * Adds a user to the mailchimp mailing list so she will receive a welcome email!
     *
     * @param {Object} mergeFields (mergeFields =  what we know about the user at this point )
     * @param {String}  status (status = pending on initial add )
     * @return {Object}
     * @api public
     * 
     * find the waitlist doc for this user by email and move their info into the new user doc 
     */
    addUserToEmailList: function(doc, status) {
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
            email_address: this.email,
            status: status,
            "merge_fields": {
              FNAME: doc.firstName, 
              LNAME: doc.lastName, 
              PNUMBER: doc.phoneNumber 
            },
        },
      };
      return rp(options);
    },
    
    /**
     * Sends an email with a link that hits /api/users/reset/:token
     *
     * @param {String}  host 
     * @return {Object}
     * @api public
     */
    sendReset: function() {
      return Promise.resolve(this.generateToken()).bind(this)
      .then(function(token) {
        this.resetPasswordCode = this.generatePhoneVerificationCode();
        this.resetPasswordCodeExpires = Date.now() + 3600000;
        var text = "Your reset code is " + this.resetPasswordCode; 
        return Promise.props({
          send: this.sendSms(text), 
          save: this.save()
        })
      })
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
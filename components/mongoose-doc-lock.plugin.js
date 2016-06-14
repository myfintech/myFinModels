

var Promise = require('bluebird'); 

module.exports = function(schema){



  // defaults; TODO: add options argument
  var options = {
    attemptsPath  : 'attempts',
    lockUntilPath : 'lockUntil',
    isLockedPath  : 'isLocked',
    incMethod     : 'incrementAttempts',
    maxAttempts   : 3,
    lockTime      : 24 * 60 * 60 * 1000 // 24 hours
  }


  // Set the path options
  schema
    .path(options.lockUntilPath, Number)
    .path(options.attemptsPath, Number)
    .path(options.attemptsPath)
      .required(true)
      .default(0);

  // Set up the virtual 'isLocked' key
  schema.virtual(options.isLockedPath).get(function () {
    var lockUntil = this.get(options.lockUntilPath);
    return Boolean(lockUntil && lockUntil > Date.now());
  });

  // Set up the increment method
  schema.method(options.incMethod, function (returnVal) {
  
    var now       = Date.now();
    var lockUntil = this.get(options.lockUntilPath);
    var attempts  = this.get(options.attemptsPath);
    var isLocked  = this.get(options.isLockedPath);

    // if we have a previous lock that has expired, restart at 1 attempt
    if (lockUntil && lockUntil < now) {
      this.set(options.attemptsPath, 1);
      this.set(options.lockUntilPath, undefined);
    }
    // Otherwise, we're incrementing
    else {
      // increment
      this.set(options.attemptsPath, attempts + 1);
      // Lock the account if we've reached max attempts and it's not locked
      if (attempts + 1 >= options.maxAttempts && !isLocked) {
        this.set(options.lockUntilPath, now + options.lockTime);
      }
    }

    return this.save()
    .then(function(user){
      // if there is a returnVal, then return that. Otherwise, return
      // the model.
      return typeof returnVal !== 'undefined' ? returnVal : user;   
    })
  
  });

};
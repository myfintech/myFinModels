// Nodejs encryption with CTR
var crypto = require('crypto')
var algorithm = 'aes-256-ctr';
var password = process.env.MODELS_CRYPTO_KEY;

function encrypt (val) {
    if (val === undefined || val === null) return val; // undefined and null are not personally identifiable
    if (typeof val === "number") val = val.toString(); // we can only encrypt strings so if a value is a number, change it to a string
    if (typeof val !== "string") throw 'encrypt can only encrypt numbers and strings';
    var cipher = crypto.createCipher(algorithm,password)
    var crypted = cipher.update(val,'utf8','hex')
    crypted += cipher.final('hex');
    return crypted;
}


function encryptArray (arr) {
  if (arr.constructor !== Array) throw 'encryptArray must be passed an array'
  return arr.map(function(val) {
    try {
      return encrypt(val);
    } catch (e) {
      throw 'encryptArray was passed an array with an element that can not be encrypted'
    }
  })
}
 
function decrypt(text) {
    if (typeof text !== "string") return text;
    var decipher = crypto.createDecipher(algorithm, password)
    var dec = decipher.update(text,'hex','utf8')
    dec += decipher.final('utf8');
    return dec;
}




module.exports = {
  encrypt: encrypt,
  decrypt: decrypt,
  encryptArray: encryptArray
}
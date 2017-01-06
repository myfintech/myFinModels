// Nodejs encryption with CTR
var crypto = require('crypto')
var algorithm = 'aes-256-ctr';
var password = process.env.MODELS_CRYPTO_KEY;

function encrypt(text){
  var cipher = crypto.createCipher(algorithm,password)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}
 
function decrypt(text){
  var decipher = crypto.createDecipher(algorithm, password)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}

function decryptQuery (query) {
  if (query.phoneNumber) query.phoneNumber = encrypt(query.phoneNumber);
  if (query.email) { query.email = encrypt(query.email) };
  if (query.firstName) { query.firstName = encrypt(query.firstName) };
  if (query.lastName) { query.lastName = encrypt(query.lastName) };
  return query;
}

module.exports = {
  encrypt: encrypt,
  decrypt: decrypt,
  decryptQuery: decryptQuery,
}

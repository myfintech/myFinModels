process.env.MODELS_CRYPTO_KEY = 'afakeencryptionkey'; // must be before require('./encryption');
var encryption = require('./encryption');
var encrypt = encryption.encrypt;
var decrypt = encryption.decrypt;
var encryptRelevantQueryFields = encryption.encryptRelevantQueryFields;

describe('encryption.js', () => {
  
  describe('encrypt', () => {
    
    function callEncrypt (val) {
      encrypt(val)
    }
    
    test('it should return null when passed null', () => {
      var val = encrypt(null)
      expect(val).toBe(null);
    })
  
    test('it should return undefined when passed undefined', () => {
      var val = encrypt(undefined)
      expect(val).toBe(undefined);
    })
    
    test('it should thow an error if passed an object', () => {
      var encryptObject = callEncrypt.bind(null, {test: "goo"})
      expect(encryptObject).toThrowError('encrypt.js can only encrypt numbers and strings');
    })
    
    test('it should throw an error if passed a boolean', () => {
      var encryptObject = callEncrypt.bind(null, true)
      expect(callEncrypt.bind(null, false)).toThrowError('encrypt.js can only encrypt numbers and strings');
    })
    
    test('it should return an encrypted string when passed a string', ()=> {
      var val = 'a nice string';
      var encryptedVal = encrypt(val);
      var decryptedVal = decrypt(encryptedVal);
      expect((val !== encryptedVal) && val === decryptedVal).toBe(true);
    })
    
    test('it should return an encrypted string when passed a number', ()=> {
      var val = 42;
      var encryptedVal = encrypt(val);
      var decryptedVal = decrypt(encryptedVal);
      expect((val.toString() !== encryptedVal) && val.toString() === decryptedVal).toBe(true);
    })
    
  })
  
  describe('decrypt', () => {
    
    test('it should return the input value when passed a non string', () => {
      var types = [{foo: "bar"}, 42, true, undefined, null]
      var allTheSame = types.reduce((acc, type)=>{
        if (type !== decrypt(type)) return false;
        return acc;
      }, true)
      expect(allTheSame).toBe(true);
    })
    
    test('it should decrypt an encrypted string', () => {
      var val = 'a very important string';
      var encryptedVal = encrypt(val);
      var decryptedVal = decrypt(encryptedVal);
      expect(val === decryptedVal).toBe(true);
    })
    
  })
  
  describe('encryptRelevantQueryFields', () => {
      
    test('it encrypt the phoneNumber, email, firstName, lastName, zipCode props of a query object and no other props', () => {
      var q = {
        phoneNumber: "+19175194215",
        email: "things@foo.bar",
        firstName: "Test",
        lastName: "User", 
        zipCode: '10025',
        randomProp: 'fdsafsda'
      };
      var eq = encryptRelevantQueryFields(Object.assign({}, q));
      console.log("encrypted query", eq);
      console.log("decrypted query", q); 
      console.log(q.phoneNumber, decrypt(eq.phoneNumber));
      var doneRight = (
                       q.phoneNumber === decrypt(eq.phoneNumber) &&
                       q.email === decrypt(eq.email) &&
                       q.firstName === decrypt(eq.firstName) &&
                       q.lastName === decrypt(eq.lastName) &&
                       q.zipCode === decrypt(eq.zipCode) &&
                       q.randomProp === eq.randomProp 
                      )
                    
      expect(doneRight).toBe(true);
    })
    
    test('it should decrypt an encrypted string', () => {
      var val = 'a very important string';
      var encryptedVal = encrypt(val);
      var decryptedVal = decrypt(encryptedVal);
      expect(val === decryptedVal).toBe(true);
    })
    
  })
  
  
})

// query operators that we need to support
// $eq : []
// $ne : []
// $in : []
// $nin : []
// $or : []
// $and : []
// $not : []
// $nor : []


// Covered Need to test
// User.findOne({phoneNumber:req.body.phoneNumber, hashedPassword: {$ne: null} })
// User.findOne({phoneNumber: req.body.phoneNumber})
// return BaseUser.findOne({phoneNumber: p})

// Not Covered

// User.find({
//   $and: [
//     {phoneNumber: {$ne: null} },
//     {phoneNumber: {$nin: ["+11234567890", "+10987654321"] }} 
//   ],  
//   hasSeenProfile: true
// }) // find users who should be texted

// BaseUser.find({dateCreated: {$lt: aWeekAgo}, hasSeenProfile: true, $and: [{phoneNumber: {$ne: null} }, {phoneNumber: {$nin: ["+11234567890", "+10987654321"] }} ] }),
// User.find({sourceInstitutions: {$ne: []}, dateCreated: {$lt: oneWeekAgo}, $and:[ {phoneNumber: {$ne: null}}, {phoneNumber: {$nin: ["+11234567890", "+10987654321"]}} ]})
// users.find({email: {$in: listOfEmails }, __t: "User" }).toArray(function(err, users) {
// users.find({email: {$in: listOfEmails }, __t: "User" }).toArray(function(err, users) {



// categories of not covered
// simple $ne
// User.find({phoneNumber: {$ne: null})
// 
// 
// $and:[ {phoneNumber: {$ne: null}}, {phoneNumber: {$nin: ["+11234567890", "+10987654321"]}}]
// 
// 
// see [relevantProp]
// if [relevantProp] is a string
//   return modified query with encrypted string
// else
//   for 
//   var keys Object.keys(relevantProp)

















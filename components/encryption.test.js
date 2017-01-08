process.env.MODELS_CRYPTO_KEY = 'afakeencryptionkey'; // must be before require('./encryption');
var encryption = require('./encryption');
var encrypt = encryption.encrypt;
var decrypt = encryption.decrypt;
var encryptArray = encryption.encryptArray;
var _ = require('lodash');


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
      expect(encryptObject).toThrow();
    })
    
    test('it should throw an error if passed a boolean', () => {
      var encryptObject = callEncrypt.bind(null, true)
      expect(callEncrypt.bind(null, false)).toThrow();
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
  
  describe('encryptArray', () => {
    
    function callEncryptArray (val) {
      encryptArray(val)
    }
    
    test('it should throw an error if not passed a array', () => {   
      var func = callEncryptArray.bind(null, true) 
      expect(func).toThrow();
    })
    
    test('it should return an array of encrypted values', () => {
      var a1 = [encrypt('foobar'), encrypt('foobay')];
      var a2 = encryptArray(['foobar', 'foobay']);
      expect( _.isEqual(a1, a2) ).toBe(true); 
    })
    
    test('it should return an empty array if passed an empty array', () => {
      expect( _.isEqual( encryptArray([]), []) ).toBe(true)
    })
    
    test('it should throw an error if one of the elements in the array is not a string', () => {
      var func = callEncryptArray.bind(null, ['thing', {fooBar: "fdsafs"}]) 
      expect(func).toThrowError('encryptArray was passed an array with an element that can not be encrypted')
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
  
  
    
})















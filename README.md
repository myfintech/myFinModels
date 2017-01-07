#####Certain constraints:

- this module currently exports two things: 1) a config function that takes a database uri, environment object, and a fn to be called once the models have been registered; 2) the models


```javascript

require('@myfintech/myfinmodels').initialize(dbUri, {env: 'env'}, function(models){
  console.log('models', models)
})


//// in another file

var ModularMongooseModels = require('@myfintech/myfinmodels').models;

```




#### Deployment
If you are having trouble getting `@myfintech/myfinmodels` installed on heroku follow the [instructions here](https://medium.com/@oscargodson/npm-private-modules-with-heroku-25a171ce022e#.rs5wzm7r1) and `DON'T PANIC`


#### Encryption
We encrypt all personally identifiable props on the user model. This means `firstName`, `lastName`, `email`, `phoneNumber`, and `zipCode`.
The values are encrypted on set and decrypted on get. Wo you wont have you worry about decrypting when running a `User.find({})`. 
  
However, if you need to query by any encrypted fields, you must first encrypt the values that you are querying for.

`User.find({phoneNumber: "+19175194215"})` == needs to be ==> `User.find({phoneNumber: encrypt("+19175194215")})`

the models export an encryption module that can encrypt or decrypt any value for example

```javascript
var ModularMongooseModels = require('@myfintech/myfinmodels').models;
var ModularMongooseModels = require('@myfintech/myfinmodels').models;
var encrypt = ModularMongooseModels.encryption.encrypt;

User.find({phoneNumber: encrypt("+19175194215")})
.then(function(user){
  console.log("an unencrypted user found by that users phonenumber which was encrypted on disk", user);
})
```







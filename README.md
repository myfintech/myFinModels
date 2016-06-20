#####Certain constraints: 

- this module currently exports two things: 1) a config function that takes a database uri, environment object, and a fn to be called once the models have been registered; 2) the models


```javascript 

require('@myfintech/myFinModels').initialize(dbUri, {environmentVariable: 'environmentVariable'}, function(models){
  console.log('models', models)

})


```

- if you do not have any environment variables, pass `null`
- this module currently expects that a `twilio sid`, `auth_token`, `phoneNumber`, and `session_secret` are on `process.env`
- mongoose encryption requires certs: the user model assumes that there is a `certs` directory with a `test_key.pem` and a `test_sign.pem`



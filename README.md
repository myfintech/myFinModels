#####Certain constraints:

- this module currently exports two things: 1) a config function that takes a database uri, environment object, and a fn to be called once the models have been registered; 2) the models


```javascript

require('@myfintech/myfinmodels').initialize(dbUri, {env: 'env'}, function(models){
  console.log('models', models)
})


//// in another file

var ModularMongooseModels = require('@myfintech/myfinmodels').models;

```

- if you do not have any environment variables, pass `null`
- this module currently expects that a `TWILIO_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_NUMBER`, `SESSION_SECRET`, `YODLEE_COBRAND_USERNAME` and `YODLEE_COBRAND_PASSWORD` are on `process.env`
- mongoose encryption requires certs: the user model assumes that there is a `certs` directory with a `test_key.pem` and a `test_sign.pem`

#### Deployment
If you are having trouble getting `@myfintech/myfinmodels` installed on heroku follow the [instructions here](https://medium.com/@oscargodson/npm-private-modules-with-heroku-25a171ce022e#.rs5wzm7r1) and `DON'T PANIC`



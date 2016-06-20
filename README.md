#####Certain constraints:

- twilio sid, auth_token and phone number must be on `process.env`
- `login.plugin.js` assumes that there is a session secret on `process.env`
- mongoose encryption requires certs: the user model assumes that there is a `certs` directory with a `test_key.pem` and a `test_sign.pem`


### Install it

```
npm install --save @myfintech/myFinModels
```

To do this will need to be log in to npm  and be added to our private npm. [A great intro to private npm](https://docs.npmjs.com/private-modules/intro)

You will need a `certs` folder containing the .pem files for mongoose encryption
You will need to have our `TWILIO_SID` `TWILIO_AUTH_TOKEN` `TWILIO_NUMBER` on the `process.env` You will also need a `SESSION_SECRET` on the `process.env`.

now that you have `all the things` all you need to do is require the module once you have connected to mongoose. Like this

### Use it

```

var mongoose = require('mongoose');

var dbUri;
if (process.env.NODE_ENV === 'development'){
  dbUri = 'mongodb://localhost/devDBname';
}
else if (process.env.NODE_ENV === 'production'){
  dbUri = process.env.MONGODB_URI;
}
else if (process.env.NODE_ENV === "test"){
  dbUri = 'mongodb://localhost/testDBname'
}

else dbUri = 'mongodb://localhost/defaultDBnamePrlyTheSameAsdevDBforagooddefault';


mongoose.connect(dbUri);
mongoose.connection.on('connected', function(){
  console.log("we're connected!")
  require('@myfintech/myFinModels') // The mindblowing part ... now we have access to all our models
})

mongoose.connection.on('error', console.error.bind(console));

```

You will also have to `require` this in your root file. If the code above is called `index.js` inside the `models` folder you could do `require('./models')` from your `app.js`.

Now to interact with our models you can do

```
var ModularMongooseModels = require('@myfintech/myFinModels')
var User = ModularMongooseModels.User;


/**
  Get a single user
*/

exports.show = function(req){
  return req.reqUser;
}

**
  Update a single user
*/

exports.updateMe = function(req){
  if (req.reqUser.isAFullUser()) throw new errors.forbidden("You may not hit this route if you've completed signup");
  req.reqUser.set(req.body)
  return req.reqUser.save()
  .then(function(_user){
    return _user.sanitize();
  })
}

```
yup ... pretty dope ... myfin microservices all day every day.









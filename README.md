#####Certain constraints: 

- twilio sid, auth_token and phone number must be on `process.env`
- `login.plugin.js` assumes that there is a session secret on `process.env`
- mongoose encryption requires certs: the user model assumes that there is a `certs` directory with a `test_key.pem` and a `test_sign.pem`



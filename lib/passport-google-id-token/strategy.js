/**
 * Module dependencies.
 */
var util = require('util')
  , passport = require('passport')
  , request = require('request')
  , googleIdToken = require('google-id-token');

/**
 * Return the google certificates that will be used for signature validation.
 * 
 * A custom function can be used instead when passed as an option in the Strategy
 * constructor. It can be interesting e.g. if caching is needed.
 *
 * @param {String} kid The key id specified in the token
 * @param {Function} callback
 * @api protected
 */
function getGoogleCerts(kid, callback) {
  request({uri: 'https://www.googleapis.com/oauth2/v1/certs'}, function(err, response, body){
    if(err && response.statusCode !== 200) {
      err = err || 'error while retrieving the google certs';
      callback(err, {});
    } else {
      var keys = JSON.parse(body);
      callback(null, keys[kid]);
    }
  });
}

/**
 * `Strategy` constructor.
 *
 * The Google authentication strategy authenticates requests by verifying the
 * signature and fields of the token.
 *
 * Applications must supply a `verify` callback which accepts an `idToken`,
 * and `googleId` of the user to be authenticated, and then calls the `done`
 * callback supplying a `parsedToken` with all its information in visible form,
 * and the very `googleId`, which should be set to `false` if the
 * credentials are not valid. If an exception occured, `err` should be set.
 *
 * Options:
 * - `clientID` your Google application's client id
 * - `getGoogleCerts` optional custom function that returns the Google certificates
 *
 * Examples:
 *
 * passport.use(new GoogleTokenStrategy({
 *     clientID: '123-456-789',
 *     getGoogleCerts: customGetGoogleCerts
 *   },
 *   function(parsedToken, googleId, done) {
 *     User.findOrCreate(..., function (err, user) {
 *       done(err, user);
 *     });
 *   }
 * ));
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function GoogleTokenStrategy(options, verify) {
  if (typeof options == 'function') {
    verify = options;
    options = {};
  }
  
  if (!verify) throw new Error('GoogleTokenStrategy requires a verify function');
  
  this._passReqToCallback = options.passReqToCallback;
  
  this._clientID = options.clientID;
  this._getGoogleCerts = options.getGoogleCerts || getGoogleCerts;
  
  passport.Strategy.call(this);
  this.name = 'google-id-token';
  this._verify = verify;
}


/**
 * Inherit from `Strategy`.
 */
util.inherits(GoogleTokenStrategy, passport.Strategy);

/**
 * Authenticate request by verifying the token
 *
 * @param {Object} req
 * @api protected
 */
GoogleTokenStrategy.prototype.authenticate = function(req, options) {
  options = options || {};
  var self = this;
  
  if (req.query && req.query.error) {
    // TODO: Error information pertaining to OAuth 2.0 flows is encoded in the
    //       query parameters, and should be propagated to the application.
    return this.fail();
  }
	
    var idToken, googleId;
    
    if(req.body) {
      idToken = req.body.id_token || req.body.access_token;
      googleId = req.body.google_id;
    }
    
    idToken = idToken || req.query.id_token || req.query.access_token;
    googleId = googleId || req.query.google_id;
    
    if (!idToken || !googleId) {
      return this.fail();
    }
    
    var parser = new googleIdToken({ getKeys: self._getGoogleCerts });    
    
    self._verifyGoogleToken(parser, idToken, googleId, self._clientID, function(err, parsedToken) {
      if (err) { return self.fail(err); };
      
      function verified(err, parsedToken, info) {
        if (err) { return self.error(err); }
          if (!parsedToken) { return self.fail(info); }
          self.success(parsedToken, info);
        }
        
        if (self._passReqToCallback) {
          self._verify(req, parsedToken, googleId, verified);
        } else {
          self._verify(parsedToken, googleId, verified);
        }
    });
}

/**
 * Verify signature and token fields
 *
 * @param {String} idToken
 * @param {String} googleId
 * @param {String} clientID
 * @param {Function} done
 * @api protected
 */
GoogleTokenStrategy.prototype._verifyGoogleToken = function(parser, idToken, googleId, clientID, done) {  
  parser.decode(idToken, function(err, token) {
    if(err) {
      done(err);
    } else {
      if (token.data.aud === clientID && token.data.sub === googleId) {
        done(err, token);
      } else {
        done(err);
      }
    }
  });
}

/**
 * Expose `GoogleTokenStrategy`.
 */ 
module.exports = GoogleTokenStrategy;

/**
 * Module dependencies.
 */
var util = require('util')
  , Strategy = require('passport-strategy')
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
  request({uri: 'https://www.googleapis.com/oauth2/v1/certs'}, function(err, response, body) {
    if (err || !response || response.statusCode != 200) {
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
 * Applications must supply a `verify` callback which accepts the `idToken`
 * coming from the user to be authenticated, and then calls the `done` callback
 * supplying a `parsedToken` (with all its information in visible form) and the
 * `googleId`.
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

  Strategy.call(this);
  this.name = 'google-id-token';
  this._verify = verify;
}


/**
 * Inherit from `Strategy`.
 */
util.inherits(GoogleTokenStrategy, Strategy);

/**
 * Authenticate request by verifying the token
 *
 * @param {Object} req
 * @api protected
 */
GoogleTokenStrategy.prototype.authenticate = function(req, options) {
  options = options || {};
  var self = this;

  var idToken = (req.body && (req.body.id_token || req.body.access_token))
    || (req.query && (req.query.id_token || req.query.access_token));

  if (!idToken) {
    return self.fail({ message: "No ID token" });
  }

  var parser = new googleIdToken({ getKeys: self._getGoogleCerts });

  self._verifyGoogleToken(parser, idToken, self._clientID, function(err, parsedToken, info) {
    if (err) return self.fail({ message: err.message });

    if (!parsedToken) return self.fail(info);

    function verified(err, user, info) {
      if (err) return self.error(err);
      if (!user) return self.fail(info);
      self.success(user, info);
    }

    if (self._passReqToCallback) {
      self._verify(req, parsedToken, parsedToken.data.sub, verified);
    } else {
      self._verify(parsedToken, parsedToken.data.sub, verified);
    }
  });
}

/**
 * Verify signature and token fields
 *
 * @param {String} idToken
 * @param {String} clientID
 * @param {Function} done
 * @api protected
 */
GoogleTokenStrategy.prototype._verifyGoogleToken = function(parser, idToken, clientID, done) {
  parser.decode(idToken, function(err, token) {
    if(err) {
      done(err);
    } else {
      var aud_valid = (token.data.aud === clientID);

      var exp = parseInt(token.data.exp, 10);
      var now = new Date().getTime() / 1000;

      var expired = now > exp;

      if (!token.isAuthentic) {
        done(null, false, {message: "id_token not signed with a Google public key"});
      } else if (expired) {
        done(null, false, {message: "id_token expired"});
      } else if (!aud_valid) {
        done(null, false, {message: "id_token clientID mismatch"});
      } else {
        done(null, token);
      }
    }
  });
}

/**
 * Expose `GoogleTokenStrategy`.
 */
module.exports = GoogleTokenStrategy;

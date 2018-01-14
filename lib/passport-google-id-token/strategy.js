/**
 * Module dependencies.
 */
var util = require('util')
  , Strategy = require('passport-strategy')
  , request = require('request')
  , jwt = require('jsonwebtoken');

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
 * - `clientID` your Google application's client id (or several as Array)
 * - `getGoogleCerts` optional custom function that returns the Google certificates
 *
 * Examples:
 *
 * passport.use(new GoogleTokenStrategy({
 *     clientID: '123-456-789',
 *     getGoogleCerts: optionalCustomGetGoogleCerts
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
  this._jwtOptions = options.jwtOptions || {};
  this._getGoogleCerts = options.getGoogleCerts || getGoogleCerts;

  Strategy.call(this);
  this.name = 'google-id-token';
  this._verify = verify;
}

/**
 * Return the Google certificate that will be used for signature validation.
 *
 * A custom function can be used instead when passed as an option in the Strategy
 * constructor. It can be interesting e.g. if caching is needed.
 *
 * @param {String} kid The key id specified in the token
 * @param {Function} callback
 * @api protected
 */
function getGoogleCerts(kid, callback) {
  request({uri: 'https://www.googleapis.com/oauth2/v1/certs'}, function(err, res, body) {
    if (err || !res || res.statusCode != 200) {
      err = err || new Error('error while retrieving Google certs');
      callback(err);
    } else {
      try {
        var keys = JSON.parse(body);
      } catch (e) {
        return callback(new Error('could not parse certs'));
      }

      callback(null, keys[kid]);
    }
  });
}

function getBearerToken(headers) {
  if (headers && headers.authorization) {
    var parts = headers.authorization.split(' ');
    return (parts.length === 2 && parts[0] === 'Bearer') ? parts[1] : undefined;
  }
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
    || (req.query && (req.query.id_token || req.query.access_token))
    || (req.headers && (req.headers.id_token || req.headers.access_token))
    || (getBearerToken(req.headers));

  if (!idToken) {
    return self.fail({ message: "no ID token provided" });
  }

  self._verifyGoogleToken(idToken, self._clientID, self._getGoogleCerts, self._jwtOptions, function(err, parsedToken, info) {
    if (err) return self.fail({ message: err.message });

    if (!parsedToken) return self.fail(info);

    function verified(err, user, info) {
      if (err) return self.error(err);
      if (!user) return self.fail(info);
      self.success(user, info);
    }

    if (self._passReqToCallback) {
      self._verify(req, parsedToken, parsedToken.payload.sub, verified);
    } else {
      self._verify(parsedToken, parsedToken.payload.sub, verified);
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
GoogleTokenStrategy.prototype._verifyGoogleToken = function(idToken, clientID, getCerts, jwtOptions, done) {
  var decodedToken = jwt.decode(idToken, {complete: true, json: true});

  if (!decodedToken) {
    return done(null, false, {message: "malformed idToken"});
  }

  var kid = decodedToken.header.kid;

  getCerts(kid, function(err, cert) {
    if (err || !cert) return done(err);

    var options = jwtOptions;

    // verify audience as well as signature
    options["audience"] = clientID;

    // need to verify iss manually, since jwt module does not support multiple
    // value checks
    var valid_issuers = [
      "accounts.google.com",
      "https://accounts.google.com"
    ];

    jwt.verify(idToken, cert, options, function(err) {
      if (err) {
        done(null, false, {message: err.message});
      } else if (decodedToken.payload &&
        valid_issuers.indexOf(decodedToken.payload.iss) == -1) {
          done(null, false, {message: "jwt issuer invalid"});
      } else {
        done(null, decodedToken);
      }
    });
  });
}

/**
 * Expose `GoogleTokenStrategy`.
 */
module.exports = GoogleTokenStrategy;

var chai = require('chai')
  , Strategy = require('..')
  , tokens = require('../test/data/id_tokens.json')
  , certs = require('../test/data/certs.json');

describe('Strategy', function() {

  var mockGetGoogleCerts = function(kid, callback) {
    callback(null, certs[kid]);
  };

  describe('handling a request with valid token and error during app verification', function() {
    var strategy = new Strategy({
        clientID: 'DUMMY_CLIENT_ID'
      },
      function(parsedToken, googleId, done) {
        return done(new Error());
      }
    );

    strategy._getGoogleCerts = mockGetGoogleCerts;

    var err;

    before(function(done) {
      chai.passport.use(strategy)
        .error(function(e) {
          err = e;
          done();
        })
        .req(function(req) {
          req.query = { id_token : tokens.valid_token.encoded };
        })
        .authenticate();
    });

    it('should error', function() {
      expect(err).to.be.an.instanceof(Error);
    });
  });

});

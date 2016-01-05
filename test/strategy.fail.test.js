var chai = require('chai')
  , Strategy = require('..')
  , tokens = require('../test/data/id_tokens.json')
  , certs = require('../test/data/certs.json');

describe('Strategy', function() {

  var mockGetGoogleCerts = function(kid, callback) {
    callback(null, certs[kid]);
  };

  describe('handling a request with no ID token', function() {
    var strategy = new Strategy({
        clientID: 'DUMMY_CLIENT_ID'
      },
      function(parsedToken, googleId, done) {
        return done(null, { id: '1234' });
      }
    );

    var failed;

    before(function(done) {
      chai.passport.use(strategy)
        .fail(function(s) {
          failed = true;
          done();
        })
        .authenticate();
    });

    it('should fail', function() {
      expect(failed).to.equal(true);
    });
  });

  describe('handling a request with incorrect token form', function() {
    var strategy = new Strategy({
        clientID: 'DUMMY_CLIENT_ID'
      },
      function(parsedToken, googleId, done) {
        return done(null, { id: '1234' });
      }
    );

    var info;

    before(function(done) {
      chai.passport.use(strategy)
        .fail(function(i) {
          info = i;
          done();
        })
        .req(function(req) {
          req.query = { id_token : 'bad_token' };
        })
        .authenticate();
    });

    it('should fail', function() {
      expect(info).to.exist;
      expect(info).to.have.property('message',
        'jwt payload is supposed to be composed of '
        + '3 base64url encoded parts separated by a \'.\'');
    });
  });

  describe('handling a request with valid token but no user found', function() {
    var strategy = new Strategy({
        clientID: 'DUMMY_CLIENT_ID'
      },
      function(parsedToken, googleId, done) {
        return done(null, false, { message: 'user not found' });
      }
    );

    strategy._getGoogleCerts = mockGetGoogleCerts;

    var info;

    before(function(done) {
      chai.passport.use(strategy)
        .fail(function(i) {
          info = i;
          done();
        })
        .req(function(req) {
          req.query = { id_token : tokens.valid_token.encoded };
        })
        .authenticate();
    });

    it('should fail', function() {
      expect(info).to.exist;
      expect(info).to.have.property('message', 'user not found');
    });
  });

});

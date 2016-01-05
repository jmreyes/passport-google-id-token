var chai = require('chai')
  , Strategy = require('..')
  , tokens = require('../test/data/id_tokens.json')
  , certs = require('../test/data/certs.json');

describe('Strategy', function() {

  var mockGetGoogleCerts = function(kid, callback) {
    callback(null, certs[kid]);
  };

  var strategy = new Strategy({
      clientID: 'DUMMY_CLIENT_ID'
    },
    function(parsedToken, googleId, done) {
      return done(null, { id: '1234' }, { scope: 'read' });
    }
  );

  function performValidTokenTest(reqFunction) {
    var user
      , info;

    before(function(done) {
      chai.passport.use(strategy)
        .success(function(u, i) {
          user = u;
          info = i;
          done();
        })
        .req(reqFunction)
        .authenticate();
    });

    it('should supply user', function() {
      expect(user).to.be.an.object;
      expect(user.id).to.equal('1234');
    });

    it('should supply info', function() {
      expect(info).to.be.an.object;
      expect(info.scope).to.equal('read');
    });
  };

  strategy._getGoogleCerts = mockGetGoogleCerts;

  describe('handling a request with id_token as query parameter', function() {
    performValidTokenTest(function(req) {
      req.query = { id_token : tokens.valid_token.encoded };
    });
  });

  describe('handling a request with access_token as query parameter', function() {
    performValidTokenTest(function(req) {
      req.query = { access_token : tokens.valid_token.encoded };
    });
  });

  describe('handling a request with id_token as body parameter', function() {
    performValidTokenTest(function(req) {
      req.body = { access_token : tokens.valid_token.encoded };
    });
  });

  describe('handling a request with access_token as body parameter', function() {
    performValidTokenTest(function(req) {
      req.body = { access_token : tokens.valid_token.encoded };
    });
  });
});

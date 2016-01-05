var chai = require('chai')
  , Strategy = require('..')
  , tokens = require('../test/data/id_tokens.json')
  , certs = require('../test/data/certs.json');

describe('Strategy', function() {

  var strategy = new Strategy({
      clientID: 'DUMMY_CLIENT_ID',
      getGoogleCerts: function(kid, callback) {
        callback(null, certs[kid]);
      }
    },
    function(parsedToken, googleId, done) {
      return done(null, { id: '1234' }, { scope: 'read' });
    }
  );

  describe('handling a request with getGoogleCerts options set', function() {
    var user
      , info;

    before(function(done) {
      chai.passport.use(strategy)
        .success(function(u, i) {
          user = u;
          info = i;
          done();
        })
        .req(function(req) {
          req.query = { id_token : tokens.valid_token.encoded };
        })
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

  });

});

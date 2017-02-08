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

  describe('handling a request with malformed token', function() {
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
    });
  });

  describe('handling a request with well-formed token', function() {
    function verify(parsedToken, googleId, done) {
      return done(null, { id: '1234' });
    }

    var strategy = new Strategy({
        clientID: 'DUMMY_CLIENT_ID'
      },
      verify
    );

    var strategyWClientIDArray = new Strategy({
        clientID: [ 
          'DUMMY_CLIENT_ID_1',
          'DUMMY_CLIENT_ID_2',
          'DUMMY_CLIENT_ID',
          'DUMMY_CLIENT_ID_3'
        ]
      },
      verify
    );

    strategy._getGoogleCerts = mockGetGoogleCerts;
    strategyWClientIDArray._getGoogleCerts = mockGetGoogleCerts;

    describe('but not signed with a Google public key', function() {
      var info;

      before(function(done) {
        chai.passport.use(strategy)
          .fail(function(i) {
            info = i;
            done();
          })
          .req(function(req) {
            req.query = { id_token : tokens.bad_signing_token.encoded };
          })
          .authenticate();
      });

      it('should fail', function() {
        expect(info).to.exist;
      });
    });

    describe('but expired', function() {
      var info;

      before(function(done) {
        chai.passport.use(strategy)
          .fail(function(i) {
            info = i;
            done();
          })
          .req(function(req) {
            req.query = { id_token : tokens.expired_token.encoded };
          })
          .authenticate();
      });

      it('should fail', function() {
        expect(info).to.exist;
      });
    });

    describe('but audience does not match clientID', function() {
      var info;

      before(function(done) {
        chai.passport.use(strategy)
          .fail(function(i) {
            info = i;
            done();
          })
          .req(function(req) {
            req.query = { id_token : tokens.bad_aud_token.encoded };
          })
          .authenticate();
      });

      it('should fail', function() {
        expect(info).to.exist;
      });
    });

    describe('but audience does not match clientID (in clientID array)', function() {
      var info;

      before(function(done) {
        chai.passport.use(strategyWClientIDArray)
          .fail(function(i) {
            info = i;
            done();
          })
          .req(function(req) {
            req.query = { id_token : tokens.bad_aud_token.encoded };
          })
          .authenticate();
      });

      it('should fail', function() {
        expect(info).to.exist;
      });
    });

    describe('but issuer does not match Google', function() {
      var info;

      before(function(done) {
        chai.passport.use(strategy)
          .fail(function(i) {
            info = i;
            done();
          })
          .req(function(req) {
            req.query = { id_token : tokens.bad_issuer_token.encoded };
          })
          .authenticate();
      });

      it('should fail', function() {
        expect(info).to.exist;
        expect(info).to.have.property('message', 'jwt issuer invalid');
      });
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

var chai = require('chai')
  , Strategy = require('..');

describe('Strategy', function() {

  var strategy = new Strategy(function(){});

  it('should be named google-id-token', function() {
    expect(strategy.name).to.equal('google-id-token');
  });

  it('should throw if constructed without a verify callback', function() {
    expect(function() {
      new Strategy();
    }).to.throw(Error, 'GoogleTokenStrategy requires a verify function');
  });

});

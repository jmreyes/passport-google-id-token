var strategy = require('..');
var lib = require('../lib/passport-google-id-token')

describe('passport-google-id-token', function() {

  it('should export Strategy constructor directly from package', function() {
    expect(strategy).to.be.a('function');
    expect(strategy).to.equal(lib);
  });

  it('should export Strategy constructor', function() {
    expect(lib).to.be.a('function');
  });

});

var chai = require('chai')
  , passport = require('chai-passport-strategy')
  , crypto = require('crypto');

chai.use(passport);

global.expect = chai.expect;

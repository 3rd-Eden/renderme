describe('renderme', function () {
  'use strict';

  var Registry = require('npm-registry')
    , npm = new Registry();

  var renderme = require('../')
    , chai = require('chai')
    , expect = chai.expect;

  //
  // Bump the timeout as we're doing external API calls during the tests.
  //
  this.timeout(10000);

  it('renders the primus markdown', function (done) {
    npm.packages.get('primus', function (err, pkg) {
      if (err) return done(err);

      renderme(pkg[0], done);
    });
  });

  it('accepts arrays', function (done) {
    npm.packages.get('load', function (err, pkg) {
      if (err) return done(err);

      renderme(pkg, done);
    });
  });
});

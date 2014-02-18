describe('renderme', function () {
  'use strict';

  var Registry = require('npmjs')
    , npm = new Registry();

  var renderme = require('../')
    , chai = require('chai')
    , expect = chai.expect;

  //
  // Bump the timeout as we're doing external API calls during the tests.
  //
  this.timeout(10000);

  it('is exported as a function', function () {
    expect(renderme).to.be.a('function');
  });

  it('renders the primus markdown', function (done) {
    npm.packages.get('primus', function (err, pkg) {
      if (err) return done(err);

      renderme(pkg, done);
    });
  });
});

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
  this.timeout(100000);

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

  describe('option.trimmed', function () {
    var readme = (new Array(10000)).join('foo bar banana');

    it('fallback to github rendering if trimmed size is reached', function (done) {
      renderme({
        readme: readme,
        readmeFilename: 'README.md'
      }, {
        trimmed: readme.length,  // Force trim limit to be reached
        github: {
          user: '3rd-Eden',
          repo: 'renderme'
        }
    }, function (err, html) {
        if (err) return done(err);

        expect(html).to.not.include('foo bar banana');
        expect(html).to.include('renderme');

        done();
      });
    });

    it('only fallback to github if we have github data', function (done) {
      renderme({
        readme: readme,
        readmeFilename: 'README.md'
      }, {
        trimmed: readme.length  // Force trim limit to be reached fail
    }, function (err, html) {
        if (err) return done(err);

        expect(html).to.include('foo bar banana');
        expect(html).to.not.include('renderme');

        done();
      });
    });

    it('only fallback to github on exact trim matches', function (done) {
      renderme({
        readme: readme,
        readmeFilename: 'README.md'
      }, {
        trimmed: readme.length - 1,  // Force trim limit to be reached fail
        github: {
          user: '3rd-Eden',
          repo: 'renderme'
        }
    }, function (err, html) {
        if (err) return done(err);

        expect(html).to.include('foo bar banana');
        expect(html).to.not.include('renderme');

        done();
      });
    });
  });
});

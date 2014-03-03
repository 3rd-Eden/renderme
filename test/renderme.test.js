describe('renderme', function () {
  'use strict';

  var Registry = require('npm.js')
    , npm = new Registry();

  var renderme = require('../')
    , chai = require('chai')
    , expect = chai.expect;

  it('is exported as a function', function () {
    expect(renderme).to.be.a('function');
  });

  describe('#url', function () {
    //
    // The URI library has been extracted from the Google Caja library that the
    // `santizer` modulule is using to parse and clean up URLs. This is the
    // exact data object
    //
    var URI = require('./uri')
      , github = { user: '3rd-Eden', repo: 'renderme' };

    it('correctly renders url fragments', function () {
      var uri = URI.parse('#readme');

      expect(renderme.url(null, uri)).to.equal('#readme');
    });

    it('forces secure gravatar URLs', function () {
      var uri = URI.parse('http://gravatar.com/avatar/21f4971707a00270b92e2ae791d5633d');

      expect(renderme.url(null, uri)).to.equal('https://secure.gravatar.com/avatar/21f4971707a00270b92e2ae791d5633d');
    });

    it('doesnt strip querystrings from URLs', function () {
      var uri = URI.parse('https://travis-ci.org/primus/primus.png?branch=master');

      expect(renderme.url(null, uri)).to.include('branch=master');
    });

    it('supports mailto:', function () {
      var uri = URI.parse('mailto:foo@bar.com');

      expect(renderme.url(null, uri)).to.equal('mailto:foo@bar.com');
    });

    it('tranforms relative URLS to github prefixed URLs when repo info is supplied', function () {
      var uri = URI.parse('/LICENSE.md');

      expect(renderme.url(github, uri)).to.equal('https://raw.github.com/3rd-Eden/renderme/blob/master/LICENSE.md');
    });
  });
});

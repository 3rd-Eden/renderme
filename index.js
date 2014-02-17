'use strict';

var pygmentize = require('pygmentize-bundled')
  , debug = require('debug')('renderme')
  , parse = require('url').parse
  , GitHulk = require('githulk')
  , marked = require('marked');

/**
 * Regular Expression for detecting markdown support based on the file
 * extension.
 *
 * @type {RegExp}
 * @private
 */
var markdown = /md|mkdn?|mdwn|mdown|markdown|litcoffee/i;

/**
 * Render a README file correctly so it can be presented on a page. In order to
 * do so it needs to have the README contents, file extension and possible
 * github URL so it can render README without markdown support.
 *
 * @param {Object} data content/extension combination.
 * @param {String} github Github location.
 * @param {Function} fn The callback
 * @api public
 */
function renderme(data, github, fn) {
  if (!markdown.test(data.extension)) return renderme.github(github, fn);

  marked(data.content, {
    highlight: renderme.highlight,    // Use pygment for syntax highlighting
    gfm: true,                        // Github Flavoured Markdown.
    tables: true                      // Github Flavoured Tables.
  }, function render(err, data) {
    if (err) return renderme.github(github, fn);

    fn(err, data);
  });
}

/**
 * Render a code block using pygmentize.
 *
 * @param {String} code The code block.
 * @param {String} lang The programming language.
 * @param {function} fn The callback.
 * @api private
 */
renderme.highlight = function highlight(code, lang, fn) {
  pygmentize({ lang: lang, format: 'html' }, code, function highlighted(err, data) {
    if (err) return fn(err);

    fn(err, data.toString());
  });
};

/**
 * Parse the README through the Github API.
 *
 * @param {String} url
 * @param {Function} fn The callback.
 * @api private
 */
renderme.github = function github(url, fn) {
  if (!url) return fn();

  debug('rendering readme for %s through the github api', url);
  url = parse(url);

  var githulk = new GitHulk({
    authorization: url.auth
    ? 'Basic '+ (new Buffer(url.auth)).toString('base64')
    : undefined
  });

  githulk.repository.readme(url.pathname, fn);
};

//
// Expose the module.
//
module.exports = renderme;

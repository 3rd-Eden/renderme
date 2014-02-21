'use strict';

var pygmentize = require('pygmentize-bundled')
  , debug = require('debug')('renderme')
  , sanitizer = require('sanitizer')
  , GitHulk = require('githulk')
  , marked = require('marked')
  , url = require('url');

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
 * @param {Object} data Data structure that contains a `readme`.
 * @param {Function} fn The callback
 * @api public
 */
function renderme(data, fn) {
  data = Array.isArray(data) ? data : data;

  render(data, function rendered(err, html) {
    if (!html && data.readme) {
      html = data.readme || '';
    }

    //
    // Make sure we return a clean output.
    //
    fn(err, sanitizer.sanitize(html, renderme.url));
  });
}

/**
 * Figure out how we should render the given data structure.
 *
 * @param {Object} data Data structure that contains a `readme`.
 * @param {Function} fn The callback
 * @api private
 */
function render(data, fn) {
  var github = renderme.githulk.project(data)
    , extension = data.readmeFilename
    , readme = data.readme;

  //
  // We don't support this extension, defer rendering to the Github API which
  // uses their Markup parser to render all supported README extensions.
  //
  if (!markdown.test(extension)) {
    if (!github) {
      debug('unable to reliably detect data as markdown, no github info, giving up');
      return fn();
    }

    debug('unable to reliably detect data as markdown, deferring to github');
    return renderme.githulk.repository.readme(github.user +'/'+ github.repo, fn);
  }

  renderme.markdown(readme, function rendered(err, readme) {
    if (!err) return fn(err, readme);

    if (!github) {
      debug('failed to parse content as markdown, no github info, giving up');
      return fn();
    }

    //
    // We failed to render the markdown, attempt github.
    //
    debug('failed to parse content as markdown, deferring to github');
    renderme.githulk.repository.readme(github.user +'/'+ github.repo, fn);
  });
}

/**
 * Handle the URL's that the sanitizer finds.
 *
 * @param {Object} parsed URL object.
 * @returns {String}
 * @api private
 */
renderme.url = function policy(parsed) {
  //
  // These are hashes that jump right to the content somewhere.
  //
  if (!parsed.domain_ && parsed.fragment_) return '#'+ parsed.fragment_;

  parsed = url.parse(url.format({
    host: parsed.domain_ + (parsed.port_ ? ':'+ parsed.port_ : ''),
    search: parsed.query_ ? '?'+ parsed.query_ : '',
    protocol: parsed.scheme_ +':',
    pathname: parsed.path_,
    hash: parsed.fragment_
  }));

  if (!parsed) return null;

  //
  // Force secure URLs for gravatar.
  //
  if (
       parsed.protocol === 'http:'
    && (parsed.hostname && parsed.hostname.match(/gravatar.com$/))
  ) {
    parsed.hostname = parsed.host = 'secure.gravatar.com';
    parsed.protocol = 'https:';
  }

  return url.format(parsed);
};

/**
 * Render markdown files.
 *
 * @param {String} content The Markdown content that we should render.
 * @param {Function} fn The callback
 * @api private
 */
renderme.markdown = function markdown(content, fn) {
  var snippet = 0;

  /**
   * Render a code block using pygmentize.
   *
   * @param {String} code The code block.
   * @param {String} lang The programming language.
   * @param {function} fn The callback.
   * @api private
   */
  function highlight(code, lang, fn) {
    pygmentize({
        lang: lang || 'text'                    // The programming language.
      , format: 'html'                          // Output format.
      , options: {
          linenos: 'table'                      // Add line numbers.
        , lineanchors: 'snippet-'+ (++snippet)  // Prefix is based on the amount of snippets.
        , anchorlinenos: true                   // Wrap line numbers in <a> elements.
        , cssclass: 'renderme'                  // Use our CSS class.
      }
    }, code, function highlighted(err, data) {
      if (err) {
        if (lang !== 'text') {
          debug('failed to highlight code snippet in %s -- attempting in text', lang);
          return highlight(code, 'text', fn);
        }

        debug('failed to highlight code snippet in %s', lang);
        return fn(err);
      }

      fn(err, data.toString());
    });
  }

  marked(content, {
    highlight: highlight,             // Use pygmentze for syntax highlighting
    gfm: true,                        // Github Flavoured Markdown.
    tables: true,                     // Github Flavoured Tables.
    renderer: renderme.renderer       // Custom renderer.
  }, fn);
};

/**
 * A custom marked renderer so we can attempt to render the markup in exactly
 * the same
 *
 * @type {marked.Renderer}
 * @private
 */
renderme.renderer = new marked.Renderer();

//
// Override the code renderer as our markup is already created by pygments.
//
renderme.renderer.code = function render(code, lang, escape) {
  return code; // @TODO what about failed highlighting?
};

/**
 * Create a GitHulk instance that we use to query the Github API.
 *
 * @type {GitHulk}
 * @private
 */
renderme.githulk = new GitHulk();
renderme.GitHulk = GitHulk;

//
// Expose the module.
//
module.exports = renderme;

'use strict';

var pygmentize = require('pygmentize-bundled')
  , debug = require('debug')('renderme')
  , sanitizer = require('sanitizer')
  , GitHulk = require('githulk')
  , marked = require('marked');

/**
 * Render a README file correctly so it can be presented on a page. In order to
 * do so it needs to have the README contents, file extension and possible
 * github URL so it can render README without markdown support.
 *
 * Options:
 *
 * - githulk: A pre-authorized GitHulk instance.
 * - github:  A object with `user` and `repo` information, if none is supplied we
 *            we attempt to parse it out of the supplied data object.
 * - trimmed: Assume the readme is trimmed when it has this size and we should
 *            attempt to fallback to GitHub data first. Defaults to 64k.
 *
 * @param {Object} data Data structure that contains a `readme`.
 * @param {Object} options Optional options.
 * @param {Function} fn The callback
 * @api public
 */
function renderme(data, options, fn) {
  data = Array.isArray(data) ? data : data;

  if ('function' === typeof options) {
    fn = options;
    options = {};
  }

  options.trimmed = options.trimmed || 64 * 1024;
  options.githulk = options.githulk || renderme.githulk;
  options.github = options.github || options.githulk.project(data);

  render(data, options, function rendered(err, html) {
    if (!html && data.readme) {
      html = data.readme;
    }

    //
    // Just ignore the error, it was a 404, the README file on github could not
    // be located.
    //
    if (err && err.statusCode === 404) err = null;

    //
    // Make sure we return a clean output.
    //
    fn(err, sanitizer.sanitize(html || '', url.bind(null, options.github)));
  });
}

/**
 * Figure out how we should render the given data structure.
 *
 * @param {Object} data Data structure that contains a `readme`.
 * @param {Object} options Optional options.
 * @param {Function} fn The callback
 * @api private
 */
function render(data, options, fn) {
  var readme = (data.readme || '').toString('utf-8')
    , extension = data.readmeFilename
    , githulk = options.githulk
    , github = options.github;

  //
  // 1. We don't support this extension, defer rendering to the Github API which
  //    uses their Markup parser to render all supported README extensions.
  //
  if (!detect(readme, extension)) {
    if (!github) {
      debug('unable to reliably detect data as markdown, no github info, giving up');
      return fn();
    }

    debug('unable to reliably detect data as markdown, deferring to github');
    return githulk.repository.readme(github.user +'/'+ github.repo, fn);
  }

  //
  // 2. We assume that the README file is trimmed so we should attempt to get
  //    a README from GitHub first.
  //
  if (readme.length === options.trimmed && github) {
    return githulk.repository.readme(github.user +'/'+ github.repo, function render(err, html) {
      if (!err && html) return fn(err, html);

      markdown(readme, fn);
    });
  }

  //
  // 3. We support the parsing of Markdown content locally.
  //
  markdown(readme, function rendered(err, readme) {
    if (!err) return fn(err, readme);

    if (!github) {
      debug('failed to parse content as markdown, no github info, giving up');
      return fn();
    }

    //
    // We failed to render the markdown, attempt github.
    //
    debug('failed to parse content as markdown, deferring to github');
    githulk.repository.readme(github.user +'/'+ github.repo, fn);
  });
}

/**
 * Handle the URL's that the sanitizer finds.
 *
 * @param {Object} github Possible Github URL
 * @param {Object} uri URL object.
 * @returns {String}
 * @api private
 */
function url(github, uri) {
  //
  // Force secure URLs for gravatar.
  //
  if ((uri.getDomain() || '').match(/gravatar.com$/)) {
    uri.setDomain('secure.gravatar.com');
    uri.setScheme('https');
  }

  //
  // No parsed domain, but we do have github information so assume that we want
  // to display an URL to github instead of null:null URL.
  //
  if (!uri.hasDomain() && github && !uri.hasFragment()) {
    uri.setDomain('raw.github.com');
    uri.setScheme('https');
    uri.setPath('/'+ github.user +'/'+ github.repo +'/blob/master'+ uri.getPath());
  }

  //
  // This URL is a relative URL and should be considered harmful as it could
  // trigger /sign-out or what routes of the page that renders this content.
  //
  if (!uri.hasDomain() && !uri.hasScheme() && uri.hasPath()) return null;

  return uri.toString();
}

/**
 * Attempt to detect markdown.
 *
 * @param {String} content The possible markdown content
 * @param {String} extension File extension.
 * @returns {Boolean}
 * @api private
 */
function detect(content, extension) {
  //
  // All possible extensions that are used to detect markdown.
  //
  if (extension && /md|mkdn?|mdwn|mdown|markdown|litcoffee/i.test(extension)) {
    return true;
  }

  if (!content) return false;

  var match;

  if (
       // Multiple back ticks indicate code blocks
       (match = content.match(/`/)) && match.length >= 2

       // Multiple dash/stars/plus indicate a bullet list
    || (match = content.match(/^[\*\+\-] /mg)) && match.length >= 2

       // Math test
    || /\$([^ \t\n\$]([^\$]*[^ \t\n\$])?)\$/.test(content)

       // Emphasis.
    || /__([\s\S]+?)__(?!_)|\*\*([\s\S]+?)\*\*(?!\*)/.test(content)

       // Header styles
    || /(^#{1,6}[^#])|(^[\-\=]{5,})/m.test(content)

       // Link patterns []() []: etc.
    || /\]\(|\]\[|\]\:/.test(content)
  ) return true;

  return false;
}

/**
 * Render markdown files.
 *
 * @param {String} content The Markdown content that we should render.
 * @param {Function} fn The callback
 * @api private
 */
function markdown(content, fn) {
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
    renderer: renderer                // Custom renderer.
  }, fn);
}

/**
 * A custom marked renderer so we can attempt to render the markup in exactly
 * the same
 *
 * @type {marked.Renderer}
 * @private
 */
var renderer = new marked.Renderer();

//
// Override the code renderer as our markup is already created by pygments.
//
renderer.code = function render(code, lang, escape) {
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
// Expose some of our privates
//
renderme.markdown = markdown;
renderme.render = render;
renderme.detect = detect;
renderme.url = url;

//
// Expose the module.
//
module.exports = renderme;

# Renderme

[![Build Status](https://travis-ci.org/3rd-Eden/renderme.png?branch=master)](https://travis-ci.org/3rd-Eden/renderme)

Renderme is simple module with one clear goal: *Render README files*. It tries
to render the files locally using the `marked` module in the same way as Github
would have rendered the files. Some details:

- Sanitizes the outputted HTML using Google's caja parser.
- Highlights code snippets using `pygments`
- Falls back to the Github API for rendering when repository information has
  been provided and we're unable to detect the content as Markdown.

But there are some small but intentional differences when we are rendering the
README files locally. We add line number information to all the code snippets so
it's more readable and people can actually jump to snippets which are on the
README files. These code snippets are prefixed with a different CSS class then
the snippets that Github uses, we use `renderme` as a prefix for the code so you
choose how you want to style them your self.

## Installation

This module is released in the npm registry.

```
npm install --save renderme
```

## Usage

This module exposes a single function as primary interface. So you can simply
require the `renderme` module and that would be all you need.

```js
'use strict';

var renderme = require('renderme');
```

The `renderme` variable now contains a function. This function accepts the
following arguments.

- `data` An object contains:
  - `readme`: The actual contents of a README file
  - `readmeFilename`: An optional filename of the README which is used for
    markdown detection.
- `options` An *optional* object which allows you to configure:
  - `github` A pre-parsed object which contains a `user` and `repo` property
    with the relevant Github repository information
  - `githulk` A pre-configured [githulk] instance which will be used all
    fallback when the given README file isn't a valid markdown file.
  - `trimmed` The amount of chars we should assume that the supplied README data
    is trimmed and we need to fallback to GitHub for rendering instead.
- `fn` The completion callback, which follows the error first callback pattern.

As you might have noticed the `data` structure follows the same internal
structure as the packages in The npm Registry. Which makes it really easy to
render README files of modules which is also it's primary use case.

Given all this knowledge, rendering a README would be as simple as:

```js
renderme({
  readme: require('fs').readFileSync(__dirname +'/README.md', 'utf-8'),
  readmeFilename: 'README.md'
}, function rendered(err, html) {
  console.log(err, html);
});
```

## Debugging

This module make use of the `debug` module for logging debug information. To
display this information in your terminal you need to set the `DEBUG` env varible
to `renderme*`:

```
DEBUG=renderme* node <entryfile.js>
```

## License

MIT

[githulk]: https://github.com/3rd-Eden/githulk

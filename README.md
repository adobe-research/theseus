Theseus
=======

Theseus is a new type of JavaScript debugger for Node.js, Chrome, and both simultaneously. It is an extension for the [Brackets](https://github.com/adobe/brackets) code editor.

Theseus is part of a collaboration between the [User Interface Design Group at MIT CSAIL](http://groups.csail.mit.edu/uid/) and [Adobe Research](http://research.adobe.com/). Though it's a research project, I'm doing the best I can engineering-wise and I'm responsive to bug reports and feature requests. Patches welcome!

![Screenshot of Theseus](https://raw.github.com/adobe-research/theseus/gh-pages/screenshot.png)

Features
--------

**Real-time code coverage:** Theseus shows the number of times that every function has been called next to its definition. Functions that have never been called are also given a gray background. You can watch the code light up as you interact with the web page.

![Screenshot of call counts and dead code coloring](https://raw.github.com/adobe-research/theseus/gh-pages/call-counts.png)

**Retroactive inspection:** Click a call count to see the values of parameters, return values, and any exceptions that have been thrown from that function. It's like adding `console.log` without having to save and reload.

![Screenshot of a single function being logged](https://raw.github.com/adobe-research/theseus/gh-pages/log1.png)

**Asynchronous call tree:** If you click multiple call counts, all invocations of those functions are shown in a tree. When callback functions are called, they show up in the tree under the function that created them, regardless of whether they were called immediately or many ticks later.

![Screenshot of multiple functions being logged](https://raw.github.com/adobe-research/theseus/gh-pages/log2.png)

Install
-------

1. Install [Brackets](http://download.brackets.io/) Sprint 28 or later.
2. In Brackets, click the menu item *File > Extension Manager...*
3. Go to the "Available" tab of the dialog that appears.
4. Type "Theseus" in the search box.
5. Click the "Install" button in the search result for Theseus.

For Node.js support, also run `npm install -g node-theseus` in a terminal to get the command-line helper. Theseus **requires** node-theseus 0.2.x.

Usage: Debug JavaScript running in Node.js
------------------------------------------

![Brackets + Node.js](https://raw.github.com/adobe-research/theseus/gh-pages/theseus-node.png)

Start your program by running `node-theseus app.js` (instead of `node app.js` as you normally would). Theseus will automatically connect to that process.

(You install `node-theseus` with `npm install -g node-theseus`)

![node-theseus download statistics](https://nodei.co/npm-dl/node-theseus.png)

Usage: Debug JavaScript running in Chrome
-----------------------------------------

![Brackets + Chrome](https://raw.github.com/adobe-research/theseus/gh-pages/theseus-chrome.png)

Open the File menu and put Theseus into the mode for static HTML files:

![Brackets + Chrome](https://raw.github.com/adobe-research/theseus/gh-pages/theseus-mode-static.png)

Then open an HTML file and start Brackets' Live Development mode by clicking the lightning bolt in the top right corner of the window:

![Brackets' lightning bolt](https://raw.github.com/adobe-research/theseus/gh-pages/lightning-bolt.png)

Your page will open in Chrome.

A Handful of Technical Details
------------------------------

Node.js: Files with paths containing `node_modules` will not be instrumented.

Chrome: Files requested with the URL parameter `theseus=no` (for example, `<script src="script.js?theseus=no" />`) will not be instrumented.

Any file containing the (exact) string `/*theseus instrument: false */` will not be instrumented by Theseus. You can also use the `--theseus-exclude=filename` option with `node-theseus` (which also has [some other options that you might find helpful](https://github.com/adobe-research/node-theseus)).

Bugs
----

First, there's [a whole wiki page about troubleshooting Theseus](https://github.com/adobe-research/theseus/wiki/Troubleshooting-Theseus). Check it out!

If you come across a bug, [submit an issue on GitHub](https://github.com/adobe-research/theseus/issues). Include a list of steps we can follow to reproduce the problem, a description of what you saw that seemed broken, and a description of what you expected to see.

Mailing List
------------

Announcements and discussion: https://groups.google.com/d/forum/theseus-discuss

Contributing/Extending
----------------------

Theseus is a constellation of Node.js modules working together. For contributors, there's [a detailed description of how Theseus works](https://github.com/adobe-research/theseus/wiki/Theseus-Development), but below is a list of all the modules that you can use to create similar (or dissimilar!) projects.

Patches to any of these projects are welcome. I'll even help you figure out how to do something that doesn't make sense to merge but still deserves to exist.

### Theseus, the Brackets extension

* [adobe-research/theseus](https://github.com/adobe-research/theseus): the Brackets extension and its UI (you are here)
* [adobe-research/node-theseus](https://github.com/adobe-research/node-theseus): the command-line runner for debugging Node.js programs with Theseus

### JavaScript trace collection

* [adobe-research/fondue](https://github.com/adobe-research/fondue): JavaScript instrumentation library. Rewrites JavaScript code so that when it runs, it saves a trace of everything that happened. Theseus uses fondue's API over WebSockets or Brackets' Live Development connection, depending on the context.
* [alltom/fondue-middleware](https://github.com/alltom/fondue-middleware): a connect middleware that processes all JavaScript in .js and .html files with fondue

### JavaScript source rewriting

* [alltom/esprima-selector](https://github.com/alltom/esprima-selector): ask whether a particular esprima node matches a CSS-like selector.
* [alltom/falafel-helpers](https://github.com/alltom/falafel-helpers): decorate falafel nodes with some fancy helpers
* [alltom/node-falafel-map](https://github.com/alltom/node-falafel-map): a fork of [substack's JavaScript-rewriting library](https://github.com/substack/node-falafel) that generates source maps

### Prototypes

* [alltom/fondue-profile](https://github.com/alltom/fondue-profile): a really simple instrumenting profiler built with fondue

## Contributors

* @alltom. Primary developer.
* @nhynes. Automatic upgrades, bug-fixes.
* @MarcelGerber. Made the UI translatable and added German translation.
* @joelrbrandt. Added the menu item for enabling and disabling Theseus.
* @larz0. Made Theseus match Brackets' visual style.
* @jasonsanjose. Sprint 30 compatibility, Edge Code compatibility.
* @benchuk. Redirect requests to files in `/public` to root.

Also thanks to the whole Brackets team, and to @alltom's mentors, @rcmiller and @joelrbrandt!


License
-------

Theseus is released under the [MIT license](http://opensource.org/licenses/MIT).

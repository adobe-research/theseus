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

License
-------

Theseus is released under the [MIT license](http://opensource.org/licenses/MIT).

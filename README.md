Theseus
=======

Theseus is a new type of JavaScript debugger that helps you debug asynchronous code. It is an extension for the [Brackets](https://github.com/adobe/brackets) code editor.

Theseus is part of a collaboration between the [User Interface Design Group at MIT CSAIL](http://groups.csail.mit.edu/uid/) and [Adobe Research](http://research.adobe.com/).

![Screenshot of Theseus](https://raw.github.com/adobe-research/theseus/gh-pages/screenshot.png)

Features
--------

**Real-time code coverage:** Theseus shows the number of times that every function has been called next to its definition. Functions that have never been called are also given a gray background. You can watch the code execute as you interact with the web page.

![Screenshot of call counts and dead code coloring](https://raw.github.com/adobe-research/theseus/gh-pages/call-counts.png)

**Retroactive inspection:** Click a call count to see the values of parameters, return values, and any exceptions that have been thrown from that function. It's like adding `console.log` without having to save and reload.

![Screenshot of a single function being logged](https://raw.github.com/adobe-research/theseus/gh-pages/log1.png)

**Asynchronous call tree:** If you click multiple call counts, all invocations of those functions are shown in a tree. When callback functions are called, they show up in the tree under the function that created them, regardless of whether they were called immediately or many ticks later.

![Screenshot of multiple functions being logged](https://raw.github.com/adobe-research/theseus/gh-pages/log2.png)

Download & Install
------------------

[![Download Theseus](https://raw.github.com/adobe-research/theseus/gh-pages/download-button.png)](https://s3.amazonaws.com/alltom/theseus/theseus-0.2.6.zip)  
Current version: 0.2.6

Unzip, then copy the `brackets-theseus` directory into your extensions folder (*Help > Show Extensions Folder* in Brackets).

For Node.js support, also run: `npm install -g node-theseus` to get the command-line helper.

Usage: Debugging Node.js
------------------------

![Brackets + Node.js](https://raw.github.com/adobe-research/theseus/gh-pages/theseus-node.png)

Start your program with `node-theseus app.js` (instead of `node app.js` as you normally would). Theseus will automatically connect to that process.

(You can install `node-theseus` with `npm install -g node-theseus`)

Usage: Debugging JavaScript in Chrome
-------------------------------------

![Brackets + Chrome](https://raw.github.com/adobe-research/theseus/gh-pages/theseus-chrome.png)

Open the File menu and put Theseus into the mode for static HTML files:

![Brackets + Chrome](https://raw.github.com/adobe-research/theseus/gh-pages/theseus-mode-static.png)

Then open an HTML file and start Brackets' Live Development mode by clicking the lightning bolt in the top right corner of the window:

![Brackets' lightning bolt](https://raw.github.com/adobe-research/theseus/gh-pages/lightning-bolt.png)

Your page will open in Chrome.

License
-------

Theseus is MIT licensed.

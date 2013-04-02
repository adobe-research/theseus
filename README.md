Theseus
=======

Theseus is a new type of JavaScript debugger that makes it far easier to debug asynchronous code. Theseus is an extension for the code editor [Brackets](https://github.com/adobe/brackets).

Theseus is part of a collaboration between the [User Interface Design Group at MIT CSAIL](http://groups.csail.mit.edu/uid/) and [Adobe Research](http://research.adobe.com/).

![Screenshot of Theseus](https://raw.github.com/adobe-research/theseus/gh-pages/screenshot.png)

Download & Install
------------------

Theseus works with Brackets (Sprint 21) on OS X. It has not been tested with Sprint 22. It should *almost* work on Windows, but this has not been tested.

Download version 0.2.3: https://s3.amazonaws.com/alltom/theseus/theseus-0.2.3.zip (1.6 MB)

Copy the `brackets-theseus` directory into your extensions folder (`Help > Show Extensions Folder` in Brackets).

Using with Static HTML
----------------------

1. Open an HTML file in Brackets.
2. Switch Theseus to Static mode by clicking the menu item `File > Mode: Static`
3. Click the lightning bolt in the upper-right hand corner of Brackets to start Live Development mode. Your page will open in Chrome.

Theseus will show call counts in the gutter next to every function definition in the HTML file and any included `.js` files. Click on one or more of them to show a log of all calls to those functions with their arguments and return values.

Using with Node.js
------------------

1. Open your node project directory in Brackets.
2. Install `node-theseus` with `npm install -g node-theseus`
3. Start your Node program with `node-theseus app.js` (instead of `node app.js` as you normally would)

Theseus will show call counts in the gutter next to every function definition in all JavaScript files in your project (even files in the `node_modules` sub-directory). Click on one or more of them to show a log of all calls to those functions with their arguments and return values.

Using with JavaScript on a Custom Web Server (including Node.js and Rails)
--------------------------------------------------------------------------

Theseus lets you inspect the JavaScript running on a web page served by a web server as well. If that web server happens to be written with Node.js, you'll be able to inspect the client and server simultaneously if you also follow the steps in the previous section.

**Warning:** Theseus is experimental software, but **this feature in particular is not well-supported and relies on at least one bug in Brackets in order to work.**

To try anyway:

1. Start your web server on port 3000. Rails should be started in development mode so that JavaScript assets will not be compressed into a single file.
2. Switch Theseus to Proxy mode by clicking the menu item `File > Mode: Proxy`
3. Open any file in the project directory with Brackets.
4. Click the lightning bolt in the upper-right hand corner of the Brackets window to start Live Development mode.
5. Change the URL in the Chrome tab that opens to the page you would like to debug. Do not change the host or port.

**Note:** The mapping between files served from your web server and files in Brackets can be difficult to figure out. (See the relevant issue in Brackets' tracker: https://github.com/adobe/brackets/issues/2103) However, Theseus will try to make educated guesses. In particular, it tries to recognize the `/app/assets/` and `/public/` directory structures used by Rails and some Node.js projects.

Installing From Source
----------------------

The `build.sh` script clones the current `master` branch, uses `npm` to install its dependencies, then creates a zip file in the `build` directory.

License
-------

Theseus is MIT licensed.

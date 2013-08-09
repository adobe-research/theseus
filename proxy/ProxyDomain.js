/*
 * Copyright (c) 2012 Massachusetts Institute of Technology, Adobe Systems
 * Incorporated, and other contributors. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, node: true */
/*global */

(function () {
    "use strict";

    var connect          = require('connect'),
        crypto           = require('crypto'),
        fondue           = require('fondue'),
        fs               = require('fs'),
        http             = require('http'),
        proxyMiddleware  = require('./middleware-proxy'),
        staticMiddleware = require('./middleware-static'),
        url              = require('url');

    /**
     * When Chrome has a css stylesheet replaced over live development,
     * it re-checks any image urls in the new css stylesheet. If it has
     * to hit the server to check them, this is asynchronous, so it causes
     * two re-layouts of the webpage, which causes flickering. By setting
     * a max age of five seconds, Chrome won't bother to hit the server
     * on each keystroke. So, flickers will happen at most once every five
     * seconds.
     *
     * @const
     * @type {number}
     */
    var STATIC_CACHE_MAX_AGE = 5000; // 5 seconds

    /**
     * @private
     * @type {Object.<string, http.Server>}
     * A map from root paths to server instances.
     */
    var _servers = {};

    /**
     * @private
     * @type {DomainManager}
     * The DomainManager passed in at init.
     */
    var _domainManager = null;

    // MD5 -> instrumented file
    var _instrumentedFileCache = {};

    function _instrument(src, options) {
        var charPerLine = src.length / src.split("\n").length;
        if (charPerLine > 300) {
            console.log(options.path + " probably minified (" + charPerLine + " char/line); skipping");
            return src;
        }

        options = (options || {});
        var md5 = crypto.createHash('md5');
        md5.update(options.path + '||' + options.include_prefix + '||' + src);
        var digest = md5.digest('hex');
        if (digest in _instrumentedFileCache) {
            return _instrumentedFileCache[digest];
        } else {
            return _instrumentedFileCache[digest] = fondue.instrument.apply(fondue, arguments).toString();
        }
    }

    function _makeAccept(pathExcludeRegexp) {
        return function (req, contentType) {
            if (pathExcludeRegexp && pathExcludeRegexp.test(req.url)) {
                return false;
            }

            var useTheseus = url.parse(req.url, true).query.theseus;
            if (useTheseus === 'no' || useTheseus === 'false' || useTheseus === '0') {
                return false;
            }
            return ['application/javascript', 'text/html'].indexOf(contentType) !== -1;
        };
    }

    function _filter(req, realPath, contentType, content) {
        var path = realPath || unescape(url.parse(req.url, true).pathname.slice(1));
        if (path === "config/index.html") {
            return "<META http-equiv=\"refresh\" content=\"0;URL=/\">";
        } else if (contentType == 'application/javascript') {
            return _instrument(content, { path: path, include_prefix: false });
        } else if (contentType == 'text/html') {
            var scriptLocs = [];
            var scriptBeginRegexp = /<\s*script[^>]*>/ig;
            var scriptEndRegexp = /<\s*\/\s*script/i;
            var lastScriptEnd = 0;
            var match;
            while (match = scriptBeginRegexp.exec(content)) {
                var scriptBegin = match.index + match[0].length;
                if (scriptBegin < lastScriptEnd) {
                    continue;
                }
                var endMatch = scriptEndRegexp.exec(content.slice(scriptBegin));
                if (endMatch) {
                    var scriptEnd = scriptBegin + endMatch.index;
                    scriptLocs.push({ start: scriptBegin, end: scriptEnd });
                    lastScriptEnd = scriptEnd;
                }
            }

            if (scriptLocs.length === 0) {
                return content;
            }

            // process the scripts in reverse order
            for (var i = scriptLocs.length - 1; i >= 0; i--) {
                var loc = scriptLocs[i];
                var script = content.slice(loc.start, loc.end);
                var prefix = content.slice(0, loc.start).replace(/[^\n]/g, " "); // padding it out so line numbers make sense
                content = content.slice(0, loc.start) + _instrument(prefix + script, { path: path, include_prefix: false }) + content.slice(loc.end);
            }

            var doctype = '';
            var doctypeMatch = /^(<!doctype[^\n]+\n)/i.exec(content);
            if (doctypeMatch) {
                doctype = doctypeMatch[1];
                content = content.slice(doctypeMatch[1].length);
            }

            content = doctype + '<script>\n' + fondue.instrumentationPrefix() + '\n</script>\n' + content;
            return content;
        }
    }

    /**
     * @private
     * Helper function to create a new server.
     * @param {string} path The absolute path that should be the document root
     * @param {string} modeName The name of the mode to use ('static' or 'proxy')
     * @param {RegExp} pathExcludeRegexp Exclusion regexp for paths
     * @param {function(?string, ?httpServer)} cb Callback function that receives
     *    an error (or null if there was no error) and the server (or null if there
     *    was an error).
     */
    function _createServer(path, modeName, pathExcludeRegexp, createCompleteCallback) {
        function requestRoot(server, cb) {
            var address = server.address();

            // Request the root file from the project in order to ensure that the
            // server is actually initialized. If we don't do this, it seems like
            // connect takes time to warm up the server.
            var req = http.get(
                {host: address.address, port: address.port},
                function (res) {
                    cb(null, res);
                }
            );
            req.on("error", function (err) {
                cb(err, null);
            });
        }

        var middlewares = { "static" : staticMiddleware, "proxy" : proxyMiddleware };
        var middleware = middlewares[modeName];
        console.log("making server for " + path + " (" + modeName + ")");

        if (!middleware) {
            createCompleteCallback("Could not get middleware for mode '" + modeName + "'", null);
            return;
        }

        var app = connect().use(middleware(path, {
            accept: _makeAccept(pathExcludeRegexp),
            filter: _filter,
            maxAge: STATIC_CACHE_MAX_AGE
        }));

        var server = http.createServer(app);
        server.listen(0, "127.0.0.1", function () {
            requestRoot(
                server,
                function (err, res) {
                    if (err) {
                        createCompleteCallback("Could not GET root after launching server", null);
                    } else {
                        createCompleteCallback(null, server);
                    }
                }
            );
        });
    }

    var PATH_KEY_PREFIX = "LiveDev_";

    /**
     * @private
     * Handler function for the theseusServer.getServer command. If a server
     * already exists for the given path, returns that, otherwise starts a new
     * one.
     * @param {string} path The absolute path that should be the document root
     * @param {string} modeName The name of the mode ('static' or 'proxy')
     * @param {string} pathExcludeRegexp Exclusion regexp (empty for no exclusions)
     * @param {function(?string, ?{address: string, family: string,
     *    port: number})} cb Callback that should receive the address information
     *    for the server. First argument is the error string (or null if no error),
     *    second argument is the address object (or null if there was an error).
     *    The "family" property of the address indicates whether the address is,
     *    for example, IPv4, IPv6, or a UNIX socket.
     */
    function _cmdGetServer(path, modeName, pathExcludeRegexp, cb) {
        // Make sure the key doesn't conflict with some built-in property of Object.
        var pathKey = PATH_KEY_PREFIX + "-" + path + "-" + modeName;
        if (_servers[pathKey]) {
            cb(null, _servers[pathKey].address());
        } else {
            _createServer(path, modeName, pathExcludeRegexp === "" ? null : new RegExp(pathExcludeRegexp), function (err, server) {
                if (err) {
                    cb(err, null);
                } else {
                    _servers[pathKey] = server;
                    cb(null, server.address());
                }
            });
        }
    }

    /**
     * @private
     * Handler function for the theseusServer.closeServer command. If a server
     * exists for the given path, closes it, otherwise does nothing. Note that
     * this function doesn't wait for the actual socket to close, since the
     * server will actually wait for all client connections to close (which can
     * be awhile); but once it returns, you're guaranteed to get a different
     * server the next time you call getServer() on the same path.
     *
     * @param {string} path The absolute path whose server we should close.
     * @return {boolean} true if there was a server for that path, false otherwise
     */
    function _cmdCloseServer(path, cba) {
        var pathKey = PATH_KEY_PREFIX + path;
        if (_servers[pathKey]) {
            var serverToClose = _servers[pathKey];
            delete _servers[pathKey];
            serverToClose.close();
            return true;
        }
        return false;
    }

    /**
     * Initializes the theseusServer domain with its commands.
     * @param {DomainManager} DomainManager The DomainManager for the server
     */
    function init(DomainManager) {
        _domainManager = DomainManager;
        if (!_domainManager.hasDomain("theseusServer")) {
            _domainManager.registerDomain("theseusServer", {major: 0, minor: 1});
        }
        _domainManager.registerCommand(
            "theseusServer",
            "getServer",
            _cmdGetServer,
            true,
            "Starts or returns an existing Theseus server for the given path.",
            [
                {
                    name: "path",
                    type: "string",
                    description: "absolute filesystem path for root of server"
                },
                {
                    name: "modeName",
                    type: "string",
                    description: "name of the mode ('static' or 'proxy')"
                },
                {
                    name: "pathExcludeRegexp",
                    type: "string",
                    description: "regexp against which paths will be matched and not instrumented if they match"
                }
            ],
            [{
                name: "address",
                type: "{address: string, family: string, port: number}",
                description: "hostname (stored in 'address' parameter), port, and socket type (stored in 'family' parameter) for the server. Currently, 'family' will always be 'IPv4'."
            }]
        );
        _domainManager.registerCommand(
            "theseusServer",
            "closeServer",
            _cmdCloseServer,
            false,
            "Closes the Theseus server for the given path.",
            [{
                name: "path",
                type: "string",
                description: "absolute filesystem path for root of server"
            }],
            [{
                name: "result",
                type: "boolean",
                description: "indicates whether a server was found for the specific path then closed"
            }]
        );
    }

    exports.init = init;

}());

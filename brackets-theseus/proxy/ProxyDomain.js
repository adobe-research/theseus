/*
 * Copyright (c) 2012 Adobe Systems Incorporated and other contributors.
 * All rights reserved.
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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true */
/*global */

(function () {
    "use strict";

    var connect    = require('connect'),
        fondue     = require('../fondue'),
        fs         = require('fs'),
        http       = require('http'),
        middleware = require('./middleware'),
        url        = require('url');

    /**
     * @private
     * @type {?http.Server}
     * The current HTTP server, or null if there isn't one.
     */
    var _server = null;
    
    /**
     * @private
     * @type {DomainManager}
     * The DomainManager passed in at init.
     */
    var _domainManager = null;

    /**
     * connect shim that processes js files, adding instrumentation code
     * unless the file was requested with ?prebug=false (or another falsey
     * value)
     */
    function filter(req, res, path, type) {
      if (type == 'application/javascript') {
        var content = fs.readFileSync(path, 'utf8');

        var prebug = url.parse(req.url, true).query.prebug;
        if (prebug !== 'no' && prebug !== 'false' && prebug !== '0' && !/thirdparty/.test(req.url) && !/jquery/i.test(req.url)) {
          content = fondue.instrument(content, { path: path, include_prefix: false });
        }

        res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
        res.end(content);
        return true;
      } else if (type == 'text/html') {
        var content = fs.readFileSync(path, 'utf8');

        var scriptLocs = [];
        var scriptBeginRegexp = /<\s*script[^>]*>/ig;
        var scriptEndRegexp = /<\s*\/\s*script/i;
        var lastScriptEnd = 0;
        var match;
        while (match = scriptBeginRegexp.exec(content))
        {
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

        // process the scripts in reverse order
        for (var i = scriptLocs.length - 1; i >= 0; i--) {
          var loc = scriptLocs[i];
          var script = content.slice(loc.start, loc.end);
          var prefix = content.slice(0, loc.start).replace(/[^\n]/g, ' '); // padding it out so line numbers make sense
          content = content.slice(0, loc.start) + fondue.instrument(prefix + script, { path: path, include_prefix: false }) + content.slice(loc.end);
        }

        content = '<script>\n' + fondue.instrumentationPrefix() + '\n</script>\n' + content;

        res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
        res.end(content);

        return true;
      }
    }

    /**
     * @private
     * Helper function to create a new server.
     * @param {string} path The absolute path that should be the document root
     * @param {function(?string, ?httpServer)} cb Callback function that receives
     *    either an error string or the newly created server. 
     */
    function createServer(path, cb) {
        var app = connect().use(middleware.staticWithFilter(path, { filter: filter }));

        var server = http.createServer(app);
        server.listen(64650 /* XXX: hard-coded! */, '127.0.0.1', function () {
            cb(null, server);
        });
    }

    /**
     * @private
     * Handler function for the connect.startServer command. Stops any
     * currently running server, and then starts a new server at the
     * specified path
     * @param {string} path The absolute path that should be the document root
     * @param {function(?string, ?{address: string, family: string,
     *    port: number})} cb Callback which sends response to
     *    the requesting client connection. First argument is the error string,
     *    second argument is the address object.
     */
    function cmdStartServer(path, cb) {
        if (_server) {
            try {
                // NOTE: close() stops the server from listening/accepting new
                // connections, but does not close already-open "keep alive"
                // connections
                _server.close();
            } catch (e) { }
            _server = null;
        }
        createServer(path, function (err, server) {
            if (err) {
                cb(err, null);
            } else {
                _server = server;
                cb(null, server.address());
            }
        });
    }
    
    /**
     * Initializes the test domain with several test commands.
     * @param {DomainManager} DomainManager The DomainManager for the server
     */
    function init(DomainManager) {
        _domainManager = DomainManager;
        if (!_domainManager.hasDomain("connect")) {
            _domainManager.registerDomain("connect", {major: 0, minor: 1});
        }
        _domainManager.registerCommand(
            "connect",
            "startServer",
            cmdStartServer,
            true,
            "Starts a server at the specified path",
            [{name: "path", type: "string"}],
            [{name: "address", type: "{address: string, family: string, port: number}"}]
        );
    }
    
    exports.init = init;
    
}());

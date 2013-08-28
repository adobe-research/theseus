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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global window, define, $, brackets */

define(function (require, exports, module) {
    "use strict";

    var ExtensionUtils       = brackets.getModule("utils/ExtensionUtils");
    var FileUtils            = brackets.getModule("file/FileUtils");
    var LiveDevServerManager = brackets.getModule("LiveDevelopment/LiveDevServerManager");
    var NodeConnection       = brackets.getModule("utils/NodeConnection");
    var ProjectManager       = brackets.getModule("project/ProjectManager");
    var BaseServer           = brackets.getModule("LiveDevelopment/Servers/BaseServer").BaseServer;
    var main                 = require("../main");

    var _proxyURL;
    var _proxyServerProvider;

    /**
     * @private
     * @type{jQuery.Deferred.<NodeConnection>}
     * A deferred which is resolved with a NodeConnection or rejected if
     * we are unable to connect to Node.
     */
    var _nodeConnectionDeferred = new $.Deferred();

    /**
     * @const
     * Amount of time to wait before automatically rejecting the connection
     * deferred. If we hit this timeout, we'll never have a node connection
     * for the static server in this run of Brackets.
     */
    var NODE_CONNECTION_TIMEOUT = 30000; // 30 seconds

    /**
    gets a server for the given path and mode, creating one if necessary

    rootPath: a path such as ProjectManager.getProjectRoot().fullPath
    mode: "static" or "proxy"
    **/
    function getServer(rootPath, mode) {
        var d = new $.Deferred();

        _nodeConnectionDeferred.done(function (nodeConnection) {
            if (nodeConnection.connected()) {
                nodeConnection.domains.theseusServer.getServer(rootPath, mode, "thirdparty|node_modules").done(function (address) {
                    d.resolve({
                        address: address.address,
                        port: address.port,
                        proxyRootURL: "http://" + address.address + ":" + address.port + "/"
                    });
                }).fail(function () {
                    d.reject();
                });
            } else {
                // nodeConnection has been connected once (because the deferred
                // resolved, but is not currently connected).
                //
                // If we are in this case, then the node process has crashed
                // and is in the process of restarting. Once that happens, the
                // node connection will automatically reconnect and reload the
                // domain. Unfortunately, we don't have any promise to wait on
                // to know when that happens.
                d.reject();
            }
        }).fail(function () {
            d.reject();
        });

        return d.promise();
    }

    function ProxyServer(config) {
        BaseServer.call(this, config);
    }
    
    ProxyServer.prototype = Object.create(BaseServer.prototype);
    ProxyServer.prototype.constructor = ProxyServer;
    
    ProxyServer.prototype.canServe = function (localPath) {
        return main.isEnabled() && FileUtils.isStaticHtmlFileExt(localPath);
    };

    ProxyServer.prototype.readyToServe = function () {
        var self = this;
        var d = getServer(ProjectManager.getProjectRoot().fullPath, main.getModeName());
        d.done(function (proxy) {
            self._baseUrl = proxy.proxyRootURL;
        });
        return d;
    };
    
    function _createProxyServer() {
        var config = {
            pathResolver    : ProjectManager.makeProjectRelativeIfPossible,
            root            : ProjectManager.getProjectRoot().fullPath
        };
        
        return new ProxyServer(config);
    }

    function init() {
        // register proxy server provider
        LiveDevServerManager.registerProvider({ create: _createProxyServer }, 10);

        // set up timeout for initializing the Node connection (below)
        var connectionTimeout = window.setTimeout(function () {
            console.error("[Theseus] Timed out while trying to connect to node");
            _nodeConnectionDeferred.reject();
        }, NODE_CONNECTION_TIMEOUT);

        // initialize Node connection
        var nodeConnection = new NodeConnection();
        nodeConnection.connect(true).then(function () {
            nodeConnection.loadDomains([ExtensionUtils.getModulePath(module, "proxy/ProxyDomain")], true).done(function () {
                window.clearTimeout(connectionTimeout);
                _nodeConnectionDeferred.resolveWith(null, [nodeConnection]);
            }).fail(function () {
                console.error("[Theseus] Failed to connect to node", arguments);
                _nodeConnectionDeferred.reject();
            });
        });
    }

    exports.init = init;
    exports.getServer = getServer;
});

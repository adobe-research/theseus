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
/*global define */

/**
 * Provides these events:
 *
 *   - agentConnected (agent):
 *       when information about functions and call sites has been received
 */

define(function (require, exports, module) {
    var ChromeAgent = require("./Agent-chrome");
    var NodeAgent   = require("./Agent-node");

    var $exports = $(exports);

    var _connectedAgents = [];

    function _addAgent(agent) {
        var i = _connectedAgents.indexOf(agent);
        if (i === -1) {
            _connectedAgents.push(agent);
        }
        $exports.triggerHandler("agentConnected", agent);
    }

    function _removeAgent(agent) {
        var i = _connectedAgents.indexOf(agent);
        if (i !== -1) {
            _connectedAgents.splice(i, 1);
        }
    }

    function init() {
        $(NodeAgent).on("connect", function () { _addAgent(NodeAgent) });
        $(NodeAgent).on("disconnect", function () { _removeAgent(NodeAgent) });

        $(ChromeAgent).on("connect", function () { _addAgent(ChromeAgent) });
        $(ChromeAgent).on("disconnect", function () { _removeAgent(ChromeAgent) });
    }

    function agents() {
        return _connectedAgents.slice();
    }

    function resetTrace() {
        agents().forEach(function (agent) {
            agent.resetTrace();
        });
    }

    exports.init = init;
    exports.agents = agents;
    exports.resetTrace = resetTrace;
});

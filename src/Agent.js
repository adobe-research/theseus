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
 * Your connection to instrumented node code.
 *
 * Provides these events:
 *
 *   - receivedScriptInfo (path):
 *       when information about functions and call sites has been received
 *   - scriptWentAway (path):
 *       when the connection to the instance for a particular path has closed
 */

define(function (require, exports, module) {
    var Async = brackets.getModule("utils/Async");
    var NodeAgent = require("./Agent-node");
    var ChromeAgent = require("./Agent-chrome");
    var ProjectManager = brackets.getModule("project/ProjectManager");
    var $exports = $(exports);

    var AGENTS = [ChromeAgent, NodeAgent];

    var _logHandles = [];

    function init() {
        NodeAgent.init();
        ChromeAgent.init();

        $(NodeAgent).on("receivedScriptInfo", function (ev, path) {
            $exports.triggerHandler("receivedScriptInfo", [path]);
        });
        $(NodeAgent).on("scriptWentAway", function (ev, path) {
            $exports.triggerHandler("scriptWentAway", [path]);
        });

        $(ChromeAgent).on("receivedScriptInfo", function (ev, path) {
            $exports.triggerHandler("receivedScriptInfo", [path]);
        });
        $(ChromeAgent).on("scriptWentAway", function (ev, path) {
            $exports.triggerHandler("scriptWentAway", [path]);
        });
    }

    function isReady() {
        return ChromeAgent.isReady() || NodeAgent.isReady();
    }

    function possibleRemotePathsForLocalPath(path) {
        var relativePath = ProjectManager.makeProjectRelativeIfPossible(path);
        var pathComponents = relativePath.split("/");
        return [
            path,
            relativePath,
            "assets/" + pathComponents[pathComponents.length - 1],
            "assets/" + relativePath.replace(/^app\/assets\/[^\/]+\//, ''),
            relativePath.replace(/^public\//, ''),
            pathComponents[pathComponents.length - 1],
        ];
    }

    function _longestSharedSuffix(a, b) {
        var s = [];
        var minLength = Math.min(a.length, b.length);
        for (var i = 0; i < minLength; i++) {
            var c1 = a[a.length - 1 - i];
            var c2 = b[b.length - 1 - i];
            if (c1 === c2) {
                s.unshift(c1)
            } else {
                return s;
            }
        }
        return s;
    }

    function couldBeRemotePath(localPath, remotePath) {
        var possibleRemotePaths = possibleRemotePathsForLocalPath(localPath);
        if (possibleRemotePaths.indexOf(remotePath) !== -1) {
            return true;
        }

        // if the file name and the name of the parent match, maybe it's the same file
        var localPathComponents = localPath.split("/");
        var remotePathComponents = remotePath.split("/");
        if (_longestSharedSuffix(localPathComponents, remotePathComponents).length >= 2) {
            return true;
        }

        return false;
    }

    function functionWithId(fid) {
        return NodeAgent.functionWithId(fid) || ChromeAgent.functionWithId(fid);
    }

    function functionsInFile(path) {
        var functions = [];
        functions.push.apply(functions, NodeAgent.functionsInFile(path));
        functions.push.apply(functions, ChromeAgent.functionsInFile(path));
        return functions;
    }

    function probesInFile(path) {
        var probes = [];
        probes.push.apply(probes, NodeAgent.probesInFile(path));
        probes.push.apply(probes, ChromeAgent.probesInFile(path));
        return probes;
    }

    function refreshHitCounts(callback) {
        NodeAgent.refreshHitCounts(function (nodeHits, nodeDeltas) {
            ChromeAgent.refreshHitCounts(function (chromeHits, chromeDeltas) {
                var hits = {};
                var deltas = {};
                if (nodeHits) {
                    for (var i in nodeHits) { hits[i] = nodeHits[i] }
                    for (var i in nodeDeltas) { deltas[i] = nodeDeltas[i] }
                }
                if (chromeHits) {
                    for (var i in chromeHits) { hits[i] = chromeHits[i] }
                    for (var i in chromeDeltas) { deltas[i] = chromeDeltas[i] }
                }
                if (nodeHits || chromeHits) {
                    callback(hits, deltas);
                } else {
                    callback();
                }
            });
        });
    }

    function refreshExceptionCounts(callback) {
        NodeAgent.refreshExceptionCounts(function (nodeCounts, nodeDeltas) {
            ChromeAgent.refreshExceptionCounts(function (chromeCounts, chromeDeltas) {
                var counts = {};
                var deltas = {};
                if (nodeCounts) {
                    for (var i in nodeCounts) { counts[i] = nodeCounts[i] }
                    for (var i in nodeDeltas) { deltas[i] = nodeDeltas[i] }
                }
                if (chromeCounts) {
                    for (var i in chromeCounts) { counts[i] = chromeCounts[i] }
                    for (var i in chromeDeltas) { deltas[i] = chromeDeltas[i] }
                }
                if (nodeCounts || chromeCounts) {
                    callback(counts, deltas);
                } else {
                    callback();
                }
            });
        });
    }

    function cachedHitCounts() {
        var hits = {};
        var nodeHits = NodeAgent.cachedHitCounts();
        var chromeHits = ChromeAgent.cachedHitCounts();

        for (var i in nodeHits) { hits[i] = nodeHits[i] }
        for (var i in chromeHits) { hits[i] = chromeHits[i] }

        return hits;
    }

    function trackLogs(query, callback) {
        var handle = {};
        var handleId = _logHandles.push(handle) - 1;

        NodeAgent.trackLogs(query, function (nodeHandle) {
            if (nodeHandle !== undefined) {
                handle.node = nodeHandle;
            }
        });

        ChromeAgent.trackLogs(query, function (chromeHandle) {
            if (chromeHandle !== undefined) {
                handle.chrome = chromeHandle;
            }
        });

        callback(handleId);
    }

    function refreshLogs(handleId, maxResults, callback) {
        var handle = _logHandles[handleId];
        if (!handle) {
            callback(); // error
            return;
        }

        var agents = [];
        if ("node" in handle) {
            agents.push({ agent: NodeAgent, handle: handle.node });
        }
        if ("chrome" in handle) {
            agents.push({ agent: ChromeAgent, handle: handle.chrome });
        }

        var logs = [];

        var masterPromise = Async.doInParallel(agents, function (agent, index) {

            var deferred = new $.Deferred();

            agent.agent.refreshLogs(agent.handle, maxResults, function (results) {
                if (results) {
                    logs.push.apply(logs, results);
                    deferred.resolve();
                } else {
                    deferred.reject();
                }
            });

            return deferred.promise();
        });

        masterPromise.always(function () {
            logs.sort(function (a, b) {
                if (a.timestamp === b.timestamp) {
                    return a.tick - b.tick;
                }
                return a.timestamp - b.timestamp
            });
            callback(logs);
        });
    }

    function backtrace(options, callback) {
        var trace;

        // it would be nice if this promise could resolve if *any* task resolved
        var masterPromise = Async.doInParallel(AGENTS, function (agent, index) {

            var deferred = new $.Deferred();

            agent.backtrace(options, function (thisTrace) {
                if (thisTrace) {
                    trace = thisTrace;
                    deferred.resolve();
                } else {
                    deferred.reject();
                }
            });

            return deferred.promise();
        });

        masterPromise.always(function () {
            if (trace) {
                callback(trace);
            } else {
                callback();
            }
        });
    }

    exports.init = init;
    exports.isReady = isReady;
    exports.possibleRemotePathsForLocalPath = possibleRemotePathsForLocalPath;
    exports.couldBeRemotePath = couldBeRemotePath;

    // satisfied from locally cached data (sync)
    exports.functionWithId = functionWithId;
    exports.functionsInFile = functionsInFile;
    exports.probesInFile = probesInFile;
    exports.cachedHitCounts = cachedHitCounts;

    // fetch data from the instrumented app (async)
    exports.refreshHitCounts = refreshHitCounts;
    exports.refreshExceptionCounts = refreshExceptionCounts;
    exports.trackLogs = trackLogs;
    exports.refreshLogs = refreshLogs;
    exports.backtrace = backtrace;
});

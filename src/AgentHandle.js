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

define(function (require, exports, module) {
    var AgentManager = require("./AgentManager");

    /**
     * emits 'data' and 'close'.
     * 'abstract' parent class, expecting subclasses to provide
     *   _open: return a promise for the raw handle corresponding to the given query
     *   _free: release the handle
     *   _refresh: return a promise for the latest data
     */
    function Handle(agent, interval, query) {
        this._agent = agent;
        this._interval = interval;
        $(this._agent).on("disconnect", this.close.bind(this));
        this._open(query).done(function (rawHandle) {
            this._rawHandle = rawHandle;
            if (this._closed) {
                this.free();
            } else {
                this._refreshPeriodically();
            }
        }.bind(this)).fail(this.close.bind(this));
    }
    Handle.prototype = {
        free: function () {
            if ("_rawHandle" in this) {
                if (this._agent.isReady()) {
                    this._free(this._rawHandle);
                }
                delete this._rawHandle;
            }
        },
        close: function () {
            this.free();
            if (!this._closed) {
                this._closed = true;
                $(this).triggerHandler("close");
            }
        },
        _refreshPeriodically: function () {
            if (!this._closed) {
                this._refresh().done(function (data) {
                    if (!this._isEmpty(data)) {
                        $(this).triggerHandler("data", [data]);
                    }
                }.bind(this)).fail(function () {
                    console.log('[theseus] refresh failed');
                    $(this).triggerHandler("error");
                }.bind(this)).always(function () {
                    setTimeout(this._refreshPeriodically.bind(this), this._interval);
                }.bind(this));
            }
        },
        /** if returns false, the 'data' event won't be emitted */
        _isEmpty: function (data) {
            return false;
        },
    };

    /**
     * when a new agent appears, automatically creates a handle for it.
     * emits all its handles' "data" events for your convenience.
     * emits "agentDisconnected" so that you know to clear the data you've
     *   received from that agent.
     */
    function AggregateHandle(query) {
        this._query = query;
        this._handles = [];
        AgentManager.agents().forEach(this._agentConnected.bind(this));
        $(AgentManager).on("agentConnected", function (ev, agent) {
            this._agentConnected(agent)
        }.bind(this));
    }
    AggregateHandle.prototype = {
        close: function () {
            this._closed = true;
            this._handles.forEach(function (handle) { handle.close() });
            this._handles = [];
        },
        _agentConnected: function (agent) {
            if (this._closed) {
                return;
            }

            var handle = this._newHandle(agent);
            this._handles.push(handle);

            $(handle).on("data", function (ev, data) {
                $(this).triggerHandler("data", [{ agent: agent, data: data }]);
            }.bind(this));

            $(handle).on("error", function (ev, data) {
                handle.close();
                this._agentConnected(agent);
            }.bind(this));

            $(handle).on("close", function (ev) {
                this._removeHandle(handle);
                $(this).triggerHandler("agentDisconnected", [agent]);
            }.bind(this));
        },
        _removeHandle: function (handle) {
            var i = this._handles.indexOf(handle);
            if (i !== -1) {
                this._handles.splice(i, 1);
            }
        },
    };

    // so, this is clearly not how JavaScript is supposed to be used

    function makeHandleConstructor(functions) {
        var constructor = function (agent, interval, query) {
            this._open = functions._open;
            this._free = functions._free;
            this._refresh = functions._refresh;
            if (functions._isEmpty) this._isEmpty = functions._isEmpty;
            Handle.call(this, agent, interval, query);
        };
        constructor.prototype = Handle.prototype;
        return constructor;
    }

    function makeAggregateHandleConstructor(handleFunctions) {
        var handleConstructor = makeHandleConstructor(handleFunctions);

        var constructor = function (interval, query) {
            this._newHandle = function (agent) {
                return new handleConstructor(agent, interval, query);
            };

            AggregateHandle.call(this, query);
        }
        constructor.prototype = AggregateHandle.prototype;
        return constructor;
    }

    // but whatever, this part is fine

    var NodesAggregateHandle = makeAggregateHandleConstructor({
        _open: function () { return this._agent.trackNodes() },
        _free: function () { this._agent.untrackNodes(this._rawHandle) },
        _refresh: function () { return this._agent.nodeDelta(this._rawHandle) },
        _isEmpty: function (data) { return data.length === 0 },
    });

    var EpochsAggregateHandle = makeAggregateHandleConstructor({
        _open: function () { return this._agent.trackEpochs() },
        _free: function () { this._agent.untrackEpochs(this._rawHandle) },
        _refresh: function () { return this._agent.epochDelta(this._rawHandle) },
    });

    var ExceptionsAggregateHandle = makeAggregateHandleConstructor({
        _open: function () {
            var d = new $.Deferred;
            this._agent.trackLogs({ ids: [], exceptions: true }, function (handle) {
                if (handle === undefined) {
                    d.reject();
                } else {
                    d.resolve(handle);
                }
            }.bind(this));
            return d.promise();
        },
        _free: function () { /* XXX TODO */ },
        _refresh: function () { return this._agent.logCount(this._rawHandle) },
    });

    var ConsoleLogsAggregateHandle = makeAggregateHandleConstructor({
        _open: function () {
            var d = new $.Deferred;
            this._agent.trackLogs({ ids: [], logs: true }, function (handle) {
                if (handle === undefined) {
                    d.reject();
                } else {
                    d.resolve(handle);
                }
            }.bind(this));
            return d.promise();
        },
        _free: function () { /* XXX TODO */ },
        _refresh: function () { return this._agent.logCount(this._rawHandle) },
    });

    var FileCallGraphAggregateHandle = makeAggregateHandleConstructor({
        _open: function () { return this._agent.trackFileCallGraph() },
        _free: function () { this._agent.untrackFileCallGraph(this._rawHandle) },
        _refresh: function () { return this._agent.fileCallGraphDelta(this._rawHandle) },
        _isEmpty: function (data) { return data.length === 0 },
    });

    var ProbeValuesAggregateHandle = makeAggregateHandleConstructor({
        _open: function (query) { return this._agent.trackProbeValues(query) },
        _free: function () { this._agent.untrackProbeValues(this._rawHandle) },
        _refresh: function () { return this._agent.probeValuesDelta(this._rawHandle) },
        _isEmpty: function (data) { return Object.keys(data).length === 0 },
    });

    /**
     * returns an object on which you can listen for 'data' events.
     * historical data will be sent with the first 'data' event.
     * when 'agentDisconnected' event is emitted, clear all data you've received
     *   from that agent.
     * call close() when you are done.
     */

    function trackNodes(updateInterval) {
        updateInterval || (updateInterval = 1000);
        return new NodesAggregateHandle(updateInterval);
    }

    function trackEpochs(updateInterval) {
        updateInterval || (updateInterval = 1000);
        return new EpochsAggregateHandle(updateInterval);
    }

    function trackExceptions(updateInterval) {
        updateInterval || (updateInterval = 1000);
        return new ExceptionsAggregateHandle(updateInterval);
    }

    function trackConsoleLogs(updateInterval) {
        updateInterval || (updateInterval = 1000);
        return new ConsoleLogsAggregateHandle(updateInterval);
    }

    function trackFileCallGraph(updateInterval) {
        updateInterval || (updateInterval = 1000);
        return new FileCallGraphAggregateHandle(updateInterval);
    }

    function trackProbeValues(updateInterval, query) {
        updateInterval || (updateInterval = 1000);
        return new ProbeValuesAggregateHandle(updateInterval, query);
    }

    exports.trackEpochs = trackEpochs;
    exports.trackNodes = trackNodes;
    exports.trackExceptions = trackExceptions;
    exports.trackConsoleLogs = trackConsoleLogs;
    exports.trackFileCallGraph = trackFileCallGraph;
    exports.trackProbeValues = trackProbeValues;
});

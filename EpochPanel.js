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
    var AgentHandle  = require("AgentHandle");
    var PanelManager = brackets.getModule("view/PanelManager");

    var $exports = $(exports);
    var $panel;
    var $eventsContainer, $events;
    var panel; // PanelManager.Panel

    var epochHandle;
    var hitsByAgent = {}; // { agent-id: { name: hits } }
    var combinedHits = {}; // { name: hits }
    var eventNameDisplayOrder; // event name display order

    var exceptionHandle;
    var exceptionCountByAgent = {}; // { agent-id: count }
    var combinedExceptionCount = 0;

    var consoleLogsHandle;
    var consoleLogsCountByAgent = {}; // { agent-id: count }
    var combinedConsoleLogsCount = 0;

    function DisplayOrder() {
        this.objects = [];
    }
    DisplayOrder.prototype = {
        add: function (object) {
            if (this.objects.indexOf(object) === -1) {
                this.objects.push(object);
            }
        },
        sort: function (objects) {
            return objects.sort(function (a, b) {
                return this.objects.indexOf(a) - this.objects.indexOf(b);
            }.bind(this));
        },
    }

    function combineData() {
        combinedHits = {};
        for (var agentId in hitsByAgent) {
            var hits = hitsByAgent[agentId];
            for (var name in hits) {
                combinedHits[name] = (combinedHits[name] || 0) + hits[name];
            }
        }

        combinedExceptionCount = 0;
        for (var agentId in exceptionCountByAgent) {
            combinedExceptionCount += exceptionCountByAgent[agentId];
        }

        combinedConsoleLogsCount = 0;
        for (var agentId in consoleLogsCountByAgent) {
            combinedConsoleLogsCount += consoleLogsCountByAgent[agentId];
        }
    }

    function hitsReceived(agent, hits) {
        if (!(agent.id in hitsByAgent)) {
            hitsByAgent[agent.id] = {};
        }
        var agentHits = hitsByAgent[agent.id];
        for (var name in hits) {
            agentHits[name] = (agentHits[name] || 0) + hits[name].hits;
            eventNameDisplayOrder.add(name);
        }
        combineData();
    }

    function exceptionsReceived(agent, hits) {
        if (!(agent.id in exceptionCountByAgent)) {
            exceptionCountByAgent[agent.id] = 0;
        }
        for (var nodeId in hits) {
            exceptionCountByAgent[agent.id] += hits[nodeId];
        }
        combineData();
    }

    function consoleLogsReceived(agent, count) {
        if (!(agent.id in consoleLogsCountByAgent)) {
            consoleLogsCountByAgent[agent.id] = 0;
        }
        consoleLogsCountByAgent[agent.id] = count;
        combineData();
    }

    function agentLeft(agent) {
        delete hitsByAgent[agent.id];
        delete exceptionCountByAgent[agent.id];
        delete consoleLogsCountByAgent[agent.id];
        combineData();
    }

    function eventDom(name, hits) {
        var $dom = $("<span class='epoch' />");
        var $nameDom = $("<span class='name' />").text(name).appendTo($dom);
        var $hitsDom = $("<span class='hits' />").text(hits).appendTo($dom);

        $dom.on("click", function () {
            $exports.triggerHandler("eventNameClicked", [name]);
        });

        return $dom;
    }

    function exceptionDom(count) {
        var $dom = $("<span class='epoch exception' />");
        var $nameDom = $("<span class='name' />").text("exception").appendTo($dom);
        var $hitsDom = $("<span class='hits' />").text(count).appendTo($dom);

        $dom.on("click", function () {
            $exports.triggerHandler("exceptionsClicked", [name]);
        });

        return $dom;
    }

    function consoleLogDom(count) {
        var $dom = $("<span class='epoch logs' />");
        var $nameDom = $("<span class='name' />").text("console.log").appendTo($dom);
        var $hitsDom = $("<span class='hits' />").text(count).appendTo($dom);

        $dom.on("click", function () {
            $exports.triggerHandler("logsClicked", [name]);
        });

        return $dom;
    }

    function _haveEventData() { return Object.keys(combinedHits).length > 0 }
    function _haveExceptionData() { return combinedExceptionCount > 0 }
    function _haveConsoleLogsData() { return combinedConsoleLogsCount > 0 }
    function _haveData() {
        return _haveEventData() || _haveExceptionData() || _haveConsoleLogsData();
    }

    function display() {
        $events.empty();

        if (_haveData()) {
            panel.show();

            if (_haveExceptionData()) {
                $events.append(exceptionDom(combinedExceptionCount));
            }

            if (_haveConsoleLogsData()) {
                $events.append(consoleLogDom(combinedConsoleLogsCount));
            }

            if (_haveEventData()) {
                var sortedNames = eventNameDisplayOrder.sort(Object.keys(combinedHits));
                sortedNames.forEach(function (name) {
                    $events.append(eventDom(name, combinedHits[name]));
                });
            }
        } else {
            panel.hide();
        }
    }

    function hasEvent(name) {
        return (name in combinedHits);
    }

    function hasExceptions() {
        return combinedExceptionCount > 0;
    }

    function hasLogs() {
        return combinedConsoleLogsCount > 0;
    }

    function init() {
        eventNameDisplayOrder = new DisplayOrder;

        $panel = $("<div id='theseus-epoch-panel' class='bottom-panel no-focus' />");
        panel = PanelManager.createBottomPanel("theseus.epoch-panel", $panel, 20);

        $eventsContainer = $("<span />").appendTo($panel);
        $("<span class='heading' />").text("Events:").appendTo($eventsContainer);
        $events = $("<span class='events' />").appendTo($eventsContainer);

        epochHandle = AgentHandle.trackEpochs(100);
        $(epochHandle).on("data", function (ev, data) {
            hitsReceived(data.agent, data.data);
            display();
        });
        $(epochHandle).on("agentDisconnected", function (ev, agent) {
            agentLeft(agent);
            display();
        });

        exceptionHandle = AgentHandle.trackExceptions(100);
        $(exceptionHandle).on("data", function (ev, data) {
            exceptionsReceived(data.agent, data.data.counts);
            display();
        });
        $(exceptionHandle).on("agentDisconnected", function (ev, agent) {
            agentLeft(agent);
            display();
        });

        consoleLogsHandle = AgentHandle.trackConsoleLogs(1000);
        $(consoleLogsHandle).on("data", function (ev, data) {
            consoleLogsReceived(data.agent, data.data);
            display();
        });
        $(consoleLogsHandle).on("agentDisconnected", function (ev, agent) {
            agentLeft(agent);
            display();
        });
    }

    exports.init = init;
    exports.hasEvent = hasEvent;
    exports.hasExceptions = hasExceptions;
    exports.hasLogs = hasLogs;
});

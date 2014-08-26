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
    var AgentHandle  = require("./AgentHandle");
    var PanelManager = brackets.getModule("view/PanelManager");
    var UI           = require("./UI");

    var $exports = $(exports);

    var panel; // PanelManager.Panel
    var $panel;
    var $exceptionsContainer, $exceptionCount,
        $logsContainer, $logCount,
        $allEventsContainer, $eventContainers = {}, $eventCounts = {}; // last two are { name: $dom }

    var exceptionHandle;
    var exceptionCountByAgent = {}; // { agent-id: count }
    var combinedExceptionCount = 0;

    var consoleLogsHandle;
    var consoleLogsCountByAgent = {}; // { agent-id: count }
    var combinedConsoleLogsCount = 0;

    var epochHandle;
    var hitsByAgent = {}; // { agent-id: { name: hits } }
    var combinedHits = {}; // { name: hits }

    function combineExceptions() {
        combinedExceptionCount = 0;
        for (var agentId in exceptionCountByAgent) {
            combinedExceptionCount += exceptionCountByAgent[agentId];
        }
    }

    function combineConsoleLogs() {
        combinedConsoleLogsCount = 0;
        for (var agentId in consoleLogsCountByAgent) {
            combinedConsoleLogsCount += consoleLogsCountByAgent[agentId];
        }
    }

    function combineHits() {
        combinedHits = {};
        for (var agentId in hitsByAgent) {
            var hits = hitsByAgent[agentId];
            for (var name in hits) {
                combinedHits[name] = (combinedHits[name] || 0) + hits[name];
            }
        }
    }

    function exceptionsReceived(agent, hits) {
        if (!(agent.id in exceptionCountByAgent)) {
            exceptionCountByAgent[agent.id] = 0;
        }
        exceptionCountByAgent[agent.id] = hits;
        combineExceptions();

        updateExceptionDisplay();
        setPanelVisibility();
    }

    function consoleLogsReceived(agent, count) {
        if (!(agent.id in consoleLogsCountByAgent)) {
            consoleLogsCountByAgent[agent.id] = 0;
        }
        consoleLogsCountByAgent[agent.id] = count;
        combineConsoleLogs();

        updateConsoleLogsDisplay();
        setPanelVisibility();
    }

    function hitsReceived(agent, hits) {
        if (!(agent.id in hitsByAgent)) {
            hitsByAgent[agent.id] = {};
        }
        var agentHits = hitsByAgent[agent.id];
        for (var name in hits) {
            agentHits[name] = (agentHits[name] || 0) + hits[name].hits;
        }
        combineHits();

        updateEventsDisplay();
        setPanelVisibility();
    }

    function agentLeft(agent) {
        delete exceptionCountByAgent[agent.id];
        delete consoleLogsCountByAgent[agent.id];
        delete hitsByAgent[agent.id];
        combineExceptions();
        combineConsoleLogs();
        combineHits();

        updateAllDisplays();
        setPanelVisibility();
    }

    function exceptionDom() {
        var $dom = $("<span class='epoch exception' />");
        var $nameDom = $("<span class='name' />").text("exception").appendTo($dom);
        $exceptionCount = $("<span class='hits' />").appendTo($dom);

        $dom.on("click", function () {
            $exports.triggerHandler("exceptionsClicked", [name]);
        });

        return $dom;
    }

    function consoleLogDom() {
        var $dom = $("<span class='epoch logs' />");
        var $nameDom = $("<span class='name' />").text("console").appendTo($dom);
        $logCount = $("<span class='hits' />").appendTo($dom);

        $dom.on("click", function () {
            $exports.triggerHandler("logsClicked", [name]);
        });

        return $dom;
    }

    function eventDom(name) {
        var $dom = $("<span class='epoch' />");
        var $nameDom = $("<span class='name' />").text(name).appendTo($dom);
        var $hitsDom = $("<span class='hits' />").appendTo($dom);

        $dom.on("click", function () {
            $exports.triggerHandler("eventNameClicked", [name]);
        });

        return { container: $dom, count: $hitsDom };
    }

    function _haveExceptionData() { return combinedExceptionCount > 0 }
    function _haveConsoleLogsData() { return combinedConsoleLogsCount > 0 }
    function _haveEventData() { return Object.keys(combinedHits).length > 0 }
    function _haveData() {
        return _haveExceptionData() || _haveConsoleLogsData() || _haveEventData();
    }

    function updateExceptionDisplay() {
        $exceptionCount.text(combinedExceptionCount);
        $exceptionsContainer.css("display", _haveExceptionData() ? "inline-block" : "none");
    }

    function updateConsoleLogsDisplay() {
        $logCount.text(combinedConsoleLogsCount);
        $logsContainer.css("display", _haveConsoleLogsData() ? "inline-block" : "none");
    }

    function updateEventsDisplay() {
        for (var name in combinedHits) {
            if (!(name in $eventContainers)) {
                var o = eventDom(name);
                $eventContainers[name] = o.container;
                $eventCounts[name] = o.count;
                $allEventsContainer.append($eventContainers[name]);
            }
            $eventCounts[name].text(combinedHits[name]);
        }

        // delete DOMs for events that no longer exist
        for (name in $eventContainers) {
            if (!(name in combinedHits)) {
                $eventContainers[name].remove();
                delete $eventContainers[name];
                delete $eventCounts[name];
            }
        }
    }

    function updateAllDisplays() {
        updateExceptionDisplay();
        updateConsoleLogsDisplay();
        updateEventsDisplay();
    }

    function setPanelVisibility() {
        var shouldShow = _haveData();
        if (shouldShow != panel.isVisible()) {
            panel.setVisible(shouldShow);
        }
    }

    function hasExceptions() {
        return combinedExceptionCount > 0;
    }

    function hasLogs() {
        return combinedConsoleLogsCount > 0;
    }

    function hasEvent(name) {
        return (name in combinedHits);
    }

    function init() {
        $panel = $("<div id='theseus-epoch-panel' class='bottom-panel no-focus' />");
        panel = PanelManager.createBottomPanel("theseus.epoch-panel", $panel, 20);

        $("<span class='heading' />").text("Events:").appendTo($panel);
        $allEventsContainer = $("<span class='events' />").appendTo($panel);
        $exceptionsContainer = exceptionDom().appendTo($allEventsContainer);
        $logsContainer = consoleLogDom().appendTo($allEventsContainer);

        exceptionHandle = AgentHandle.trackExceptions(100);
        $(exceptionHandle).on("data", function (ev, data) {
            exceptionsReceived(data.agent, data.data);
        });
        $(exceptionHandle).on("agentDisconnected", function (ev, agent) {
            agentLeft(agent);
        });

        consoleLogsHandle = AgentHandle.trackConsoleLogs(100);
        $(consoleLogsHandle).on("data", function (ev, data) {
            consoleLogsReceived(data.agent, data.data);
        });
        $(consoleLogsHandle).on("agentDisconnected", function (ev, agent) {
            agentLeft(agent);
        });

        epochHandle = AgentHandle.trackEpochs(100);
        $(epochHandle).on("data", function (ev, data) {
            hitsReceived(data.agent, data.data);
        });
        $(epochHandle).on("agentDisconnected", function (ev, agent) {
            agentLeft(agent);
        });

        $(UI).on("queryChanged", function (ev, query) {
            $exceptionsContainer.toggleClass("selected", query.exceptions);
            $logsContainer.toggleClass("selected", query.logs);
            for (var name in $eventContainers) {
                $eventContainers[name].toggleClass("selected", query.eventNames.indexOf(name) !== -1);
            }
        });
    }

    exports.init = init;
    exports.hasExceptions = hasExceptions;
    exports.hasLogs = hasLogs;
    exports.hasEvent = hasEvent;
});

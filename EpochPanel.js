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
    var $panel, $events;
    var panel; // PanelManager.Panel
    var handle; // epoch tracking handle
    var hitsByAgent = {}; // { agent-id: { name: hits } }
    var combinedHits = {}; // { name: hits }
    var eventNameDisplayOrder; // event name display order

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

    function combineHits() {
        combinedHits = {};
        for (var agent in hitsByAgent) {
            var hits = hitsByAgent[agent];
            for (var name in hits) {
                combinedHits[name] = (combinedHits[name] || 0) + hits[name];
            }
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
        combineHits();
    }

    function agentLeft(agent) {
        delete hitsByAgent[agent.id];
        combineHits();
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

    function display() {
        if (Object.keys(combinedHits).length === 0) {
            panel.hide();
        } else {
            panel.show();
            $events.empty();
            var sortedNames = eventNameDisplayOrder.sort(Object.keys(combinedHits));
            sortedNames.forEach(function (name) {
                $events.append(eventDom(name, combinedHits[name]));
            });
        }
    }

    function init() {
        eventNameDisplayOrder = new DisplayOrder;

        $panel = $("<div id='theseus-epoch-panel' class='bottom-panel no-focus' />");
        $("<span class='heading' />").text("Events:").appendTo($panel);
        $events = $("<span class='events' />").appendTo($panel);
        panel = PanelManager.createBottomPanel("theseus.epoch-panel", $panel, 20);

        handle = AgentHandle.trackEpochs(100);
        $(handle).on("data", function (ev, data) {
            hitsReceived(data.agent, data.data);
            display();
        });
        $(handle).on("agentDisconnected", function (ev, agent) {
            agentLeft(agent);
            display();
        });
    }

    exports.init = init;
});

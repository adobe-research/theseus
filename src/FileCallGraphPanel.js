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
    var Agent           = require("./Agent");
    var AgentHandle     = require("./AgentHandle");
    var EditorInterface = require("./EditorInterface");
    var PanelManager    = brackets.getModule("view/PanelManager");
    var UI              = require("./UI");

    var $exports = $(exports);

//  var colors = "#1f77b4 #ff7f0e #2ca02c #d62728 #9467bd #8c564b #e377c2 #7f7f7f #bcbd22 #17becf #000000".split(" "); // d3
//  var colors = "#8DD3C7 #FFFFB3 #BEBADA #FB8072 #80B1D3 #FDB462 #B3DE69 #FCCDE5 #D9D9D9 #BC80BD #CCEBC5 #FFED6F".split(" "); // http://colorbrewer2.org/
    var colors = "#8DD3C7 #FFFFB3 #BEBADA #80B1D3 #FDB462 #B3DE69 #D9D9D9 #BC80BD #CCEBC5 #FFED6F".split(" "); // http://colorbrewer2.org/ without reds

    function _get(obj, key, defaultF) {
        if (!(key in obj)) {
            obj[key] = defaultF(key);
        }
        return obj[key];
    }

    var colorForPath = {};
    var nextColor = 0;
    function _getColor(path) {
        return _get(colorForPath, path, function () {
            var color = colors[nextColor];
            nextColor = (nextColor + 1) % colors.length;
            return color;
        });
    }

    var classForPath = {};
    var nextClassNumber = 0;
    function _getClass(path) {
        return _get(classForPath, path, function () {
            return "theseus-fcg-item-" + nextClassNumber++;
        });
    }

    function _myHover($dom, c1, c2) {
        var timer, active = false;

        $dom.on("mouseover", function (e) {
            var args = Array.prototype.slice.apply(arguments);
            timer = setTimeout(function () {
                timer = undefined;
                active = true;
                c1.apply(this, args);
            }, 30);
            e.stopPropagation();
        }).on("mouseout", function () {
            if (active) {
                active = false;
                c2();
            } else {
                clearTimeout(timer);
            }
        });
    }

    var panel; // PanelManager.Panel
    var $panel, $container, $tooltip;

    var fcgHandle;
    var fcgByAgent = {}; // { agent-id: [fcg root] }

    function _fcgReceived(agent, roots) {
        if (!(agent.id in fcgByAgent)) {
            fcgByAgent[agent.id] = [];
        }
        fcgByAgent[agent.id].push.apply(fcgByAgent[agent.id], roots);

        _updateDisplay(roots);
        _setPanelVisibility();
    }

    function _agentLeft(agent) {
        delete fcgByAgent[agent.id];

        _updateDisplay();
        _setPanelVisibility();
    }

    function _haveData() {
        return Object.keys(fcgByAgent).some(function (agentId) {
            return fcgByAgent[agentId].length > 0;
        });
    }

    function _walk(tree, c) {
        for (var i in tree) {
            var result = c(tree[i]);
            if (result !== undefined) {
                return result;
            }
            result = _walk(tree[i].children, c);
            if (result !== undefined) {
                return result;
            }
        }
    }
    function _allEvents(tree) {
        var events = [];
        _walk(tree, function (node) {
            node.eventNames.forEach(function (name) {
                if (events.indexOf(name) === -1) {
                    events.push(name);
                }
            });
        });
        return events;
    }

    function _renderNode(node, $parent) {
        var $dom = $("<div class='item' />");
        var className = _getClass(node.path);

        $dom.addClass(className);
        $dom.css({ background: _getColor(node.path) });
        _myHover($dom, function (e) {
            // $tooltip.text(node.path);
            // $tooltip.stop(true, true);
            // $tooltip.fadeIn();
            // $tooltip.css({
            //     top: e.pageY + 12,
            //     left: e.pageX + 12,
            // });

            // $("." + className).addClass("active");
            $dom.addClass("active");
        }, function () {
            // $tooltip.fadeOut();

            // $("." + className).removeClass("active");
            $dom.removeClass("active");
        });

        $dom.on("click", function (e) {
            e.stopPropagation();
            var f = Agent.functionWithId(node.nodeId);
            EditorInterface.revealFunction(f, function () {
                EditorInterface.currentEditor()._codeMirror.setSelection(
                    { line: f.start.line - 1, ch: f.start.column },
                    { line: f.end.line - 1, ch: f.end.column }
                );
            });
        });

        node.children.forEach(function (child) {
            $dom.append(_renderNode(child));
        });

        return $dom;
    }

    function _renderRoot(root) {
        var $dom = $("<div />");

        var events = _allEvents([root]);

        if (events.length > 0) {
            $dom.append($("<div class='caption' />").text(events.join(", ")));
        }
        $dom.append(_renderNode(root));

        return $dom;
    }

    function _updateDisplay(newRoots) {
        if (newRoots) {
            newRoots.forEach(function (root) {
                $container.append(_renderRoot(root).hide().fadeIn());
            });
        } else {
            $container.empty();
            // erase and render all of them
        }
        // $panel.animate({ scrollLeft: $panel[0].scrollWidth }, { duration: 200 });
        $panel.scrollLeft($panel[0].scrollWidth);
    }

    function _setPanelVisibility() {
        panel.setVisible(_haveData());
    }

    function init() {
        $panel = $("<div id='theseus-fcg-panel' class='bottom-panel no-focus' />");
        panel = PanelManager.createBottomPanel("theseus.fcg-panel", $panel, 80);
        $panel.css({ overflow: "scroll" });

        $container = $("<div class='container' />").appendTo($panel);
        $tooltip = $("<div class='tooltip' />").appendTo($panel);

        fcgHandle = AgentHandle.trackFileCallGraph(100);
        $(fcgHandle).on("data", function (ev, data) {
            _fcgReceived(data.agent, data.data);
        });
        $(fcgHandle).on("agentDisconnected", function (ev, agent) {
            _agentLeft(agent);
        });
    }

    exports.init = init;
});

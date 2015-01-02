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
    var EpochPanel      = require("./EpochPanel");
    var ExtensionUtils  = brackets.getModule("utils/ExtensionUtils");
    var Main            = require("../main");
    var Panel           = require("./Panel");
    var Popup           = require("./Popup").Popup;
    var Util            = require("./Util");
    var Strings         = require("./strings");
    var StringUtils     = brackets.getModule("utils/StringUtils");

    require("./lib/moment");
    require("./lib/konami");

    var $exports = $(exports);
    var _enabled = false;
    var _functionsInFile = [];
    var _deadCodeMarks = {}; // node id -> mark
    var _logHandle;
    var _loggedNodes = [], _loggedEventNames = [], _loggingExceptions = false, _loggingConsoleLogs = false;
    var _nodeGlyphs = {}; // node id -> glyph object
    var _variablesPanel;

    var _colors = "#1488d8 #ff7f0e #1aaf1a #e21d61 #984fd9 #BE6818 #de55b4 #9b9b9b #B8B905 #17becf #000000".split(" ");
    var _nextColor = 0;
    var _shapes = ["circle", "square"];
    var _nextShape = 0;

    function _sanitizeId(id) {
        return id.replace(/[^a-z0-9]/g, "_");
    }

    function _domIdForNodeId(id) {
        return "theseus-call-count-" + _sanitizeId(id);
    }

    function _getNodeMarker(id) {
        return $(document.getElementById(_domIdForNodeId(id)));
    }

    function _nodeGlyph(nodeId) {
        if (!(nodeId in _nodeGlyphs)) {
            _nodeGlyphs[nodeId] = {
                shape: _shapes[_nextShape],
                color: _colors[_nextColor],
            };
            _nextShape = (_nextShape + 1) % _shapes.length;
            _nextColor = (_nextColor + 1) % _colors.length;
        }
        return _nodeGlyphs[nodeId];
    }

    function _svgForGlyph(glyph, size) {
        if (glyph.shape === "circle") {
            if (size === "tiny") {
                return '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" class="glyph"><circle cx="5" cy="5" r="5" fill="' + glyph.color + '" /></svg>';
            } else {
                return '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="10"><circle cx="5" cy="5" r="5" fill="' + glyph.color + '" /></svg>';
            }
        } else if (glyph.shape === "square") {
            if (size === "tiny") {
                return '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" class="glyph"><rect x="1" y="1" width="8" height="8" fill="' + glyph.color + '" /></svg>';
            } else {
                return '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="10"><rect x="1" y="1" width="8" height="8" fill="' + glyph.color + '" /></svg>';
            }
        }
    }

    function _resetLogQuery() {
        _logHandle = undefined;
        _variablesPanel.clearLogs();
    }

    function _refreshLogQuery() {
        Agent.trackLogs({
            ids: _loggedNodes,
            eventNames: _loggedEventNames,
            exceptions: _loggingExceptions,
            logs: _loggingConsoleLogs,
        }, function (handle) {
            _logHandle = handle;
        });
    }

    function _triggerQueryChangeEvent() {
        var query = {
            ids: _loggedNodes,
            eventNames: _loggedEventNames,
            exceptions: _loggingExceptions,
            logs: _loggingConsoleLogs,
        };
        $exports.triggerHandler("queryChanged", [query]);
    }

    function _gutterCallCountClicked(e) {
        _resetLogQuery();

        var nodeId = $(this).attr("data-node-id");

        var node = Agent.functionWithId(nodeId);
        $exports.triggerHandler("_gutterCallCountClicked", node);

        // var popup = new Popup();
        // popup.$dom.addClass("theseus-popup");
        // popup.$dom.append("You win the game!");
        // popup.show({ x: e.pageX + 10, y: e.pageY + 10 });

        var idx = _loggedNodes.indexOf(nodeId);
        if (idx === -1) {
            _loggedNodes.push(nodeId);
            $(this).toggleClass("set", true);
            $exports.triggerHandler("_functionAddedToQuery", { node: node, allNodeIds: _loggedNodes.slice() });
        } else {
            _loggedNodes.splice(idx, 1);
            $(this).toggleClass("set", false);
            $exports.triggerHandler("_functionRemovedFromQuery", { node: node, allNodeIds: _loggedNodes.slice() });
        }

        if (_queryIsEmpty()) {
            Panel.toggle(false);
        } else {
            Panel.toggle(true);
            _refreshLogQuery();
            EditorInterface.reveal({ line: node.start.line, ch: 0 });
            // EditorInterface.revealFunction(node);
        }

        _triggerQueryChangeEvent();
    }

    var pillHoverMarker;
    function _gutterCallCountMouseOver(e) {
        var nodeId = $(this).attr("data-node-id");
        var node = Agent.functionWithId(nodeId);
        var editor = EditorInterface.currentEditor();

        if (node && editor) {
            var from = { line: node.start.line - 1, ch: node.start.column };
            var to = { line: node.end.line - 1, ch: node.end.column };
            var markOptions = { className: 'theseus-hover-marker' };
            pillHoverMarker = editor._codeMirror.markText(from, to, markOptions);
        }
    }

    function _gutterCallCountMouseOut(e) {
        if (pillHoverMarker) {
            pillHoverMarker.clear();
        }
        pillHoverMarker = undefined;
    }

    function _editorChanged(event, editor, oldEditor, path) {
        if (oldEditor) {
            cleanupEditor(oldEditor);
        }

        if (editor) {
            setupEditor(editor);
        }

        function cleanupEditor(editor) {
            // clear old marks
            for (var id in _deadCodeMarks) {
                _deadCodeMarks[id].clear();
            }

            // clear all gutter markers
            editor._codeMirror.clearGutter("CodeMirror-linenumbers");

            // reset to default values
            _functionsInFile = [];
            _deadCodeMarks = {};
        }

        function setupEditor(editor) {
            // get the functions in this file
            _functionsInFile = Agent.functionsInFile(path).sort(function (a, b) { return a.start.line - b.start.line });

            // add gutter markers showing call counts
            // console.log("gutters", editor._codeMirror.getOption("gutters"));
            var usedLines = {};
            _functionsInFile.forEach(function (node) {
                if (usedLines[node.start.line]) return;
                usedLines[node.start.line] = true;

                var $glyph = $(_svgForGlyph(_nodeGlyph(node.id), "tiny"));
                var $dom = $("<span class='uninitialized uninitialized-exceptions none theseus-call-count' id='" + _domIdForNodeId(node.id) + "' data-node-id='" + node.id + "'><span class='counts'>" + Strings.UI_NO_CALLS + "</span></span>");
                $dom.append($glyph);
                editor._codeMirror.setGutterMarker(node.start.line - 1, "CodeMirror-linenumbers", $dom.get(0));
            });

            // mark dead functions
            var start = new Date();
            var timeSinceStart = function () { return (new Date() - start) / 1000 };
            var hits = Agent.cachedHitCounts();
            for (var i in _functionsInFile) {
                var node = _functionsInFile[i];
                if (!(node.id in hits)) {
                    var from = { line: node.start.line - 1, ch: node.start.column };
                    var to = { line: node.end.line - 1, ch: node.end.column };
                    var markOptions = {
                        className: 'theseus-dead',
                        inclusiveLeft: false,
                        inclusiveRight: false,
                    };
                    _deadCodeMarks[node.id] = editor._codeMirror.markText(from, to, markOptions);
                }

                if (timeSinceStart() > 1) break;
            }
        }
    }

    setInterval(function () {
        if (Agent.isReady()) {
            // TODO: don't call again if still waiting on a response
            Agent.refreshHitCounts(function (hits, hitDeltas) {
                // remove the marks for functions that are no longer dead
                for (var id in _deadCodeMarks) {
                    if (hits[id] > 0) {
                        _deadCodeMarks[id].clear();
                        delete _deadCodeMarks[id];
                    }
                }

                // update the call counts in the sidebar
                for (var id in hitDeltas) {
                    var count = hits[id] || 0;
                    var html = " " + (count === 0 ? Strings.UI_NO_CALLS : (count === 1 ? Strings.UI_SINGLE_CALL : StringUtils.format(Strings.UI_MULTIPLE_CALLS, count)));
                    _getNodeMarker(id).toggleClass("none", count === 0)
                                      .toggleClass("uninitialized", false)
                                      .find(".counts").html(html);
                }

                // update call counts that were off-screen but now are back
                var uninitialized = $(".CodeMirror").find(".theseus-call-count.uninitialized");
                uninitialized.each(function () {
                    $(this).toggleClass("uninitialized", false);
                    var id = $(this).attr("data-node-id");
                    var count = hits[id] || 0;
                    var html = " " + (count === 0 ? Strings.UI_NO_CALLS : (count === 1 ? Strings.UI_SINGLE_CALL : StringUtils.format(Strings.UI_MULTIPLE_CALLS, count)));
                    _getNodeMarker(id).toggleClass("none", count === 0)
                                      .toggleClass("set", _loggedNodes.indexOf(id) !== -1)
                                      .toggleClass("uninitialized", false)
                                      .find(".counts").html(html);
                });
            });

            Agent.refreshExceptionCounts(function (counts, deltas) {
                // add the 'exception' class to all the pills that threw exceptions this cycle
                for (var id in deltas) {
                    _getNodeMarker(id).addClass("exception")
                                      .toggleClass("uninitialized-exceptions", false);
                }

                // update the pills that were reset because they scrolled off-screen
                var uninitialized = $(".CodeMirror").find(".theseus-call-count.uninitialized-exceptions");
                uninitialized.each(function () {
                    var id = $(this).attr("data-node-id");
                    if (id in counts) {
                        _getNodeMarker(id).addClass("exception")
                                          .toggleClass("uninitialized-exceptions", false);
                    }
                });
            });

            if (_logHandle !== undefined) {
                Agent.refreshLogs(_logHandle, 20, function (results) {
                    if (results && results.length > 0) {
                        _variablesPanel.appendLogs(results);
                    }
                });
            }
        }
    }, 100);

    function _receivedScriptInfo(event, path) {
        if (Agent.couldBeRemotePath(EditorInterface.currentPath(), path)) {
            _editorChanged(undefined, EditorInterface.currentEditor(), EditorInterface.currentEditor(), EditorInterface.currentPath());
        }

        if (_loggingExceptions || _loggingConsoleLogs) {
            // we assume for most queries that a particular file will only be
            // executed by a single agent, so we don't reload queries
            // automatically when a new agent connects. however, it's much more
            // common for log statements and exceptions to be exceptions
            _resetLogQuery();
            _variablesPanel.clearDeadLogs();
            _refreshLogQuery();
        }
    }

    function _scriptWentAway(event, path) {
        if (Agent.couldBeRemotePath(EditorInterface.currentPath(), path)) {
            _editorChanged(undefined, EditorInterface.currentEditor(), EditorInterface.currentEditor(), EditorInterface.currentPath());
        }

        var originalNodeCount = _loggedNodes.length,
            originalEventCount = _loggedEventNames.length,
            originalLoggingExceptions = _loggingExceptions,
            originalLoggingLogs = _loggingConsoleLogs;
        _loggedNodes = _loggedNodes.filter(function (nodeId) {
            return Agent.functionWithId(nodeId);
        });
        _loggedEventNames = _loggedEventNames.filter(function (name) {
            return EpochPanel.hasEvent(name);
        });
        _loggingExceptions = _loggingExceptions && EpochPanel.hasExceptions();
        _loggingConsoleLogs = _loggingConsoleLogs && EpochPanel.hasLogs();

        if (_loggedNodes.length !== originalNodeCount || _loggedEventNames.length !== originalEventCount || _loggingExceptions !== originalLoggingExceptions || _loggingConsoleLogs !== originalLoggingLogs) {
            _resetLogQuery();

            if (_queryIsEmpty()) {
                Panel.toggle(false);
            } else {
                _variablesPanel.clearDeadLogs(); // do this immediately so that the user can't click on functions that are no longer there
                _refreshLogQuery();
            }

            _triggerQueryChangeEvent();
        } else if (_loggingExceptions || _loggingConsoleLogs) {
            // we might have exceptions or console.logs in the log from this script, but
            // we can't currently tell. so let's refresh just in case.
            _resetLogQuery();
            _variablesPanel.clearDeadLogs();
            _refreshLogQuery();
        }
    }

    var LOG_ROOT_SUBTREE = "---root---";
    _variablesPanel = {
        add: function ($parent) {
            this.$dom = $("<div />").appendTo($parent);
            this.$log = $("<div />").appendTo(this.$dom);
            this.$backtrace = $("<div />").appendTo(this.$dom).hide();
            this._reset();

            this.$dom.on("click", ".vars-table .objects-bad", function () {
                alert(Strings.UI_NO_MORE_INSPECTION);
                $exports.triggerHandler("_inspectionLimitReached");
            });

            // http://stackoverflow.com/questions/8858994/let-user-scrolling-stop-jquery-animation-of-scrolltop
            this.$dom.bind("scroll mousedown DOMMouseScroll mousewheel keyup", function (e) {
                if (e.which > 0 || e.type === "mousedown" || e.type === "mousewheel") {
                    this._animating = false;
                    this.$dom.stop(true /* clear queue */);
                }
            }.bind(this));
        },

        _reset: function () {
            this.logs = [];
            this.rootLogs = []; // those without parents in the query
            this.logsByInvocationId = {};

            this.subtrees = {}; // { invocationId: { root: ..., children: [{ dom: ..., timestamp: ... }] } }
            this.subtrees[LOG_ROOT_SUBTREE] = { root: this.$log, children: [] };
        },

        remove: function () {
            this.$dom.remove();
        },

        close: function () {
            _loggedNodes = [];
            _loggedEventNames = [];
            _loggingExceptions = false;
            _loggingConsoleLogs = false;

            _resetLogQuery();
            _refreshLogQuery();
            _showPanelIfAppropriate();
            _triggerQueryChangeEvent();

            $(".theseus-call-count").removeClass("set");
        },

        toggled: function (show) {
            if (!show) {
                this.$backtrace.hide();
                this.$log.show();
            }
        },

        clearLogs: function () {
            if (this.$log) this.$log.empty();
            this._reset();
        },

        clearDeadLogs: function () {
            var isActive = function (log) { return Agent.functionWithId(log.nodeId); };

            this.logs = this.logs.filter(isActive);
            this.rootLogs = this.rootLogs.filter(isActive);
            for (var id in this.logsByInvocationId) {
                if (!isActive(this.logsByInvocationId[id])) {
                    delete this.logsByInvocationId[id];
                }
            }

            this.render();
        },

        appendLogs: function (logs) {
            var scrollBottom = this.$dom.scrollTop() + this.$dom.innerHeight();
            var logBottom = this.$log.innerHeight();
            var autoScroll = this._animating || (scrollBottom >= logBottom);

            this.logs.push.apply(this.logs, logs);
            logs.forEach(function (log) {
                this.logsByInvocationId[log.invocationId] = log;

                // add as child to the parents
                log.childrenLinks = [];
                var parentsFound = false;
                if (log.parents) {
                    log.parents.forEach(function (parentLink) {
                        var parent = this.logsByInvocationId[parentLink.invocationId];
                        if (parent) {
                            parentsFound = true;
                            parent.childrenLinks.push({
                                invocationId: log.invocationId,
                                type: parentLink.type,
                            });
                        }
                    }.bind(this));
                }
                if (!parentsFound) {
                    this.rootLogs.push(log);
                }
            }.bind(this));

            this.render(logs);

            if (autoScroll) {
                this.$dom.stop(true /* clear queue */, true /* jump to end */);
                this._animating = true;
                this.$dom.animate({ scrollTop: this.$dom[0].scrollHeight }, { duration: 200, done: function () {
                    this._animating = false;
                }.bind(this)});
            }
        },

        // call with no argument to clear the log an render everything over
        render: function (newLogs) {
            if (newLogs) {
                newLogs.forEach(function (log) {
                    var subtree = this.subtrees[LOG_ROOT_SUBTREE];
                    if (log.parents) {
                        var parentLink = log.parents[0]; // XXX
                        var t = this.subtrees[parentLink.invocationId];
                        if (t) {
                            subtree = t;
                        } else {
                            console.error("[theseus] invocation parent DOM not found!");
                        }
                    }

                    var $entryDom = this._entryDom(log, { link: parentLink });
                    var $entryChildrenDom = $("<div class='indented' />");
                    var childEntry = { insertAfter: $entryChildrenDom, timestamp: log.timestamp };

                    this.subtrees[log.invocationId] = { root: $entryChildrenDom, children: [] };

                    var inserted = false;
                    if (subtree.children.length > 0) {
                        for (var i = subtree.children.length - 1; i >= 0; i--) {
                            if (subtree.children[i].timestamp <= log.timestamp) {
                                $entryDom.insertAfter(subtree.children[i].insertAfter);
                                $entryChildrenDom.insertAfter($entryDom);
                                subtree.children.splice(i + 1, 0, childEntry);
                                inserted = true;
                                break;
                            }
                        }
                    }
                    if (!inserted) {
                        $entryDom.appendTo(subtree.root);
                        $entryChildrenDom.appendTo(subtree.root);
                        subtree.children.push(childEntry);
                    }
                }.bind(this));
            } else {
                this.$log.empty();
                this.render(this.logs);
            }
        },

        _showBacktrace: function (invocationId) {
            this.$log.hide();
            this.$backtrace.show();
            this.$dom.scrollTop(0);
            this.$backtrace.append(Strings.UI_BACKTRACE_LOADING);
            Agent.backtrace({ invocationId: invocationId, range: [0, 20] }, function (backtrace) {
                this.$backtrace.empty();
                this.$backtrace.append($("<p />").append($("<a />").html("&larr; " + Strings.UI_BACKTRACE_BACK).click(function () {
                    this.$log.show();
                    this.$backtrace.hide();
                }.bind(this))));
                (backtrace || []).reverse().forEach(function (log) {
                    this.$backtrace.append(this._entryDom(log, { backtraceLinks: false }));
                }.bind(this));
            }.bind(this));
        },

        _entryDom: function (log, options) {
            options = Util.mergeInto(options, {
                backtraceLinks: true
            });

            var f = Agent.functionWithId(log.nodeId);
            if (!f) {
                return $("<div />");
            }

            var $container = $("<div />").addClass("source-" + log.source);
            var $table = $("<table class='vars-table' />").appendTo($container);
            var $row1 = $("<tr />").appendTo($table);
            var $nameCell = $("<th class='fn' />").addClass("theseus-selectable").appendTo($row1);
            var $timeCell = $("<th class='timestamp' />").appendTo($row1);

            $nameCell.append(_svgForGlyph(_nodeGlyph(log.nodeId)));

            var ts = new Date();
            ts.setTime(log.timestamp);
            $timeCell.addClass("theseus-selectable").text(moment(ts).format(Strings.UI_DEFAULT_TIME_FORMAT));

            if (log.nodeId === "log") {
                $nameCell.append("console.log")
            } else {
                var $nameLink = $("<span class='fn' />").text(f.name || "(anonymous)").appendTo($nameCell);
                $nameCell.append(" ");
                $nameCell.append($("<span class='path' />").text("(" + f.path.split("/").slice(-1) + ":" + f.start.line + ")"));
                $nameCell.on("click", function () {
                    EditorInterface.revealFunction(f, function (editor) {
                        editor.setCursorPos(f.start.line - 1, f.start.column, false /* center view */);
                        editor.focus();
                    });
                });
            }

            for (var i = 0; i < log.arguments.length; i++) {
                var arg = log.arguments[i];

                if (log.nodeId === "log") {
                    $row1.append($("<td />").append(this._valueDom(arg.value)));
                } else {
                    var name = arg.name || ("arguments[" + i + "]");
                    $row1.append($("<td />").append($("<strong />").addClass("theseus-selectable").text(name + " = "))
                                            .append(this._valueDom(arg.value)));
                }
            }
            if (log.returnValue) {
                $row1.append($("<td />").append($("<strong />").text(Strings.UI_DETAILS_RETURN_VALUE + " = "))
                                        .append(this._valueDom(log.returnValue)));
            } else if (log.exception) {
                $row1.append($("<td />").append($("<strong style='color: red' />").text(Strings.UI_DETAILS_EXCEPTION + " = "))
                                        .append(this._valueDom(log.exception, { wholePreview: true })));
            }
            if (log.this) {
                $row1.append($("<td />").append($("<strong />").addClass("theseus-selectable").text("this = "))
                                        .append(this._valueDom(log.this)));
            }

            if (options.backtraceLinks && log.nodeId !== "log") {
                $row1.append($("<td class='backtrace-link' />").append($("<a />").html(Strings.UI_BACKTRACE + " &rarr;").click(function () {
                    this._showBacktrace(log.invocationId);
                }.bind(this))));
            }

            if (options.link && options.link.type === 'async') {
                var $image = $("<img />").attr("src", ExtensionUtils.getModuleUrl(module, "images/async.png"));
                $image.css({
                    "margin-left" : 4,
                    "vertical-align" : "middle",
                });
                $nameCell.append(" ");
                $nameCell.append($image);
            }

            return $container;
        },

        _valueDom: function (val, options) {
            if (val.type === "number" || val.type === "boolean") {
                return $("<span />").addClass("theseus-selectable").text(val.value);
            } else if (val.type === "string") {
                return this._stringDom(val);
            } else if (val.type === "undefined") {
                return $("<span />").addClass("theseus-selectable").text("undefined");
            } else if (val.type === "null") {
                return $("<span />").addClass("theseus-selectable").text("null");
            } else if (val.type === "object") {
                return this._objectInspectorDom(val, options);
            } else if (val.type === "function") {
                var $image = $("<img />").attr("src", ExtensionUtils.getModuleUrl(module, "images/arrow.png"));
                var $dom = $("<span />").toggleClass("objects-bad", true)
                                        .append($image)
                                        .append(" " + Strings.UI_DETAILS_FUNCTION);
                return $dom;
            }
            return $("<span />").text(JSON.stringify(val));
        },

        _stringDom: function (val) {
            var cutoff = 100;
            var encoded = JSON.stringify(val.value);

            var $dom = $("<div />").css({
                "display" : "inline-block",
                "vertical-align" : "top",
                "max-width" : 200,
                "word-wrap" : "break-word",
            });

            if (encoded.length > cutoff) {
                var arrowURL = ExtensionUtils.getModuleUrl(module, "images/arrow.png");

                var excerpt = encoded.slice(0, cutoff);

                var $image = $("<img />").attr("src", arrowURL).css({
                    "-webkit-transform-origin" : "40% 50% 0",
                    "-webkit-transition" : "all 100ms",
                });
                var $title = $("<span />").appendTo($dom)
                                          .append($image)
                                          .append("&nbsp;");
                var $text = $("<span />").appendTo($title).text(excerpt).addClass("theseus-selectable");
                var $dots = $("<span />").appendTo($title).html(" &#8230;");

                var showing = false;
                $image.on("click", function () {
                    if (showing) {
                        $image.css("-webkit-transform", "");
                        $text.text(excerpt);
                        $dots.show();
                    } else {
                        $image.css("-webkit-transform", "rotate(90deg)");
                        $text.text(encoded);
                        $dots.hide();
                    }
                    showing = !showing;
                }.bind(this));
                $image.css({ cursor: "pointer" });
            } else {
                return $dom.addClass("theseus-selectable").text(encoded);
            }

            return $dom;
        },

        _objectInspectorDom: function (val, options) {
            options = (options || {});

            // http://stackoverflow.com/questions/18082/validate-numbers-in-javascript-isnumeric
            function isNumber(n) {
                return !isNaN(parseFloat(n)) && isFinite(n);
            }

            var arrowURL = ExtensionUtils.getModuleUrl(module, "images/arrow.png");

            var preview = val.preview;
            if (preview === null || preview === undefined) preview = "";
            preview = preview.trim();
            if (preview.length === 0) preview = "[Object]";
            if (preview.length > 20 && !options.wholePreview) preview = val.preview.slice(0, 20) + "...";

            var $dom = $("<div />").css({ "display" : "inline-block", "vertical-align" : "top" });
            var $image = $("<img />").attr("src", arrowURL).css({
                "-webkit-transform-origin" : "40% 50% 0",
                "-webkit-transition" : "all 100ms",
            });
            var $title = $("<span />").appendTo($dom)
                                      .append($image)
                                      .attr("title", val.preview);
            var $preview = $("<span />").text(" " + preview).appendTo($title);
            var $expanded = $("<div />").appendTo($dom);

            if ("ownProperties" in val) {
                var showing = false;
                $title.on("click", function () {
                    if (showing) {
                        $image.css("-webkit-transform", "");
                        $expanded.empty();
                    } else {
                        $image.css("-webkit-transform", "rotate(90deg)");

                        var names = [];
                        for (var name in val.ownProperties) {
                            names.push(name);
                        }
                        names.sort(function (a, b) {
                            if (isNumber(a) && isNumber(b)) {
                                return parseInt(a) - parseInt(b)
                            }
                            if (a < b) return -1;
                            if (a > b) return 1;
                            return 0;
                        });
                        names.forEach(function (name) {
                            $expanded.append($("<div />").append($("<strong />").text(name + " = ").addClass("theseus-selectable"))
                                                         .append(this._valueDom(val.ownProperties[name])));
                        }.bind(this));
                    }
                    showing = !showing;
                }.bind(this));
                $title.css({ cursor: "pointer" });
            } else {
                $dom.toggleClass("objects-bad", true);
            }

            if ("truncated" in val) {
                var $icon = $("<img />").attr("src", ExtensionUtils.getModuleUrl(module, "images/warning-icon.png"));
                var messages = [];
                if (val.truncated.length && val.truncated.length.amount) {
                    messages.push(StringUtils.format(Strings.UI_ITEMS_TRUNCATED_FROM_LOG, val.truncated.length.amount));
                }
                if (val.truncated.keys && val.truncated.keys.amount) {
                    messages.push(StringUtils.format(Strings.UI_KEYS_TRUNCATED_FROM_LOG, val.truncated.keys.amount));
                }
                $icon.prop("title", messages.join(" "));

                $title.after($icon);
                $title.after(" ");
            }
            return $dom;
        },
    };

    new Konami(function () {
        $(document.body).addClass("waggle");
    });

    function _queryIsEmpty() {
        return _loggedNodes.length === 0 && _loggedEventNames.length === 0 && !_loggingExceptions && !_loggingConsoleLogs;
    }

    function _showPanelIfAppropriate() {
        if (_queryIsEmpty()) {
            Panel.toggle(false);
        } else {
            Panel.toggle(true);
        }
    }

    function _reset() {
        _functionsInFile = [];
        for (var id in _deadCodeMarks) {
            _deadCodeMarks[id].clear();
            delete _deadCodeMarks[id];
        }

        var _editor = EditorInterface.currentEditor();
        if (_editor) {
            _editor._codeMirror.clearGutter("CodeMirror-linenumbers");
        }

        _logHandle = undefined; // TODO: clear query
        _loggedNodes = [];
        _loggedEventNames = [];
        _loggingExceptions = false;
        _loggingConsoleLogs = false;

        Panel.toggle(false);
        _variablesPanel.clearLogs();
    }

    function _enable() {
        _enabled = true;

        $(Agent).on("receivedScriptInfo", _receivedScriptInfo);
        $(Agent).on("scriptWentAway", _scriptWentAway);
        $(EditorInterface).on("editorChanged", _editorChanged);

        _editorChanged(undefined, EditorInterface.currentEditor(), EditorInterface.currentEditor(), EditorInterface.currentPath());

        Panel.setPanel(_variablesPanel);
    }

    function _disable() {
        _enabled = false;

        $(Agent).off("receivedScriptInfo", _receivedScriptInfo);
        $(Agent).off("scriptWentAway", _scriptWentAway);
        $(EditorInterface).off("editorChanged", _editorChanged);

        _reset();
    }

    function init() {
        $(Main).on("enable", _enable);
        $(Main).on("disable", _disable);

        $(EditorInterface).on("editorChanged", _editorChanged);

        $(document).on("click", ".theseus-call-count", _gutterCallCountClicked);
        $(document).on("mouseover", ".theseus-call-count", _gutterCallCountMouseOver);
        $(document).on("mouseout", ".theseus-call-count", _gutterCallCountMouseOut);

        $(EpochPanel).on("eventNameClicked", function (ev, name) {
            var i = _loggedEventNames.indexOf(name);
            if (i === -1) {
                _loggedEventNames.push(name);
            } else {
                _loggedEventNames.splice(i, 1);
            }
            _resetLogQuery();
            _refreshLogQuery();
            _showPanelIfAppropriate();
            _triggerQueryChangeEvent();
        });

        $(EpochPanel).on("exceptionsClicked", function (ev, name) {
            _loggingExceptions = !_loggingExceptions;
            _resetLogQuery();
            _refreshLogQuery();
            _showPanelIfAppropriate();
            _triggerQueryChangeEvent();
        });

        $(EpochPanel).on("logsClicked", function (ev, name) {
            _loggingConsoleLogs = !_loggingConsoleLogs;
            _resetLogQuery();
            _refreshLogQuery();
            _showPanelIfAppropriate();
            _triggerQueryChangeEvent();
        });
    }

    function unload() {
        $(Main).off("enable", _enable);
        $(Main).off("disable", _disable);
    }

    exports.init = init;
    exports.unload = unload;
});

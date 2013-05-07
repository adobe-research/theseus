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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define */

define(function (require, exports, module) {
    var Agent              = require("Agent");
    var ChromeAgent        = require("Agent-chrome");
    var Dialogs            = brackets.getModule("widgets/Dialogs");
    var EditorInterface    = require("EditorInterface");
    var ExtensionUtils     = brackets.getModule("utils/ExtensionUtils");
    var Inspector          = brackets.getModule("LiveDevelopment/Inspector/Inspector");
    var Main               = require("main");
    var NodeAgent          = require("Agent-node");
    var Panel              = require("Panel");
    var PreferencesManager = brackets.getModule("preferences/PreferencesManager")
    var UI                 = require("UI");

    var $exports = $(exports);

    var _properties = {};
    var _eventQueue = [];
    var _anonymousIds = {};

    var UPLOAD_CHECK_INTERVAL = 10000;
    var UPLOAD_RETRY_INTERVAL = 60000;

    function _loadPreferences() {
        _prefs = PreferencesManager.getPreferenceStorage("com.adobe.theseus.usage-reporting", {
            agreed: {
                anonymous: false,
                non_anonymous: false,
            },
            shown_agreement: false,
            show_again: true,
            user_id: _guid(),
        });
    }

    // from http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
    // could be wrong, but probably random enough for me
    function _guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                       .toString(16)
                       .substring(1);
        }

        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
               s4() + '-' + s4() + s4() + s4();
    }

    /**
     * we want to be able to correlate all the events relating to a particular
     * node, but the node ID includes the filename. instead of sending the node
     * ID, the _anonymousIds has maps them to GUIDs.
     **/
    function _anonymousId(str) {
        var key = '_!' + str;
        if (!(key in _anonymousIds)) {
            _anonymousIds[key] = _guid();
            if (/\.js$/.test(str)) {
                _anonymousIds[key] += '.js';
            } else if (/\.html$/.test(str)) {
                _anonymousIds[key] += '.html';
            }
        }
        return _anonymousIds[key];
    }

    /**
     * name is the name of the event
     * properties is an object of key/value pairs
     */
    function _recordEvent(name, properties) {
        var props = {};
        props["_id"] = _guid();
        props["_date"] = new Date().getTime();
        for (var k in _properties) { props[k] = _properties[k]; }
        for (var k in properties) { props[k] = properties[k]; }
        console.log(name, props);
        _eventQueue.push({ name: name, properties: props });
    }

    /**
     * properties is an object of key/value pairs
     * properties persist for the current Brackets session
     */
    function _registerProperties(properties) {
        for (var k in properties) {
            _properties[k] = properties[k];
        }
    }

    /** propertyNames is an array of names of (possibly registered) properties */
    function _unregisterProperties(propertyNames) {
        for (var i in propertyNames) {
            delete _properties[propertyNames[i]];
        }
    }

    function _uploadEvents() {
        var events = _eventQueue;
        _eventQueue = [];

        if (events.length > 0) {
            var post = $.post("http://theseus-usage.alltom.com/v1/events", { events: events });

            post.fail(function () {
                _eventQueue = events.concat(_eventQueue);
                setTimeout(_uploadEvents, UPLOAD_RETRY_INTERVAL);
            });

            post.done(function () {
                setTimeout(_uploadEvents, UPLOAD_CHECK_INTERVAL);
            });
        } else {
            setTimeout(_uploadEvents, UPLOAD_CHECK_INTERVAL);
        }
    }

    function _listenForEvents() {
        $(Main).on("enable", function () { _recordEvent("Theseus Enable"); _registerProperties({ theseusEnabled: true }); });
        $(Main).on("disable", function () { _recordEvent("Theseus Disable"); _registerProperties({ theseusEnabled: false }); });

        // $(Agent).on("receivedScriptInfo", function (e, path) { _recordEvent("Script Connected", { scriptPath: _anonymousId(path) }) });
        // $(Agent).on("scriptWentAway", function (e, path) { _recordEvent("Script Went Away", { scriptPath: _anonymousId(path) }) });
        $(NodeAgent).on("connect", function () { _recordEvent("Node.js Connected"); _registerProperties({ nodeConnected: true }); })
        $(NodeAgent).on("disconnect", function () { _registerProperties({ nodeConnected: false }); _recordEvent("Node.js Disconnected"); })
        $(ChromeAgent).on("connect", function () { _recordEvent("Chrome Connected"); _registerProperties({ chromeConnected: true }); })
        $(ChromeAgent).on("disconnect", function () { _registerProperties({ chromeConnected: false }); _recordEvent("Chrome Disconnected"); })

        $(UI).on("_gutterCallCountClicked", function (e, node) { _recordEvent("Gutter Call Count Clicked", { nodeType: node.type, nodeId: _anonymousId(node.id), nodePath: _anonymousId(node.path) }); });
        $(UI).on("_functionAddedToQuery", function (ev, o) { _recordEvent("Function Added To Query", { nodeId: _anonymousId(o.node.id), nodePath: _anonymousId(o.node.path) }); _registerProperties({ selectedNodes: o.allNodeIds.map(_anonymousId) }); });
        $(UI).on("_functionRemovedFromQuery", function (ev, o) { _registerProperties({ selectedNodes: o.allNodeIds.map(_anonymousId) }); _recordEvent("Function Removed From Query", { nodeId: _anonymousId(o.node.id), nodePath: _anonymousId(o.node.path) }); });

        // $(EditorInterface).on("editorChanged", function (ev, ed, preved, path) { _recordEvent("File Opened", { filePath: _anonymousId(path) }); _registerProperties({ openFilePath: _anonymousId(path) }); });
    }

    function init() {
        _loadPreferences();

        _registerProperties({
            _theseusVersion: Main.version,
            _userId: _prefs.getValue("user_id"),
            _sessionId: _guid(),
        });
        _recordEvent("Theseus Usage Reporting Init");

        _listenForEvents();

        _uploadEvents(); // kick-off
    }

    exports.init = init;

    exports.recordEvent = _recordEvent;
    exports.registerProperties = _registerProperties;
    exports.unregisterProperties = _unregisterProperties;
});

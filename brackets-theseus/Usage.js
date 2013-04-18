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
    var Dialogs            = brackets.getModule("widgets/Dialogs");
    var EditorInterface    = require("EditorInterface");
    var ExtensionUtils     = brackets.getModule("utils/ExtensionUtils");
    var Inspector          = brackets.getModule("LiveDevelopment/Inspector/Inspector");
    var Main               = require("main");
    var Panel              = require("Panel");
    var PreferencesManager = brackets.getModule("preferences/PreferencesManager")
    var UI                 = require("UI");

    var $exports = $(exports);

    var _properties = {};
    var _eventQueue = [];

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
            var post = $.post("http://alltom.com:9999/events", { events: events });

            post.fail(function () {
                _eventQueue = events.concat(_eventQueue);
            });

            post.always(function () {
                setTimeout(_uploadEvents, 1000);
            });
        } else {
            setTimeout(_uploadEvents, 1000);
        }
    }

    function _listen() {
        $(Main).on("enable", function () { _recordEvent("Theseus Enable"); _registerProperties({ theseus_enable: true }); });
        $(Main).on("disable", function () { _recordEvent("Theseus Disable"); _registerProperties({ theseus_enable: false }); });

        $(Agent).on("receivedScriptInfo", function (e, path) { _recordEvent("Script Connected", { path: path }) });
        $(Agent).on("scriptWentAway", function (e, path) { _recordEvent("Script Went Away", { path: path }) });

        $(UI).on("_gutterCallCountClicked", function () { _recordEvent("Gutter Call Count Clicked"); });
        $(UI).on("_functionAddedToQuery", function (ev, o) { _recordEvent("Function Added To Query", { added_node: o.nodeId }); _registerProperties({ selected_nodes: o.allNodes }); });
        $(UI).on("_functionRemovedFromQuery", function (ev, o) { _recordEvent("Function Removed From Query", { removed_node: o.nodeId }); _registerProperties({ selected_nodes: o.allNodes }); });

        $(EditorInterface).on("editorChanged", function (ev, ed, preved, path) { _recordEvent("File Opened", { path: path }); _registerProperties({ open_file_path: path }); });
    }

    function init() {
        _loadPreferences();

        _registerProperties({
            theseusVersion: Main.version,
            userId: _prefs.getValue("user_id"),
            sessionId: _guid(),
        });
        _recordEvent("Theseus Usage Reporting Init");

        _listen();

        _uploadEvents();
    }

    exports.init = init;

    exports.recordEvent = _recordEvent;
    exports.registerProperties = _registerProperties;
    exports.unregisterProperties = _unregisterProperties;
});

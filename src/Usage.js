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
    var Agent              = require("./Agent");
    var ChromeAgent        = require("./Agent-chrome");
    var Dialogs            = brackets.getModule("widgets/Dialogs");
    var EditorInterface    = require("./EditorInterface");
    var ExtensionUtils     = brackets.getModule("utils/ExtensionUtils");
    var Inspector          = brackets.getModule("LiveDevelopment/Inspector/Inspector");
    var Main               = require("../main");
    var NodeAgent          = require("./Agent-node");
    var Panel              = require("./Panel");
    var UI                 = require("./UI");
    var Preferences        = require("./Preferences");

    var $exports = $(exports);

    var _started = false;
    var _properties = {};
    var _eventQueue = [];
    var _anonymousIds = {};
    var _numFailures = 0;

    var UPLOAD_CHECK_INTERVAL = 10 * 1000; // 10 seconds
    var UPLOAD_RETRY_INTERVAL = 60 * 1000; // 60 seconds after an error

    var AGREEMENT_ID = 0; // increment every time the information we report changes

    function sawAgreement() {
        return Preferences.get("usage.last_agreement_shown") === AGREEMENT_ID;
    }

    function _agreedToUsageReporting() {
        return sawAgreement() && Preferences.get("usage.usage_reporting_approved");
    }

    /**
    result = {
        usageOkay: boolean indicating that reporting anonymous usage statistics is approved,
        contactOkay: boolean indicating that contacting them is okay,
        email: string containing e-mail address, provided when contactOkay is true,
    }
    **/
    function recordAgreementResult(result) {
        Preferences.set("usage.last_agreement_shown", AGREEMENT_ID);
        Preferences.set("usage.usage_reporting_approved", result.usageOkay);
        Preferences.set("usage.research_contact_approved", result.contactOkay);
        console.log("Test");
        if (result.email === undefined) {
            Preferences.set("usage.research_contact_email", null, true);
        } else {
            Preferences.set("usage.research_contact_email", result.email, true);
        }

        if (result.usageOkay) {
            _start();
        }

        if (result.contactOkay) {
            _recordEvent("Contacting is Okay", { email: result.email });
        } else {
            _recordEvent("Contacting is Not Okay", { });
        }
    }

    /** returns the last hash passed to recordAgreementResult **/
    function lastAgreementResult() {
        return {
            usageOkay: Preferences.get("usage.usage_reporting_approved"),
            contactOkay: Preferences.get("usage.research_contact_approved"),
            email: Preferences.get("usage.research_contact_email")
        };
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
        properties || (properties = {});
        props["_id"] = _guid();
        props["_date"] = new Date().getTime();
        for (var k in _properties) { props[k] = _properties[k]; }
        for (var k in properties) { props[k] = properties[k]; }
        // console.log(name, props);
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
                _numFailures++;
                var delay = Math.pow(2, _numFailures - 1) * UPLOAD_RETRY_INTERVAL;
                setTimeout(_uploadEvents, delay);
            });

            post.done(function () {
                _numFailures = 0;
                setTimeout(_uploadEvents, UPLOAD_CHECK_INTERVAL);
            });
        } else {
            setTimeout(_uploadEvents, UPLOAD_CHECK_INTERVAL);
        }
    }

    function _listenForEvents() {
        $(Main).on("enable", function () { _recordEvent("Theseus Enable"); _registerProperties({ theseusEnabled: true }); });
        $(Main).on("disable", function () { _recordEvent("Theseus Disable"); _registerProperties({ theseusEnabled: false }); });
        $(Main).on("modeChange", function (e, modeName) { _recordEvent("Theseus Mode Change", { newMode: modeName }); _registerProperties({ mode: modeName }); });

        $(NodeAgent).on("connect", function () { _recordEvent("Node.js Connected"); _registerProperties({ nodeConnected: true }); })
        $(NodeAgent).on("disconnect", function () { _registerProperties({ nodeConnected: false }); _recordEvent("Node.js Disconnected"); })
        $(ChromeAgent).on("connect", function () { _recordEvent("Chrome Connected"); _registerProperties({ chromeConnected: true }); })
        $(ChromeAgent).on("disconnect", function () { _registerProperties({ chromeConnected: false }); _recordEvent("Chrome Disconnected"); })

        $(UI).on("_gutterCallCountClicked", function (e, node) { _recordEvent("Gutter Call Count Clicked", { nodeType: node.type }); });
        $(UI).on("_functionAddedToQuery", function (ev, o) { _recordEvent("Function Added To Query"); });
        $(UI).on("_functionRemovedFromQuery", function (ev, o) { _recordEvent("Function Removed From Query"); });
        $(UI).on("_inspectionLimitReached", function () { _recordEvent("Inspection Limit Reached"); });
    }

    function _start() {
        if (_started) {
            return;
        }

        _started = true;

        _listenForEvents();
        _uploadEvents(); // kick-off
    }

    function init() {
        var userId = Preferences.get("usage.user_id");
        if (!userId) {
            userId = _guid();
            Preferences.set("usage.user_id", userId, true);
        }

        _registerProperties({
            _theseusVersion: Main.version,
            _bracketsVersion: brackets.metadata.version,
            _userId: userId,
            _sessionId: _guid(),
            _platform: brackets.platform
        });

        if (_agreedToUsageReporting()) {
            _start();
        }
    }

    exports.init = init;
    exports.sawAgreement = sawAgreement;
    exports.recordAgreementResult = recordAgreementResult;
    exports.lastAgreementResult = lastAgreementResult;

    exports.recordEvent = _recordEvent;
    exports.registerProperties = _registerProperties;
    exports.unregisterProperties = _unregisterProperties;
});

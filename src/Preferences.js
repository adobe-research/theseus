/*
 * Copyright (c) 2014 Massachusetts Institute of Technology, Adobe Systems
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
/*global define, brackets, $ */

define(function (require, exports, module) {
    "use strict";

    var _                   = brackets.getModule("thirdparty/lodash"),
        PreferencesManager  = brackets.getModule("preferences/PreferencesManager"),
        prefs               = PreferencesManager.getExtensionPrefs("theseus"),
        stateManager        = PreferencesManager.stateManager.getPrefixedSystem("theseus");

    var preferences = {
        prefs: {
            // main.js
            "enabled":                         { "type": "boolean",  "value": true     },
            "mode":                            { "type": "string",   "value": "static" }
        },
        states: {
            // Usage.js
            "usage.user_id":                   { "type": "string",   "value": null     },
            "usage.last_agreement_shown":      { "type": "number",   "value": -1       },
            "usage.usage_reporting_approved":  { "type": "boolean",  "value": false    },
            "usage.research_contact_approved": { "type": "boolean",  "value": false    },
            "usage.research_contact_email":    { "type": "string",   "value": null     },

            // Update.js
            "update.update_ignored":           { "type": "boolean",  "value": false    },
            "update.last_ignored_version":     { "type": "string",   "value": null     },
            "update.last_checked_at":          { "type": "number",   "value": 0        }
        }
    };

    _.each(preferences.prefs, function (definition, key) {
        prefs.definePreference(key, definition.type, definition.value)
            .on("change", function () {
                $(exports).triggerHandler("change." + key);
            });
    });
    _.each(preferences.states, function (definition, key) {
        stateManager.definePreference(key, definition.type, definition.value);
    });
    prefs.save();

    function _getPrefLocation(key) {
        return preferences.prefs[key] ? prefs : stateManager;
    }
    function set(key, value, save) {
        var location = _getPrefLocation(key);
        location.set(key, value);
        if (save) {
            location.save();
        }
    }
    function get(key) {
        return _getPrefLocation(key).get(key);
    }

    exports.set = set;
    exports.get = get;
});

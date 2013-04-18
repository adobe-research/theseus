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

/**
 * provides events:
 *
 *  - enable & disable, when the extension should operate
 */

define(function (require, exports, module) {
    var Agent              = require("Agent");
    var AppInit            = brackets.getModule("utils/AppInit");
    var CommandManager     = brackets.getModule("command/CommandManager");
    var Commands           = brackets.getModule("command/Commands");
    var EditorInterface    = require("EditorInterface");
    var ExtensionUtils     = brackets.getModule("utils/ExtensionUtils");
    var Inspector          = brackets.getModule("LiveDevelopment/Inspector/Inspector");
    var Menus              = brackets.getModule("command/Menus");
    var Panel              = require("Panel");
    var PreferencesManager = brackets.getModule("preferences/PreferencesManager")
    var UI                 = require("UI");

    var $exports = $(exports);

    var THESEUS_VERSION = JSON.parse(require("text!package.json")).version;

    var _modes = {
        "static" : { name: "static", displayName: "Static" },
        "proxy" : { name: "proxy", displayName: "Proxy" },
    };
    var _orderedModes = [_modes["static"], _modes["proxy"]];
    var DEFAULT_MODE = _modes["static"];

    var ID_THESEUS_SEND_FEEDBACK   = "brackets.theseus.sendFeedback";
    var NAME_THESEUS_SEND_FEEDBACK = "Send Theseus Feedback...";

    var ID_THESEUS_ENABLE = "brackets.theseus.enable";
    var NAME_THESEUS_ENABLE = "Enable Theseus";

    var ID_THESEUS_MODES = _orderedModes.map(function (mode) { return "brackets.theseus.mode." + mode.name });
    var NAME_THESEUS_MODES = _orderedModes.map(function (mode) { return "   Mode: " + mode.displayName });

    var _enabled = false;
    var _mode = DEFAULT_MODE;
    var _prefs;

    function _enable() {
        $exports.triggerHandler("enable");
    }

    function _disable() {
        $exports.triggerHandler("disable");
    }

    function _toggleEnabled() {
        // TODO: disable or enable immediately
        _enabled = !_enabled;
        _prefs.setValue("enabled", _enabled);
        _updateMenuStates();

        if (_enabled) {
            _enable();
        } else {
            _disable();
        }
    }

    function _setMode(modeName) {
        // TODO: warn user that connection will need to be restarted
        _mode = _modes[modeName] || DEFAULT_MODE;
        _prefs.setValue("mode", _mode.name);
        _updateMenuStates();
    }

    function _setModeHandler(modeName) {
        return function () { _setMode(modeName) };
    }

    function _sendFeedback() {
        window.open(ExtensionUtils.getModuleUrl(module, "feedback.html"));
    }

    function _loadPreferences() {
        _prefs = PreferencesManager.getPreferenceStorage("com.adobe.theseus", { enabled: true, mode: "static" });
        _enabled = _prefs.getValue("enabled");
        _mode = _modes[_prefs.getValue("mode")] || DEFAULT_MODE;
    }

    function _setupMenu() {
        CommandManager.register(
            NAME_THESEUS_SEND_FEEDBACK,
            ID_THESEUS_SEND_FEEDBACK,
            _sendFeedback
        );

        CommandManager.register(
            NAME_THESEUS_ENABLE,
            ID_THESEUS_ENABLE,
            _toggleEnabled
        );

        _orderedModes.forEach(function (mode, i) {
            CommandManager.register(
                NAME_THESEUS_MODES[i],
                ID_THESEUS_MODES[i],
                _setModeHandler(mode.name)
            );
        });

        var menu = Menus.getMenu(Menus.AppMenuBar.HELP_MENU);
        menu.addMenuDivider(Menus.LAST, null);
        menu.addMenuItem(ID_THESEUS_SEND_FEEDBACK, null, Menus.LAST, null);

        var fileMenu = Menus.getMenu(Menus.AppMenuBar.FILE_MENU);
        fileMenu.addMenuItem(ID_THESEUS_ENABLE, null, Menus.AFTER, Commands.FILE_LIVE_HIGHLIGHT);
        _orderedModes.forEach(function (mode, i) {
            var prev = (i == 0) ? ID_THESEUS_ENABLE : ID_THESEUS_MODES[i - 1];
            fileMenu.addMenuItem(ID_THESEUS_MODES[i], null, Menus.AFTER, prev);
        });

        _updateMenuStates();
    }

    function _updateMenuStates() {
        CommandManager.get(ID_THESEUS_ENABLE).setChecked(_enabled);
        _orderedModes.forEach(function (mode, i) {
            var cmd = CommandManager.get(ID_THESEUS_MODES[i]);
            cmd.setChecked(_mode.name === mode.name);
            cmd.setEnabled(_enabled);
        });
    }

    function isEnabled() {
        return _enabled;
    }

    function getModeName() {
        return _mode.name;
    }

    function _init() {
        _loadPreferences();
        _setupMenu();

        ExtensionUtils.loadStyleSheet(module, "main.less");

        Agent.init();
        EditorInterface.init();
        UI.init();
        Panel.init();

        if (_enabled) {
            _enable();
        }
    }

    // exports

    exports.isEnabled = isEnabled;
    exports.getModeName = getModeName;
    exports.version = THESEUS_VERSION;

    // initialize the extension

    AppInit.appReady(_init);
});

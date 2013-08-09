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
/*global define, $, brackets, Mustache */

/**
 * provides events:
 *
 *  - enable & disable, when the extension should operate
 */

define(function (require, exports, module) {
    "use strict";

    var Agent              = require("Agent");
    var AgentManager       = require("AgentManager");
    var AppInit            = brackets.getModule("utils/AppInit");
    var CommandManager     = brackets.getModule("command/CommandManager");
    var Commands           = brackets.getModule("command/Commands");
    var Dialogs            = brackets.getModule("widgets/Dialogs");
    var EpochPanel         = require("EpochPanel");
    var FileCallGraphPanel = require("FileCallGraphPanel");
    var EditorInterface    = require("EditorInterface");
    var ExtensionUtils     = brackets.getModule("utils/ExtensionUtils");
    var Invitation         = require("Invitation");
    var Inspector          = brackets.getModule("LiveDevelopment/Inspector/Inspector");
    var LiveDevelopment    = brackets.getModule("LiveDevelopment/LiveDevelopment");
    var Menus              = brackets.getModule("command/Menus");
    var NativeApp          = brackets.getModule("utils/NativeApp");
    var NativeFileSystem   = brackets.getModule("file/NativeFileSystem").NativeFileSystem;
    var Panel              = require("Panel");
    var PreferencesManager = brackets.getModule("preferences/PreferencesManager");
    var ProxyProvider      = require("ProxyProvider");
    var Strings            = require("strings");
    var UI                 = require("UI");
    var Usage              = require("Usage");

    var $exports = $(exports);

    var THESEUS_VERSION = JSON.parse(require("text!package.json")).version;

    // check that node_modules is there and alert the user if it isn't
    var corruptInstallationDialogHTML = require("text!InstallationCorrupt.html");
    var corruptInstallationDialogTemplate = Mustache.render(corruptInstallationDialogHTML, {Strings : Strings});
    var nodeModulesPath = ExtensionUtils.getModulePath(module, "node_modules");
    NativeFileSystem.resolveNativeFileSystemPath(nodeModulesPath, function() {}, function() {
        var dialog = Dialogs.showModalDialogUsingTemplate(corruptInstallationDialogTemplate);
        var $dialog = dialog.getElement();
        $dialog.find(".close").on("click", dialog.close.bind(dialog));
    });

    // set up the menus

    var _modes = {
        "static" : { name: "static", displayName: "Serve files from disk" },
        "proxy" : { name: "proxy", displayName: "Proxy to localhost:3000 (experimental)" },
    };
    var _orderedModes = [_modes["static"], _modes["proxy"]];
    var DEFAULT_MODE = _modes["static"];

    var ID_THESEUS_SEND_FEEDBACK   = "brackets.theseus.sendFeedback";
    var NAME_THESEUS_SEND_FEEDBACK = "Send Theseus Feedback...";

    var ID_THESEUS_WELCOME_SCREEN   = "brackets.theseus.welcome";
    var NAME_THESEUS_WELCOME_SCREEN = "Theseus Welcome Screen...";

    var ID_THESEUS_ENABLE = "brackets.theseus.enable";
    var NAME_THESEUS_ENABLE = "Enable Theseus";

    var ID_THESEUS_DEBUG_BRACKETS = "brackets.theseus.debug-brackets";
    var NAME_THESEUS_DEBUG_BRACKETS = "Debug Brackets with Theseus";

    var ID_THESEUS_RESET_TRACE = "brackets.theseus.reset-trace";
    var NAME_THESEUS_RESET_TRACE = "Reset Theseus Trace Data (experimental)";

    var ID_THESEUS_MODES = _orderedModes.map(function (mode) { return "brackets.theseus.mode." + mode.name; });
    var NAME_THESEUS_MODES = _orderedModes.map(function (mode) { return "   Mode: " + mode.displayName; });

    // module variables

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
        return function () {
            _setMode(modeName);
            $exports.triggerHandler("modeChange", modeName);
        };
    }

    function _sendFeedback() {
        var params = "?";
        params += "brackets_version=" + brackets.metadata.version;
        params += "&theseus_version=" + THESEUS_VERSION;
        NativeApp.openURLInDefaultBrowser("file://" + ExtensionUtils.getModuleUrl(module, "feedback.html") + params);
    }

    function _showWelcomeScreen() {
        Invitation.showInvitation();
    }

    function _debugBrackets() {
        var _proxy;
        CommandManager.execute("debug.newBracketsWindow").then(function () {
            return ProxyProvider.getServer("/", "static");
        }).then(function (proxy) {
            _proxy = proxy;
            return Inspector.getDebuggableWindows("127.0.0.1", 9234);
        }).then(function (response) {
            var keys = Object.keys(response).sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });
            if (keys.length > 0) {
                // pick the last page
                var page = response[keys[keys.length - 1]];

                var redirect = function () {
                    Inspector.off("connect", redirect);
                    var redirectTo = _proxy.proxyRootURL + (window.location.pathname[0] === "/" ? window.location.pathname.slice(1) : window.location.pathname)
                    Inspector.Runtime.evaluate("window.location = " + JSON.stringify(redirectTo), function () {});
                };
                Inspector.on("connect", redirect);

                Inspector.connect(page.webSocketDebuggerUrl);
            }
        }).fail(function onFail(err) {
            console.log("debugging brackets failed: " + err);
        });
    }

    function _resetTrace() {
        AgentManager.resetTrace();
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
            NAME_THESEUS_WELCOME_SCREEN,
            ID_THESEUS_WELCOME_SCREEN,
            _showWelcomeScreen
        );

        CommandManager.register(
            NAME_THESEUS_ENABLE,
            ID_THESEUS_ENABLE,
            _toggleEnabled
        );

        CommandManager.register(
            NAME_THESEUS_DEBUG_BRACKETS,
            ID_THESEUS_DEBUG_BRACKETS,
            _debugBrackets
        );

        CommandManager.register(
            NAME_THESEUS_RESET_TRACE,
            ID_THESEUS_RESET_TRACE,
            _resetTrace
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
        menu.addMenuItem(ID_THESEUS_WELCOME_SCREEN, null, Menus.LAST, null);

        var fileMenu = Menus.getMenu(Menus.AppMenuBar.FILE_MENU);
        fileMenu.addMenuDivider(Menus.LAST, null);
        fileMenu.addMenuItem(ID_THESEUS_ENABLE, null, Menus.LAST, null);
        _orderedModes.forEach(function (mode, i) {
            var prev = (i == 0) ? ID_THESEUS_ENABLE : ID_THESEUS_MODES[i - 1];
            fileMenu.addMenuItem(ID_THESEUS_MODES[i], null, Menus.AFTER, prev);
        });
        fileMenu.addMenuItem(ID_THESEUS_RESET_TRACE, null, Menus.AFTER, ID_THESEUS_MODES[ID_THESEUS_MODES.length - 1]);

        var debugMenu = Menus.getMenu("debug-menu");
        debugMenu.addMenuDivider(Menus.LAST, null);
        debugMenu.addMenuItem(ID_THESEUS_DEBUG_BRACKETS, null, Menus.LAST, null);

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

        Usage.init();
        ProxyProvider.init();
        Agent.init();
        AgentManager.init();
        EditorInterface.init();
        UI.init();
        Panel.init();
        EpochPanel.init();
        FileCallGraphPanel.init();

        // after a short delay, show 'Thank you!' popup if they haven't seen it
        setTimeout(function () {
            Invitation.showInvitationIfNecessary();
        }, 1000);

        $(LiveDevelopment).on("statusChange", function (e, status) {
            if (status === 1) { // "Connecting to the remote debugger"
                setTimeout(function () {
                    var $btnGoLive = $("#toolbar-go-live");

                    $btnGoLive.twipsy("hide").removeData("twipsy");
                    $btnGoLive.twipsy({
                        placement: "left",
                        trigger: "manual",
                        autoHideDelay: 5000,
                        title: function () { return "Live development has been started with Theseus in " + _mode.name.toUpperCase() + " mode." },
                    }).twipsy("show");
                }, 1000);
            }
        });

        if (_enabled) { // enable now if enabled in preferences
            _enable();
        }
    }

    // exports

    exports.isEnabled = isEnabled;
    exports.getModeName = getModeName;
    exports.version = THESEUS_VERSION;

    // initialize the extension

    AppInit.htmlReady(_init);
});

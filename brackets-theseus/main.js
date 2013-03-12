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
    var Agent           = require("Agent");
    var CommandManager  = brackets.getModule("command/CommandManager");
    var Commands        = brackets.getModule("command/Commands");
    var EditorInterface = require("EditorInterface");
    var ExtensionUtils  = brackets.getModule("utils/ExtensionUtils");
    var Inspector       = brackets.getModule("LiveDevelopment/Inspector/Inspector");
    var Menus           = brackets.getModule("command/Menus");
    var Panel           = require("Panel");
    var UI              = require("UI");

    var $exports = $(exports);

    var ID_THESEUS_SEND_FEEDBACK   = "brackets.theseus.sendFeedback";
    var NAME_THESEUS_SEND_FEEDBACK = "Send Theseus Feedback...";
            
    var ID_THESEUS_ENABLE = "brackets.theseus.enable";
    var NAME_THESEUS_ENABLE = "Enable Theseus";
    
    exports.enabled = false;
    
    function _connected() {
        $exports.triggerHandler("enable");
    }

    function _disconnected() {
        $exports.triggerHandler("disable");
    }

    function _toggleEnabled() {
        exports.enabled = !exports.enabled;
        CommandManager.get(ID_THESEUS_ENABLE).setChecked(exports.enabled);
    }
    
    function _sendFeedback() {
        window.open(ExtensionUtils.getModuleUrl(module, "feedback.html"));
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
            
        
        var menu = Menus.getMenu(Menus.AppMenuBar.HELP_MENU);
        menu.addMenuDivider(Menus.LAST, null);
        menu.addMenuItem(ID_THESEUS_SEND_FEEDBACK, null, Menus.LAST, null);
        
        var fileMenu = Menus.getMenu(Menus.AppMenuBar.FILE_MENU);
        fileMenu.addMenuItem(ID_THESEUS_ENABLE, null, Menus.AFTER, Commands.FILE_LIVE_HIGHLIGHT);
        CommandManager.get(ID_THESEUS_ENABLE).setChecked(exports.enabled);
        
    }

    // initialize the extension
    ExtensionUtils.loadStyleSheet(module, "main.less");

    Agent.init();
    EditorInterface.init();
    UI.init();
    Panel.init();

    _setupMenu();

    $(Agent).on("connect", _connected);
    $(Agent).on("disconnect", _disconnected);
});

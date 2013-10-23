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
define(function(require, exports, module) {
    "use strict";
    
    var Commands                = brackets.getModule("command/Commands");
    var CommandManager          = brackets.getModule("command/CommandManager");
    var Dialogs                 = brackets.getModule("widgets/Dialogs");
    var DefaultDialogs          = brackets.getModule("widgets/DefaultDialogs");
    var ExtensionManager        = brackets.getModule("extensibility/ExtensionManager");
    var ExtensionManagerDialog  = brackets.getModule("extensibility/ExtensionManagerDialog");
    var InstallExtensionDialog  = brackets.getModule("extensibility/InstallExtensionDialog");
    var PreferencesManager      = brackets.getModule("preferences/PreferencesManager");
    var Strings                 = require("./strings");
    var StringsBuiltin          = brackets.getModule("strings");
    
    var _prefs;
    function _loadPreferences() {
        _prefs = PreferencesManager.getPreferenceStorage("com.adobe.theseus.update", {
            update_ignored: false,
            last_ignored_version: 0,
            last_checked_at: 0
        });
    }
    
    /**
     * @private
     * @return {$.Promise} A promise object that is resolved with {hasUpdate: true/false, version: version string}
     */
    function _checkForUpdate() {
        var result = new $.Deferred();
        ExtensionManager.downloadRegistry().done(function() {
            var theseus = ExtensionManager.extensions.theseus;
            if(!theseus.registryInfo.updateAvailable) {
                result.resolve({hasUpdateAvailable: false});
            }
            else {
                var bracketsVersion = brackets.metadata.version;
                var theseusVersions = theseus.registryInfo.versions;
                var currentTheseusVersion = theseus.installInfo.metadata.version;
                for(var i = theseusVersions.length-1; i >= 0; i--) { //Find the latest compatible version
                    var version = theseusVersions[i];
                    if(version.version == currentTheseusVersion) {
                        break;
                    }
                    var checkAgainst = { metadata: { engines: { brackets: version.brackets }}}; //Assemble the data from each version into a format that getCompatibilityInfo likes
                    var compatibility = ExtensionManager.getCompatibilityInfo(checkAgainst,bracketsVersion);
                    if(compatibility.isCompatible) {
                        result.resolve({
                            hasUpdateAvailable: true,
                            version: version.version,
                        });
                        break;
                    }
                }
            }
        });
        return result.promise({hasUpdateAvailable: false});
    }
    
    /**
     * @private
     * Prompts the user to restart Brackets to complete update process
     */
    function _showRestartDialog() {
        Dialogs.showModalDialog(
                DefaultDialogs.DIALOG_ID_CHANGE_EXTENSIONS,
                StringsBuiltin.CHANGE_AND_QUIT_TITLE,
                StringsBuiltin.CHANGE_AND_QUIT_MESSAGE,
                [
                    {
                        className : Dialogs.DIALOG_BTN_CLASS_NORMAL,
                        id        : Dialogs.DIALOG_BTN_CANCEL,
                        text      : StringsBuiltin.CANCEL,
                    },
                    {
                        className : Dialogs.DIALOG_BTN_CLASS_PRIMARY,
                        id        : Dialogs.DIALOG_BTN_OK,
                        text      : StringsBuiltin.UPDATE_AND_QUIT,
                    }
                ]
        ).done(function(buttonId) {
                if(buttonId === "ok") {
                    ExtensionManager.updateExtensions().done(function() {
                        CommandManager.execute(Commands.FILE_QUIT);
                    });
                }
        });
    }
    
    /**
     * @private
     * Updates Theseus and prompts the user to 
     */
    function _doUpdate(version) {
        var updateURL = ExtensionManager.getExtensionURL("theseus",version);
        InstallExtensionDialog.updateUsingDialog(updateURL).done(function(installationResult) {
            ExtensionManager.updateFromDownload(installationResult); //Performs the actual update
            _showRestartDialog();
        });
    }
    
    /**
     * Alerts user that Theseus is updatable and prompts to upgrade
     */
    function showUpdateDialog(version) {
        var newVersionDialogHTML = require("text!./NewVersionAvailable.html");
        var newVersionDialogTemplate = Mustache.render(newVersionDialogHTML, {Strings : Strings});
        var dialog = Dialogs.showModalDialogUsingTemplate(newVersionDialogTemplate);
        var $dialog = dialog.getElement();
        $dialog.find(".close").on("click", dialog.close.bind(dialog));
        $dialog.on("hide", function () {
            if ($dialog.data("buttonId") == "upgrade") {
                _doUpdate(version);
       
            }
            else {
                _prefs.setValue("update_ignored", true);
                _prefs.setValue("last_ignored_version", version); 
            }
        });
    }
    
    /**
     * Determines if a Theseus update is necessary and, if so, whether to show the dialog
     */
    function updateIfNecessary() {
        _loadPreferences();
        
        var lastCheckedAt = _prefs.getValue("last_checked_at");
        var now = new Date();
        var MILLIS_IN_DAY = 86400000;
        if((now-lastCheckedAt) < MILLIS_IN_DAY) {
            return;
        }
        
        _checkForUpdate().done(function(update) {
            _prefs.setValue("last_checked_at",now.getTime());
            if(update.hasUpdateAvailable) {
                if(!_prefs.getValue("update_ignored") || _prefs.getValue("last_ignored_version") != update.version) {
                    showUpdateDialog(update.version);
                }
            }
        });
    }
    
    exports.updateIfNecessary = updateIfNecessary;
    exports.showUpdateDialog = showUpdateDialog;
});

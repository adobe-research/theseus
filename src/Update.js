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
define(function (require, exports, module) {
    "use strict";

    var Commands                = brackets.getModule("command/Commands");
    var CommandManager          = brackets.getModule("command/CommandManager");
    var Dialogs                 = brackets.getModule("widgets/Dialogs");
    var ExtensionManager        = brackets.getModule("extensibility/ExtensionManager");
    var Strings                 = require("./strings");
    var Preferences             = require("./Preferences");

    /**
     * @private
     * @return {$.Promise} A promise object that is resolved with {hasUpdate: true/false, version: version string}
     */
    function _checkForUpdate() {
        var result = new $.Deferred();
        ExtensionManager.downloadRegistry().done(function () {
            var theseus = ExtensionManager.extensions.theseus;
            if (!theseus.registryInfo.updateAvailable) {
                result.resolve({hasUpdateAvailable: false});
            } else {
                var bracketsVersion = brackets.metadata.version;
                var theseusVersions = theseus.registryInfo.versions;
                var currentTheseusVersion = theseus.installInfo.metadata.version;
                for (var i = theseusVersions.length - 1; i >= 0; i--) { //Find the latest compatible version
                    var version = theseusVersions[i];
                    if (version.version === currentTheseusVersion) { //Already checked all newer versions?
                        break; //Quit
                    }
                    var checkAgainst = { metadata: { engines: { brackets: version.brackets }}}; //Assemble the data from each version into a format that getCompatibilityInfo likes
                    var compatibility = ExtensionManager.getCompatibilityInfo(checkAgainst, bracketsVersion);
                    if (compatibility.isCompatible) { //Is the update compatible with this Brackets?
                        result.resolve({ //Cool, there's an update available
                            hasUpdateAvailable: true,
                            version: version.version,
                            current: currentTheseusVersion
                        });
                        break; //At this point, the newest compatible update has been resolved. Quit.
                    }
                }
                result.resolve({hasUpdateAvailable: false}); //Nothing was found: no update available
            }
        });
        return result.promise();
    }

    /**
     * @private
     * Open the extension manager and (try to) search for Theseus
     */
    function _doUpdate() {
        CommandManager.execute(Commands.FILE_EXTENSION_MANAGER).done(function () {
            var $searchBox = $(".extension-manager-dialog .search");
            $searchBox.prop("value", "Theseus");
            setTimeout(function () {
                $searchBox.trigger("input");
            }, 800);
        });
    }

    /**
     * Alerts user that Theseus is updatable and prompts to upgrade
     */
    function showUpdateDialog(newVersion, currentVersion) {
        var newVersionDialogHTML = require("text!./NewVersionAvailable.html");
        var newVersionDialogTemplate = Mustache.render(newVersionDialogHTML, {Strings : Strings});
        var dialog = Dialogs.showModalDialogUsingTemplate(newVersionDialogTemplate);
        var $dialog = dialog.getElement();
        $dialog.find(".dialog-message").html(currentVersion + " &#8594; " + newVersion);
        $dialog.find(".close").on("click", dialog.close.bind(dialog));
        $dialog.on("hide", function () {
            if ($dialog.data("buttonId") === "upgrade") {
                _doUpdate(newVersion);
            } else {
                Preferences.set("update.update_ignored", true);
                Preferences.set("update.last_ignored_version", newVersion, true);
            }
        });
    }

    /**
     * Determines if a Theseus update is necessary and, if so, whether to show the dialog
     */
    function updateIfNecessary() {
        var lastCheckedAt = Preferences.get("update.last_checked_at");
        var now = new Date();
        var MILLIS_IN_DAY = 86400000;
        if ((now - lastCheckedAt) < MILLIS_IN_DAY) {
            return;
        }

        _checkForUpdate().done(function (update) {
            Preferences.set("update.last_checked_at", now.getTime(), true);
            if (update.hasUpdateAvailable) {
                if (!Preferences.get("update.update_ignored") || Preferences.get("update.last_ignored_version") !== update.version) {
                    showUpdateDialog(update.version, update.current);
                }
            }
        });
    }

    exports.updateIfNecessary = updateIfNecessary;
    exports.showUpdateDialog = showUpdateDialog;
});

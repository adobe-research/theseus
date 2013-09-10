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
    var Dialogs        = brackets.getModule("widgets/Dialogs");
    var ExtensionUtils = brackets.getModule("utils/ExtensionUtils");
    var Strings        = require("./strings");
    var Usage          = require("./Usage");

    var dialogHTML     = require("text!./Invitation.html");
    var dialogTemplate = Mustache.render(dialogHTML, {Strings : Strings});

    /** recordCancel: if true, records cancellation as opting out of everything **/
    function showInvitation(recordCancel) {
        var d = new $.Deferred;

        var dialog = Dialogs.showModalDialogUsingTemplate(dialogTemplate);
        var $dialog = dialog.getElement();

        var $photo = $("<img />").attr({
            src: ExtensionUtils.getModuleUrl(module, "tom.jpg"),
            width: 48,
            height: 48,
            align: "right",
        });
        $dialog.find(".dialog-image").append($photo);
        $dialog.find(".close").on("click", dialog.close.bind(dialog));

        var $usageOkay = $dialog.find("#theseus-input-usage");
        var $contactOkay = $dialog.find("#theseus-input-contact");
        var $email = $dialog.find("#theseus-input-email");

        var lastResult = Usage.lastAgreementResult();
        $usageOkay.prop("checked", lastResult.usageOkay);
        $contactOkay.prop("checked", lastResult.contactOkay);
        $email.val(lastResult.email);

        $dialog.on("hide", function () {
            if ($dialog.data("buttonId") === "ok") {
                Usage.recordAgreementResult({
                    usageOkay: $usageOkay.prop("checked"),
                    contactOkay: $contactOkay.prop("checked"),
                    email: $email.val(),
                });

                d.resolve();
            } else {
                if (recordCancel) {
                    Usage.recordAgreementResult({
                        usageOkay: false,
                        contactOkay: false,
                    });
                }

                d.reject();
            }
        });

        return d.promise();
    }

    /**
    returns a promise for the information from the form.
    will reject if the user cancels or showing the dialog was unnecessary.
    **/
    function showInvitationIfNecessary() {
        if (Usage.sawAgreement()) {
            var d = new $.Deferred;
            return d.reject().promise();
        }
        return showInvitation(true /* recordCancel */);
    }

    exports.showInvitationIfNecessary = showInvitationIfNecessary;
    exports.showInvitation = showInvitation;
});

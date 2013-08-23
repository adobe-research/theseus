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

define({
    "PRODUCT_NAME"                       : "Theseus",

    "INVITATION_HEADER"                  : "Thanks for installing Theseus!",
    "INVITATION_TEXT_1"                  : "Theseus is a research project by MIT PhD student Tom Lieber (pictured right) and he would love to know how you use it!",
    "INVITATION_USAGE"                   : "You may collect anonymous information about how I use Theseus.",
    "INVITATION_USAGE_DETAIL"            : "See exactly what will be reported and why.",
    "INVITATION_USAGE_DETAIL_URL"        : "https://github.com/adobe-research/theseus/wiki/Anonymous-Usage-Reporting",
    "INVITATION_CONTACT"                 : "I might be willing to talk to you about how I use Theseus.",
    "INVITATION_CONFIRM"                 : "Okay",
    "INVITATION_CANCEL"                  : "Cancel",

    "NODE_THESEUS_VERSION_ERROR_HEADER"  : "Theseus: Invalid Software Version",
    "NODE_THESEUS_VERSION_ERROR_TEXT_1"  : "The Theseus extension just connected to a Node.js process started with node-theseus. Unfortunately, the version of node-theseus used is not compatible with this verison of Theseus. You should upgrade both of them to the latest versions. (Theseus: {theseus version}, fondue: {fondue version})",
    "NODE_THESEUS_VERSION_ERROR_CONFIRM" : "Okay",

    "INSTALLATION_CORRUPT_HEADER"  : "Theseus: Corrupt Installation",
    "INSTALLATION_CORRUPT_TEXT_1"  : "Theseus appears to be missing some of its files. Please reinstall Theseus. If you installed it using the GitHub URL, please follow the installation instructions on the Theseus web site instead.",
    "INSTALLATION_CORRUPT_CONFIRM" : "Okay",
});

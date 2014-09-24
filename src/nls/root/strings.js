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
    
    //Invitation
    "INVITATION_HEADER"                  : "Thanks for installing Theseus!",
    "INVITATION_TEXT_1"                  : "Theseus is a research project by MIT PhD student Tom Lieber (pictured right) and he would love to know how you use it!",
    "INVITATION_USAGE"                   : "You may collect anonymous information about how I use Theseus.",
    "INVITATION_USAGE_DETAIL"            : "See exactly what will be reported and why.",
    "INVITATION_USAGE_DETAIL_URL"        : "https://github.com/adobe-research/theseus/wiki/Anonymous-Usage-Reporting",
    "INVITATION_CONTACT"                 : "I might be willing to talk to you about how I use Theseus.",
    "INVITATION_EMAIL_ADRESS"            : "My e-mail address:",
    "INVITATION_CONFIRM"                 : "Okay",
    "INVITATION_CANCEL"                  : "Cancel",
    
    //UI
    "UI_NO_CALLS"                        : "0 calls",
    "UI_SINGLE_CALL"                     : "1 call",
    "UI_MULTIPLE_CALLS"                  : "{0} calls",
    "UI_BACKTRACE"                       : "Backtrace",
    "UI_BACKTRACE_LOADING"               : "Loading backtrace...",
    "UI_BACKTRACE_BACK"                  : "Back",
    "UI_DETAILS_RETURN_VALUE"            : "return value",
    "UI_DETAILS_EXCEPTION"               : "exception",
    "UI_DETAILS_FUNCTION"                : "function",
    "UI_NO_MORE_INSPECTION"              : "You can't inspect this object any deeper.",
    "UI_ITEMS_TRUNCATED_FROM_LOG"        : "{0} of this object's items were truncated from the log.",
    "UI_KEYS_TRUNCATED_FROM_LOG"         : "{0} of this object's keys were truncated from the log.",
    "UI_DEFAULT_TIME_FORMAT"             : "h:mm:ss.SSS",
    
    //Panel
    "PANEL_LOG"                          : "Log",
    
    //Node errors
    "NODE_THESEUS_VERSION_ERROR_HEADER"  : "Theseus: Invalid Software Version",
    "NODE_THESEUS_VERSION_ERROR_TEXT_1"  : "The Theseus extension just connected to a Node.js process started with node-theseus. Unfortunately, the version of node-theseus used is not compatible with this verison of Theseus. You should upgrade both of them to the latest versions. (Theseus: {theseus version}, fondue: {fondue version})",
    "NODE_THESEUS_VERSION_ERROR_CONFIRM" : "Okay",
    
    //Installation corrupt
    "INSTALLATION_CORRUPT_HEADER"        : "Theseus: Corrupt Installation",
    "INSTALLATION_CORRUPT_TEXT_1"        : "Theseus appears to be missing some of its files. Please reinstall Theseus. If you installed it using the GitHub URL, please follow the installation instructions on the Theseus web site instead.",
    "INSTALLATION_CORRUPT_CONFIRM"       : "Okay",
    
    //Menu
    "MENU_MODE"                          : "Mode:",
    "MENU_MODE_STATIC_DISPLAYNAME"       : "Serve files from disk",
    "MENU_MODE_PROXY_DISPLAYNAME"        : "Proxy to localhost:3000 (experimental)",
    
    "MENU_NAME_THESEUS_WELCOME_SCREEN"   : "Theseus Welcome Screen...",
    "MENU_NAME_THESEUS_TROUBLESHOOTING"  : "Theseus Troubleshooting...",
    "MENU_NAME_THESEUS_ENABLE"           : "Enable Theseus",
    "MENU_NAME_THESEUS_DEBUG_BRACKETS"   : "Debug Brackets with Theseus",
    "MENU_NAME_THESEUS_RESET_TRACE"      : "Reset Theseus Trace Data (experimental)",
    
    //Notifications
    "NOTIFICATION_LIVE_DEV_WITH_THESEUS" : "Live development has been started with Theseus in {0} mode.",
    
    //New version
    "NEW_VERSION_AVAILABLE_HEADER"       : "Theseus update available!",
    "NEW_VERSION_AVAILABLE_IGNORE"       : "Ignore",
    "NEW_VERSION_AVAILABLE_UPDATE"       : "Update"
});

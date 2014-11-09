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
    "INVITATION_HEADER"                  : "Danke, dass Sie Theseus installiert haben!",
    "INVITATION_TEXT_1"                  : "Theseus ist ein Forschungsprojekt des MIT-Doktoranden Tom Lieber (rechts abgebildet), und er würde gerne wissen, wie sie Theseus nutzen!",
    "INVITATION_USAGE"                   : "Sie dürfen anonyme Informationen über meine Theseus-Nutzung sammeln.",
    "INVITATION_USAGE_DETAIL"            : "Genau ansehen, was hochgeladen wird - und wieso.",
    "INVITATION_USAGE_DETAIL_URL"        : "https://github.com/adobe-research/theseus/wiki/Anonymous-Usage-Reporting",
    "INVITATION_CONTACT"                 : "Ich bin bereit, über die Nutzung zu reden.",
    "INVITATION_EMAIL_ADRESS"            : "Meine E-Mail-Adresse:",
    "INVITATION_CONFIRM"                 : "OK",
    "INVITATION_CANCEL"                  : "Abbrechen",
    
    //UI
    "UI_NO_CALLS"                        : "0 Aufrufe",
    "UI_SINGLE_CALL"                     : "1 Aufruf",
    "UI_MULTIPLE_CALLS"                  : "{0} Aufrufe",
    "UI_BACKTRACE"                       : "Ablaufverfolgung",
    "UI_BACKTRACE_LOADING"               : "Ablaufverfolgung lädt...",
    "UI_BACKTRACE_BACK"                  : "Zurück",
    "UI_DETAILS_RETURN_VALUE"            : "Rückgabewert",
    "UI_DETAILS_EXCEPTION"               : "Ausnahme",
    "UI_DETAILS_FUNCTION"                : "Funktion",
    "UI_NO_MORE_INSPECTION"              : "Sie können dieses Objekt nicht näher einsehen.",
    "UI_ITEMS_TRUNCATED_FROM_LOG"        : "{0} der Inhalte dieses Objekts wurden in diesem Log ausgelassen.",
    "UI_KEYS_TRUNCATED_FROM_LOG"         : "{0} der Schlüssel dieses Objekts wurden in diesem Log ausgelassen.",
    "UI_DEFAULT_TIME_FORMAT"             : "HH:mm:ss.SSS",
    
    //Panel
    "PANEL_LOG"                          : "Log",
    
    //Node errors
    "NODE_THESEUS_VERSION_ERROR_HEADER"  : "Theseus: Ungültige Software-Version",
    "NODE_THESEUS_VERSION_ERROR_TEXT_1"  : "Die Theseus-Erweiterung hat sich gerade mit einem Node.js-Prozess verbunden, der mit node-theseus gestartet wurde. Leider ist die benutzte Version von node-theseus nicht mit dieser Version von Theseus kompatibel. Sie sollten beide auf die neueste Version upgraden. (Theseus: {theseus version}, fondue: {fondue version})",
    "NODE_THESEUS_VERSION_ERROR_CONFIRM" : "OK",
    
    //Installation corrupt
    "INSTALLATION_CORRUPT_HEADER"        : "Theseus: Fehlerhafte Installation",
    "INSTALLATION_CORRUPT_TEXT_1"        : "Es scheint, dass einige Dateien von Theseus fehlen. Bitte installieren Sie Theseus erneut. Folgen Sie bitte den Anweisungen auf der Theseus-Website, wenn Sie es mithilfe der GitHub-URL installiert haben.",
    "INSTALLATION_CORRUPT_CONFIRM"       : "OK",
    
    //Menu
    "MENU_MODE"                          : "Modus:",
    "MENU_MODE_STATIC_DISPLAYNAME"       : "Dateien von der Festplatte nutzen",
    "MENU_MODE_PROXY_DISPLAYNAME"        : "Proxy-Verbindung zu localhost:3000 aufbauen (experimentell)",
    
    "MENU_NAME_THESEUS_WELCOME_SCREEN"   : "Theseus-Begrüßungsbilschirm...",
    "MENU_NAME_THESEUS_TROUBLESHOOTING"  : "Theseus-Fehlerbehebung...",
    "MENU_NAME_THESEUS_ENABLE"           : "Theseus aktivieren",
    "MENU_NAME_THESEUS_DEBUG_BRACKETS"   : "Brackets mit Theseus debuggen",
    "MENU_NAME_THESEUS_RESET_TRACE"      : "Von Theseus aufgezeichnete Daten zurücksetzen (experimentell)",
    
    //Notifications
    "NOTIFICATION_LIVE_DEV_WITH_THESEUS" : "Die Live-Vorschau wurde mit Theseus im {0}-Modus gestartet.",
    
    //New version
    "NEW_VERSION_AVAILABLE_HEADER"       : "Ein Theseus-Update ist verfügbar!",
    "NEW_VERSION_AVAILABLE_IGNORE"       : "Ignorieren",
    "NEW_VERSION_AVAILABLE_UPDATE"       : "Updaten"
});

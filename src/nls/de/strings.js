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

    "INVITATION_HEADER"                  : "Danke, dass Sie Theseus installiert haben!",
    "INVITATION_TEXT_1"                  : "Theseus ist ein Forschungsprojekt des MIT-Doktoranden Tom Lieber (rechts abgebildet), und er würde gerne wissen, wie sie Theseus nutzen!",
    "INVITATION_USAGE"                   : "Sie dürfen anonyme Informationen über meine Theseus-Nutzung sammeln.",
    "INVITATION_USAGE_DETAIL"            : "Genau ansehen, was hochgeladen wird - und wieso.",
    "INVITATION_USAGE_DETAIL_URL"        : "https://github.com/adobe-research/theseus/wiki/Anonymous-Usage-Reporting",
    "INVITATION_CONTACT"                 : "Ich bin bereit, Informationen über die Nutzung weiterzugeben.",
    "INVITATION_CONFIRM"                 : "OK",
    "INVITATION_CANCEL"                  : "Abbrechen",

    "NODE_THESEUS_VERSION_ERROR_HEADER"  : "Theseus: Ungültige Software-Version",
    "NODE_THESEUS_VERSION_ERROR_TEXT_1"  : "Die Theseus-Erweiterung hat sich gerade mit einem Node.js-Prozess verbunden, der mit node-theseus gestartet wurde. Leider ist die benutzte Version von node-theseus nicht mit dieser Version von Theseus kompatibel. Sie sollten beide auf die neueste Version upgraden. (Theseus: {theseus version}, fondue: {fondue version})",
    "NODE_THESEUS_VERSION_ERROR_CONFIRM" : "OK",

    "INSTALLATION_CORRUPT_HEADER"  	 : "Theseus: Fehlerhafte Installation",
    "INSTALLATION_CORRUPT_TEXT_1"  	 : "Es scheint, dass einige Dateien von Theseus fehlen. Bitte installieren Sie Theseus erneut. Folgen Sie bitte den Anweisungen auf der Theseus-Website, wenn Sie es mithilfe der Github-URL installiert haben.",
    "INSTALLATION_CORRUPT_CONFIRM" 	 : "OK",
});

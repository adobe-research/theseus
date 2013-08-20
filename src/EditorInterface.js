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

/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, $ */

/**
 * provides events:
 *
 *  - editorChanged (editor, oldEditor, path)
 */

define(function (require, exports, module) {
    "use strict";

    var DocumentManager = brackets.getModule("document/DocumentManager");
    var EditorManager   = brackets.getModule("editor/EditorManager");
    var ProjectManager  = brackets.getModule("project/ProjectManager");
    var Main            = require("../main");

    var $exports = $(exports);
    var _editor;
    var _enabled = false;

    function _removeURLScheme(url) {
        return url.replace(/^[^:]+:\/\//, "");
    }

    function _editorChanged(event, focusedEditor, oldEditor) {
        // ignore focusedEditor, which could be inline. gimme the full editor.
        if (EditorManager.getCurrentFullEditor() !== _editor) {
            _editor = EditorManager.getCurrentFullEditor();
            if (_enabled) {
                $exports.triggerHandler("editorChanged", [_editor, oldEditor, currentPath()]);
            }
        }
    }

    function _scrollIntoView(editor, start, end) {
        var codeMirror = editor._codeMirror;

        var startPos = codeMirror.charCoords(start, "local");
        var endPos = codeMirror.charCoords(end, "local");
        var scrollInfo = codeMirror.getScrollInfo();

        var rangeTop = startPos.top;
        var rangeBottom = endPos.bottom;
        var viewportTop = scrollInfo.top;
        var viewportBottom = scrollInfo.top + scrollInfo.height;

        codeMirror.scrollIntoView({
            left: 0,
            right: 0,
            top: rangeTop - 15,
            bottom: rangeBottom + 15
        });
    }

    function currentEditor() {
        return _editor;
    }

    /** path of the currently active editor (or undefined) */
    function currentPath() {
        if (_editor) {
            return _removeURLScheme(_editor.document.file.fullPath);
        }
    }

    /**
     * switches to an editor for the given path, then calls callback with
     * the editor (or no arguments if the path couldn't be opened)
     */
    function switchToEditorFor(path, callback) {
        var _try = function (path) {
            if (currentPath() === path) {
                callback(currentEditor());
                return true;
            } else {
                DocumentManager.getDocumentForPath(path).done(function (doc) {
                    DocumentManager.setCurrentDocument(doc);
                    callback(EditorManager.getCurrentFullEditor());
                });
                return true;
            }
        };
        if (!_try(path) && !_try(ProjectManager.getProjectRoot().fullPath + path)) {
            callback();
        }
    }

    function revealFunction(f, callback) {
        switchToEditorFor(f.path, function (editor) {
            var start = { line: f.start.line - 1, ch: f.start.column };
            var end = { line: f.end.line - 1,   ch: f.end.column };
            _scrollIntoView(editor, start, end);
            callback && callback(editor);
        });
    }

    function reveal(pos) {
        if (_editor) {
            _editor._codeMirror.scrollIntoView(pos);
        }
    }

    function _enable() {
        _enabled = true;
    }

    function _disable() {
        _enabled = false;
    }

    function init() {
        $(EditorManager).on("activeEditorChange", _editorChanged);
        _editorChanged(null, EditorManager.getCurrentFullEditor());

        $(Main).on("enable", _enable);
        $(Main).on("disable", _disable);
    }

    function unload() {
        $(Main).off("enable", _enable);
        $(Main).off("disable", _disable);

        $exports.off();
    }

    exports.init = init;
    exports.unload = unload;
    exports.currentEditor = currentEditor;
    exports.currentPath = currentPath;
    exports.switchToEditorFor = switchToEditorFor;
    exports.revealFunction = revealFunction;
    exports.reveal = reveal;
});

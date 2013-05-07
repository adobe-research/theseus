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
    /** comparator for file positions in the form { line: XXX, column: YYY } */
    function comparePositions(a, b) {
        if (a.line !== b.line) {
            return a.line < b.line ? -1 : 1;
        }
        if (a.column !== b.column) {
            return a.column < b.column ? -1 : 1;
        }
        return 0;
    };

    /** sort-ready comparator for objects with a 'start' property {line, column} */
    function startPositionComparator(a, b) {
        return comparePositions(a.start, b.start);
    }

    /**
     * returns true when the given line/column is between start and end, where
     * start and end are objects {line, column}
     */
    function contains(start, end, line, column) {
        var startsBefore = comparePositions(start, { line: line, column: column }) <= 0;
        var endsAfter    = comparePositions(end,   { line: line, column: column }) >= 0;
        if (startsBefore && endsAfter) {
            return true;
        }
    }

    function summarizePath(path) {
        var components = path.split("/");
        return components[components.length - 1];
    }

    // adds keys from options to defaultOptions, overwriting on conflicts & returning defaultOptions
    function mergeInto(options, defaultOptions) {
        for (var key in options) {
            defaultOptions[key] = options[key];
        }
        return defaultOptions;
    }

    exports.comparePositions = comparePositions;
    exports.startPositionComparator = startPositionComparator;
    exports.contains = contains;
    exports.summarizePath = summarizePath;
    exports.mergeInto = mergeInto;
});

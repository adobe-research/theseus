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

/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, $ */

define(function (require, exports, module) {
	"use strict";

	var EditorManager = brackets.getModule("editor/EditorManager");
	var Inspector     = brackets.getModule("LiveDevelopment/Inspector/Inspector");
	var Main          = require("main");

	var $panel, $toolbar;
	var _panel, _shown = false;

	function setPanel(panel) {
		if (panel === _panel) {
			return;
		}
		if (_panel) {
			_panel.remove();
		}
		_panel = panel;
		_panel.add($panel);
	}

	/** Toggle the display of the panel */
	function toggle(show) {
		if (arguments.length > 0) {
			_shown = show;
		} else {
			_shown = !_shown;
		}
		$panel.toggle(show);
		EditorManager.resizeEditor();
	}

	function _enable() {
		// toggle(true);
	}

	function _disable() {
		toggle(false);
	}

	/** Initialize the panel */
	function init() {
		$panel = $("<div id='theseus-panel' class='bottom-panel' />").appendTo(".main-view .content");
		$toolbar = $("<div class='toolbar simple-toolbar-layout' />").appendTo($panel);
		$("<div class='title' />").appendTo($toolbar).text("Log");
		$("<a href='#' class='close' />").appendTo($toolbar).html("&times;");

		$(Main).on("enable", _enable);
		$(Main).on("disable", _disable);
	}

	/** Unload the panel */
	function unload() {
		$(Main).off("enable", _enable);
		$(Main).off("disable", _disable);

		$panel.remove();
		$panel = undefined;
	}

	exports.init = init;
	exports.unload = unload;
	exports.toggle = toggle;
	exports.setPanel = setPanel;
});

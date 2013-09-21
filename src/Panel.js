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

define(function (require, exports, module) {
	"use strict";

	var EditorManager = brackets.getModule("editor/EditorManager");
	var Inspector     = brackets.getModule("LiveDevelopment/Inspector/Inspector");
	var Main          = require("../main");
	var PanelManager  = brackets.getModule("view/PanelManager");
	var Resizer       = brackets.getModule("utils/Resizer");
    var Strings       = require("./strings")

	var $panel, $panelContent, $toolbar;
	var _panel, _bracketsPanel;

	function setPanel(panel) {
		if (panel === _panel) {
			return;
		}
		if (_panel) {
			_panel.remove();
		}
		_panel = panel;
		_panel.add($panelContent);
	}

	/** Toggle the display of the panel */
	function toggle(show) {
		if (show === undefined) {
			_bracketsPanel.setVisible(!_bracketsPanel.isVisible());
		} else if (show) {
			_bracketsPanel.show();
		} else {
			_bracketsPanel.hide();
		}
	}

	function _enable() {
		// toggle(true);
	}

	function _disable() {
		toggle(false);
	}

	/** Initialize the panel */
	function init() {
		$panel = $("<div id='theseus-panel' class='bottom-panel vert-resizable top-resizer' />").insertAfter(".bottom-panel:last");
		$toolbar = $("<div class='toolbar simple-toolbar-layout' />").appendTo($panel);
		$toolbar.append($("<div class='title' />").text(Strings.PANEL_LOG));

		$panelContent = $("<div class='resizable-content' />").appendTo($panel);

		_bracketsPanel = PanelManager.createBottomPanel("theseus.log", $panel, 100);

		var $close = $("<a class='close' />").appendTo($toolbar).html("&times;")

		$close.on("click", function () {
			if (_panel.close) {
				_panel.close();
			} else {
				toggle(false);
			}
		});

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

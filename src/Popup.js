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
	var Util = require("./Util");

	function Popup(options) {
        this.$dom = $("<div />");
        this.$dom.css({
            "z-index" : 100,
            "display" : "inline-block",
            "position" : "fixed",
            "overflow" : "auto",
        });

        this._clickHandler = this._click.bind(this);
	}
	Popup.prototype = {
		show: function (options) {
			options = Util.mergeInto(options, {
				x: 10,
				y: 10,
				margin: 10,
			});
			this.$dom.css({
			    "top" : options.y,
			    "left" : options.x,
			    "max-width" : $(document.body).innerWidth() - options.x - options.margin,
			    "max-height" : $(document.body).innerHeight() - options.y - options.margin,
			});
			this.$dom.appendTo(document.body);
			this._registerHandlers();
		},

		close: function () {
			this.$dom.detach();
			this._unregisterHandlers();
		},

		_registerHandlers: function () {
			$(document.body).on("click", this._clickHandler);
		},

		_unregisterHandlers: function () {
			$(document.body).off("click", this._clickHandler);
		},

		_click: function (e) {
			if (e.target !== this.$dom.get(0) && $(e.target).has(this.$dom).length === 0) {
				this.close();
			}
		},
	}

	exports.Popup = Popup;
});

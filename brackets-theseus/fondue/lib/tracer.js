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

// the contents of this file are to be inserted above instrumented code
// to collect trace information

if (typeof {name} === 'undefined') {
{name} = new (function () {
	var nodes = []; // objects describing functions, branches, call sites, etc
	var nodeById = {}; // id(string) -> node
	var invocationStack = [];
	var invocationById = []; // id(integer) -> invocation
	var extraInvocationInfoById = []; // id(integer) -> extra invocation info (stuff we don't want to send over the wire by default)
	var invocationsByNodeId = {}; // id(string) -> array of invocations
	var topLevelInvocations = [];
	var nodeHitCounts = {}; // { query-handle: { fid: hit-count } }
	var logEntries = {}; // { query-handle: [invocation id] }
	var anonFuncParentInvocation, lastException; // yucky globals track state between trace* calls
	var nextInvocationId = 0;
	var _hitQueries = [];
	var _logQueries = [];

	var _connected = false;

	function _addSpecialNodes() {
		var node = {
			path: "[built-in]",
			start: { line: 0, column: 0 },
			end: { line: 0, column: 0 },
			id: "log",
			type: "function",
			childrenIds: [],
			parentId: undefined,
			name: "[log]",
			params: []
		};
		nodes.push(node);
		nodeById[node.id] = node;
	}
	_addSpecialNodes();


	// helpers

	// adds keys from options to defaultOptions, overwriting on conflicts & returning defaultOptions
	function mergeInto(options, defaultOptions) {
		for (var key in options) {
			defaultOptions[key] = options[key];
		}
		return defaultOptions;
	}

	/**
	 * calls callback with (item, index, collect) where collect is a function
	 * whose argument should be one of the strings to be de-duped.
	 * returns an array where each string appears only once.
	 */
	function dedup(collection, callback) {
		var o = {};
		var collect = function (str) {
			o[str] = true;
		};
		for (var i in collection) {
			callback(collect, collection[i], i);
		}
		var arr = [];
		for (var str in o) {
			arr.push(str);
		}
		return arr;
	};

	function count(collection, callback) {
		var o = {};
		var collect = function (str) {
			if (str in o) {
				o[str]++;
			} else {
				o[str] = 1;
			}
		};
		for (var i in collection) {
			callback(collect, collection[i], i);
		}
		return o;
	};

	function flattenmap(collection, callback) {
		var arr = [];
		var collect = function (o) {
			arr.push(o);
		};
		for (var i in collection) {
			callback(collect, collection[i], i, collection);
		}
		return arr;
	};

	/**
	 * behaves like de-dup, but collect takes a second, 'value' argument.
	 * returns an object whose keys are the first arguments to collect,
	 * and values are arrays of all the values passed with that key
	 */
	function cluster(collection, callback) {
		var o = {};
		var collect = function (key, value) {
			if (key in o) {
				o[key].push(value);
			} else {
				o[key] = [value];
			}
		};
		for (var i in collection) {
			callback(collect, collection[i], i);
		}
		return o;
	};

	/**
	 * returns a version of an object that's safe to JSON,
	 * and is very conservative
	 * 
	 *   undefined -> { type: 'undefined', value: undefined }
	 *   null -> { type: 'undefined', value: null }
	 *   true -> { type: 'boolean', value: true }
	 *   4 -> { type: 'number', value: 4 }
	 *   "foo" -> { type: 'string', value: "foo" }
	 *   (function () { }) -> { type: 'object' }
	 *   { a: "b" } -> { type: 'object' }
	 */
	function marshalForTransmission(val, maxDepth) {
		if (maxDepth === undefined) {
			maxDepth = 1;
		}

		var o = { type: typeof(val) };
		if (["undefined", "boolean", "number", "string"].indexOf(o.type) !== -1) {
			if (typeof(val) === "undefined" && val !== undefined) {
				// special case: document.all claims to be undefined http://stackoverflow.com/questions/10350142/why-is-document-all-falsy
				o.type = "object";
				o.preview = "" + val;
			} else {
				o.value = val;
			}
		} else if (o.type === "object") {
			o.preview = "" + val;

			if (maxDepth > 0) {
				o.ownProperties = {};
				for (var key in val) {
					if (val.hasOwnProperty(key)) {
						o.ownProperties[key] = marshalForTransmission(val[key], maxDepth - 1);
					}
				}
			}
		}
		return o;
	}

	function Invocation(info, type) {
		this.id = nextInvocationId++;
		this.type = type;
		this.f = nodeById[info.nodeId];
		this.children = [];
		this.parents = [];
		this.logs = [];
		this.returnValue = undefined;
		this.exception = undefined;
		this.topLevelInvocationId = undefined;

		invocationById[this.id] = this;
		extraInvocationInfoById[this.id] = {
			entryVars: info.vars,
			exitVars: undefined,
			arguments: info.arguments,
			this: info.this,
		};
	}
	Invocation.prototype.equalToInfo = function (info) {
		return this.f.id === info.nodeId;
	};
	Invocation.prototype.linkToChild = function (child, linkType) {
		this.children.push(new InvocationLink(child.id, linkType));
		child.parents.push(new InvocationLink(this.id, linkType));
		if (['call', 'branch-enter'].indexOf(linkType) !== -1) {
			child.topLevelInvocationId = this.topLevelInvocationId;
		}
	};
	Invocation.prototype.addExitVars = function (vars) {
		this.extraInfo().exitVars = vars;
	};
	Invocation.prototype.extraInfo = function () {
		return extraInvocationInfoById[this.id];
	}
	Invocation.prototype.getChildren = function () {
		return this.children.map(function (link) { return invocationById[link.id]; });
	};
	Invocation.prototype.getParents = function () {
		return this.parents.map(function (link) { return invocationById[link.id]; });
	};
	Invocation.prototype.getParentLinks = function () {
		return this.parents;
	};

	function InvocationLink(destId, type) {
		this.id = destId;
		this.type = type;
	}

	function hit(invocation) {
		var id = invocation.f.id;
		for (var handle in nodeHitCounts) {
			var hits = nodeHitCounts[handle];
			hits[id] = (hits[id] || 0) + 1;
		}
		for (var handle in logEntries) {
			if (invocation.f.id === "log" || _logQueries[handle].ids.indexOf(id) !== -1) {
				logEntries[handle].push(invocation.id);
			}
		}
	}

	function calculateHitCounts() {
		var hits = {};
		nodes.forEach(function (n) {
			if (n.id in invocationsByNodeId) {
				hits[n.id] = invocationsByNodeId[n.id].length;
			}
		});
		return hits;
	}

	/** return ordered list of invocation ids for the given log query */
	function backlog(query) {
		var ids = [];
		(query.ids.concat("log")).forEach(function (nodeId) {
			var nodeInvIds = (invocationsByNodeId[nodeId] || []).map(function (inv) { return inv.id });
			ids.push.apply(ids, nodeInvIds);
		});
		ids = ids.sort(function (a, b) { return a - b });
		return ids;
	}


	// instrumentation

	function pushInvocation(invocation) {
		// add to invocationsByNodeId
		if (!invocationsByNodeId[invocation.f.id]) {
			invocationsByNodeId[invocation.f.id] = [];
		}
		invocationsByNodeId[invocation.f.id].push(invocation);

		// update hit counts
		hit(invocation);

		// associate with caller, if there is one; otherwise, save as a top-level invocation
		var top = invocationStack[invocationStack.length - 1];
		if (top) {
			top.linkToChild(invocation, 'call');
		} else {
			topLevelInvocations.push(invocation);
			invocation.topLevelInvocationId = invocation.id;
		}

		// associate with the invocation where this anonymous function was created
		if (anonFuncParentInvocation) {
			anonFuncParentInvocation.linkToChild(invocation, 'async');
			anonFuncParentInvocation = undefined;
		}

		invocationStack.push(invocation);
	}

	function popInvocation(info) {
		if (info) {
			var top = invocationStack[invocationStack.length - 1];
			if (!top || !top.equalToInfo(info)) {
				throw new Error('exit from a non-matching enter');
			}
			top.addExitVars(info.vars);
		}
		invocationStack.pop();
	}

	/**
	 * called from the top of every script processed by the rewriter
	 */
	this.add = function (path, options) {
		nodes.push.apply(nodes, options.nodes);
		options.nodes.forEach(function (n) { nodeById[n.id] = n; });

		_sendNodes(options.nodes);
	};

	this.traceFileEntry = function () {
	};

	this.traceFileExit = function () {
	};

	/**
	 * the rewriter wraps every anonymous function in a call to traceFunCreate.
	 * a new function is returned that's associated with the parent invocation.
	 */
	this.traceFunCreate = function (f) {
		var creatorInvocation = invocationStack[invocationStack.length - 1];
		if (creatorInvocation) {
			return function () {
				// traceEnter checks anonFuncParentInvocation and creates
				// an edge in the graph from the creator to the new invocation
				anonFuncParentInvocation = creatorInvocation;
				return f.apply(this, arguments);
			};
		} else {
			return f;
		}
	};

	/**
	 * the rewriter wraps the callee portion of every function call with a call
	 * to traceFunCall like this:
	 *
	 *   a.b('foo') -> (traceFunCall({ this: a, property: 'b', nodeId: '...', vars: {}))('foo')
	 *   b('foo') -> (traceFunCall({ func: b, nodeId: '...', vars: {}))('foo')
	 */
	var _traceLogCall = function (info) {
		return function () {
			pushInvocation(new Invocation(info, 'callsite'));
			pushInvocation(new Invocation({ nodeId: "log", arguments: Array.prototype.slice.apply(arguments) }, 'function'));
			popInvocation();
			popInvocation();
		}
	};
	this.traceFunCall = function (info) {
		if ('func' in info) {
			var func = info.func;
			if (func === console.log) {
				return _traceLogCall(info);
			}
			return function () {
				var invocation = new Invocation(info, 'callsite');
				pushInvocation(invocation);

				try {
					return func.apply(this, arguments);
				} finally {
					popInvocation();
				}
			}
		} else {
			var fthis = info.this;
			var func = fthis[info.property];
			if (func === console.log) {
				return _traceLogCall(info);
			}
			return function () {
				var invocation = new Invocation(info, 'callsite');
				pushInvocation(invocation);

				try {
					return func.apply(fthis, arguments);
				} finally {
					popInvocation();
				}
			}
		}
	};

	/**
	 * the rewriter calls traceEnter from just before the try clause it wraps
	 * function bodies in. info is an object like:
	 *
	 *   {
	 *     start: { line: ..., column: ... },
	 *     end: { line: ..., column: ... },
	 *     vars: { a: a, b: b, ... }
	 *   }
	 */
	this.traceEnter = function (info) {
		var invocation = new Invocation(info, 'function');
		pushInvocation(invocation);
	};

	/**
	 * the rewriter calls traceExit from the finally clause it wraps function
	 * bodies in. info is an object like:
	 *
	 *   {
	 *     start: { line: ..., column: ... },
	 *     end: { line: ..., column: ... }
	 *   }
	 *
	 * in the future, traceExit will be passed an object with all the
	 * local variables of the instrumented function.
	 */
	this.traceExit = function (info) {
		popInvocation(info);
	};

	this.traceReturnValue = function (value) {
		var top = invocationStack[invocationStack.length - 1];
		if (!top) {
			throw new Error('value returned with nothing on the stack');
		}
		top.returnValue = value;
		return value;
	}

	/**
	 * the rewriter calls traceExceptionThrown from the catch clause it wraps
	 * function bodies in. info is an object like:
	 *
	 *   {
	 *     start: { line: ..., column: ... },
	 *     end: { line: ..., column: ... }
	 *   }
	 */
	this.traceExceptionThrown = function (info, exception) {
		if (exception === lastException) {
			return;
		}

		var top = invocationStack[invocationStack.length - 1];
		if (!top || !top.equalToInfo(info)) {
			throw new Error('exception thrown from a non-matching enter');
		}
		top.exception = exception;
		lastException = exception;
	};

	this.traceBranchEnter = function (info) {
		var invocation = new Invocation(info, 'branch');

		// add to invocationsByNodeId
		if (!invocationsByNodeId[invocation.f.id]) {
			invocationsByNodeId[invocation.f.id] = [];
		}
		invocationsByNodeId[invocation.f.id].push(invocation);

		// update hit count
		hit(invocation);

		// associate with caller
		var top = invocationStack[invocationStack.length - 1];
		if (top) {
			top.linkToChild(invocation, 'branch-enter');
		} else {
			throw new Error('branch entered at top of stack')
		}

		invocationStack.push(invocation);
	};

	this.traceBranchExit = function (info) {
		var top = invocationStack[invocationStack.length - 1];
		if (!top || !top.equalToInfo(info)) {
			throw new Error('branch exit from a non-matching branch enter');
		}
		top.addExitVars(info.vars);
		invocationStack.pop();
	};

	this.traceBranchExceptionThrown = function (info, exception) {
		if (exception === lastException) {
			return;
		}

		var top = invocationStack[invocationStack.length - 1];
		if (!top || !top.equalToInfo(info)) {
			throw new Error('exception thrown from a non-matching branch enter');
		}
		top.exception = exception;
		lastException = exception;
	};

	this.log = function () {
		var top = invocationStack[invocationStack.length - 1];
		if (!top) {
			throw new Error('log made outside any invocation');
		}
		if (arguments.length === 1) {
			top.logs.push(JSON.stringify(arguments[0]));
		} else {
			top.logs.push(JSON.stringify(Array.prototype.slice.apply(arguments)));
		}
	};


	// remote prebuggin' (from Brackets)

	var _sendNodes = function (nodes) {
		if (_connected) {
			_sendBracketsMessage('scripts-added', JSON.stringify({ nodes: nodes }));
		}
	};

	function _sendBracketsMessage(name, value) {
		var key = "data-{name}-" + name;
		document.body.setAttribute(key, value);
		window.setTimeout(function () { document.body.removeAttribute(key); });
	}

	this.connect = function () {
		console.log("Opening the Developer Console will break the connection with Brackets!");
		_connected = true;
		_sendNodes(nodes);
		return this;
	};

	// accessors

	this.nodes = function () {
		return nodes;
	};

	this.trackHits = function () {
		var handle = _hitQueries.push(true) - 1;
		nodeHitCounts[handle] = calculateHitCounts();
		return handle;
	};

	this.trackLogs = function (query) {
		var handle = _logQueries.push(query) - 1;
		logEntries[handle] = backlog(query);
		return handle;
	};

	this.hitCountDeltas = function (handle) {
		if (!(handle in _hitQueries)) {
			throw "unrecognized query";
		}
		var result = nodeHitCounts[handle];
		nodeHitCounts[handle] = {};
		return result;
	};

	// okay, the second argument is kind of a hack
	function makeLogEntry(invocation, parents) {
		parents = (parents || []);
		var extra = extraInvocationInfoById[invocation.id];
		var entry = {
			invocationId: invocation.id,
			topLevelInvocationId: invocation.topLevelInvocationId,
			nodeId: invocation.f.id,
		};
		if (invocation.returnValue !== undefined) {
			entry.returnValue = marshalForTransmission(invocation.returnValue);
		}
		if (invocation.exception !== undefined) {
			entry.exception = marshalForTransmission(invocation.exception);
		}
		if (invocation.f.params) {
			entry.arguments = [];
			var params = invocation.f.params;
			for (var i = 0; i < params.length; i++) {
				var param = params[i];
				entry.arguments.push({
					name: param.name,
					value: marshalForTransmission(extra.arguments[i]),
				});
			}
			for (var i = params.length; i < extra.arguments.length; i++) {
				entry.arguments.push({
					value: marshalForTransmission(extra.arguments[i]),
				});
			}
		}
		if (extra.this !== undefined) {
			entry.this = marshalForTransmission(extra.this);
		}
		if (parents.length > 0) {
			// TODO: only include the parent with the shortest path
			entry.parents = parents;
		}
		return entry;
	}

	this.logDelta = function (handle, maxResults) {
		if (!(handle in _logQueries)) {
			throw "unrecognized query";
		}

		maxResults = maxResults || 10;

		var ids = logEntries[handle].splice(0, maxResults);
		var results = ids.map(function (invocationId, i) {
			var invocation = invocationById[invocationId];
			return makeLogEntry(invocation, findParentsInQuery(invocation, _logQueries[handle]));
		});
		return results;
	};

	this.backtrace = function (options) {
		options = mergeInto(options, {
			range: [0, 10],
		});

		var invocation = invocationById[options.invocationId];
		if (!invocation) {
			throw "invocation not found";
		}

		var stack = [];
		if (options.range[0] <= 0) {
			stack.push(invocation);
		}

		function search(invocation, depth) {
			// stop if we're too deep
			if (depth+1 >= options.range[1]) {
				return;
			}

			var callers = findCallers(invocation);
			var directCallers = callers.filter(function (c) { return c.type === "call" })
			var caller = directCallers[0];

			if (caller) {
				var parent = invocationById[caller.invocationId];
				if (options.range[0] <= depth+1) {
					stack.push(parent);
				}
				search(parent, depth + 1);
			}
		}
		search(invocation, 0);
		var results = stack.map(function (invocation) {
			return makeLogEntry(invocation);
		});
		return results;
	};

	function findParentsInQuery(invocation, query) {
		if (query.ids.length === 0) {
			return [];
		}

		var matches = {}; // invocation id -> link
		var types = ['async', 'call', 'branch-enter']; // in priority order
		function promoteType(type, newType) {
			if (types.indexOf(type) === -1 || types.indexOf(newType) === -1) {
				throw new Exception("invocation link type not known")
			}
			if (types.indexOf(newType) < types.indexOf(type)) {
				return newType;
			}
			return type;
		}
		function search(link, type) {
			if (query.ids.indexOf(invocationById[link.id].f.id) !== -1) {
				if (link.id in matches) {
					if (link.type === 'call' && matches[link.id].type === 'async') {
						matches[link.id] = {
							invocationId: link.id,
							type: type,
							inbetween: [] // TODO: actually include trace
						};
					}
				} else {
					matches[link.id] = {
						invocationId: link.id,
						type: type,
						inbetween: [] // TODO: actually include trace
					};
				}
				return; // search no more down this path
			}
			// TODO: could also stop if id is smaller than the smallest requested id
			invocationById[link.id].getParentLinks().forEach(function (link) { search(link, promoteType(type, link.type)); });
		}
		invocation.getParentLinks().forEach(function (link) { search(link, link.type); });

		// convert matches to an array
		var matchesArr = [];
		for (var id in matches) {
			matchesArr.push(matches[id]);
		}
		return matchesArr;
	}

	function findCallers(invocation) {
		var matches = {}; // invocation id -> link
		var types = ['async', 'call', 'branch-enter']; // in priority order
		function promoteType(type, newType) {
			if (types.indexOf(type) === -1 || types.indexOf(newType) === -1) {
				throw new Exception("invocation link type not known")
			}
			if (types.indexOf(newType) < types.indexOf(type)) {
				return newType;
			}
			return type;
		}
		function search(link, type) {
			if (invocationById[link.id].f.type === "function") {
				if (link.id in matches) {
					if (link.type === 'call' && matches[link.id].type === 'async') {
						matches[link.id] = {
							invocationId: link.id,
							type: type,
						};
					}
				} else {
					matches[link.id] = {
						invocationId: link.id,
						type: type,
					};
				}
				return; // search no more down this path
			}
			invocationById[link.id].getParentLinks().forEach(function (link) { search(link, promoteType(type, link.type)); });
		}
		invocation.getParentLinks().forEach(function (link) { search(link, link.type); });

		// convert matches to an array
		var matchesArr = [];
		for (var id in matches) {
			matchesArr.push(matches[id]);
		}
		return matchesArr;
	}
});
}

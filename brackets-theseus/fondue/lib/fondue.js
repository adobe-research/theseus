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

var falafel = require('falafel');
var fs = require('fs');
var JSHINT = require('./jshint').JSHINT;


// adds keys from options to defaultOptions, overwriting on conflicts & returning defaultOptions
function mergeInto(options, defaultOptions) {
	for (var key in options) {
		defaultOptions[key] = options[key];
	}
	return defaultOptions;
}

function template(s, vars) {
	for (var p in vars) {
		s = s.replace(new RegExp('{' + p + '}', 'g'), vars[p]);
	}
	return s;
}


/**
 * options:
 *   name (tracer): name for the global tracer object
 **/
function instrumentationPrefix(options) {
	options = mergeInto(options, {
		name: 'tracer',
	});

	return template(fs.readFileSync(__dirname + '/tracer.js', 'utf8'), { name: options.name });
}

/**
 * options:
 *   path (<anonymous>): path of the source being instrumented
 *       (should be unique if multiple instrumented files are to be run together)
 *   include_prefix (true): include the instrumentation thunk
 *   tracer_name (tracer): name for the global tracer object
 **/
function instrument(src, options) {
	var defaultOptions = {
		include_prefix: true,
		tracer_name: 'tracer',
	};
	options = mergeInto(options, defaultOptions);

	var output = '';

	if (options.include_prefix) {
		output += instrumentationPrefix({ name: options.tracer_name });
	}

	output += traceFilter(src, {
		path: options.path,
		tracer_name: options.tracer_name
	});

	return output;
}









/** comparator for positions in the form { line: XXX, column: YYY } */
var comparePositions = function (a, b) {
	if (a.line !== b.line) {
		return a.line < b.line ? -1 : 1;
	}
	if (a.column !== b.column) {
		return a.column < b.column ? -1 : 1;
	}
	return 0;
};

function contains(start, end, pos) {
	var startsBefore = comparePositions(start, pos) <= 0;
	var endsAfter    = comparePositions(end,   pos) >= 0;
	if (startsBefore && endsAfter) {
		return true;
	}
}


/**
 * returns all functions containing the given line/column, in order of
 * appearance in the file
 */
var findContainingFunctions = function (functions, line, column) {
	/** comparator for functions, sorts by their starting position */
	var compareFunctionsByPosition = function (a, b) {
		return comparePositions(a.start, b.start);
	};

	var funcs = [];
	for (var i in functions) {
		var startsBefore = comparePositions(functions[i].start, { line: line, column: column }) <= 0;
		var endsAfter    = comparePositions(functions[i].end,   { line: line, column: column }) >= 0;
		if (startsBefore && endsAfter) {
			funcs.push(functions[i]);
		}
	}

	// sort functions by appearance (i.e. by nesting level)
	funcs.sort(compareFunctionsByPosition);

	return funcs;
};




var makeId = function (type, path, loc) {
	return path + '-'
	     + loc.start.line + '-'
	     + loc.start.column + '-'
	     + loc.end.line + '-'
	     + loc.end.column;
};

// uses the surrounding code to generate a reasonable name for a function
var concoctFunctionName = function (node) {
	var name = undefined;

	if (node.type === 'FunctionDeclaration') {
		// function xxx() { }
		//  -> "xxx"
		name = node.id.name;
	} else if (node.type === 'FunctionExpression') {
		if (node.id) {
			// (function xxx() { })
			//  -> "xxx"
			name = node.id.name;
		} else if (node.parent.type === 'VariableDeclarator') {
			// var xxx = function () { }
			//  -> "xxx"
			name = node.parent.id.name;
		} else if (node.parent.type === 'AssignmentExpression') {
			var left = node.parent.left;
			if (left.type === 'MemberExpression' && !left.computed) {
				if (left.object.type === 'MemberExpression' && !left.object.computed) {
					if (left.object.property.type === 'Identifier' && left.object.property.name === 'prototype') {
						// yyy.prototype.xxx = function () { }
						//  -> "yyy.xxx"
						name = left.object.object.name + '.' + left.property.name;
					}
				}
			}
		} else if (node.parent.type === 'CallExpression') {
			// look, I know this is a regexp, I'm just sick of parsing ASTs
			if (/\.on$/.test(node.parent.callee.source())) {
				var args = node.parent.arguments;
				if (args[0].type === 'Literal' && typeof args[0].value === 'string') {
					// .on('event', function () { })
					//  -> "('event' handler)"
					name = "('" + args[0].value + "' handler)";
				}
			} else if (node.parent.callee.type === 'Identifier') {
				if (['setTimeout', 'setInterval'].indexOf(node.parent.callee.name) !== -1) {
					// setTimeout(function () { }, xxx)
					// setInterval(function () { }, xxx)
					//  -> "timer handler"
					name = 'timer handler';
					if (node.parent.arguments[1] && node.parent.arguments[1].type === 'Literal' && typeof node.parent.arguments[1].value === 'number') {
						// setTimeout(function () { }, 100)
						// setInterval(function () { }, 100)
						//  -> "timer handler (100ms)"
						//  -> "timer handler (1.5s)"
						if (node.parent.arguments[1].value < 1000) {
							name += ' (' + node.parent.arguments[1].value + 'ms)';
						} else {
							name += ' (' + (node.parent.arguments[1].value / 1000) + 's)';
						}
					}
				}
			}
		} else if (node.parent.type === 'Property') {
			// { xxx: function () { } }
			//  -> "xxx"
			name = node.parent.key.name || node.parent.key.value;
			if (name !== undefined) {
				if (node.parent.parent.type === 'ObjectExpression') {
					var obj = node.parent.parent;
					if (obj.parent.type === 'VariableDeclarator') {
						// var yyy = { xxx: function () { } }
						//  -> "yyy.xxx"
						name = obj.parent.id.name + '.' + name;
					} else if(obj.parent.type === 'AssignmentExpression') {
						var left = obj.parent.left;
						if (left.type === 'MemberExpression' && !left.computed) {
							if (left.object.type === 'Identifier' && left.property.name === 'prototype') {
								// var yyy.prototype = { xxx: function () { } }
								//  -> "yyy::xxx"
								name = left.object.name + '::' + name;
							}
						}
					}
				}
			}
		}
	}

	return name;
};

var extractTracePoints = function (content, path) {
	var nodes = [];

	try {
		falafel({
			source: content,
			loc: true
		}, function (node) {

			if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
				var params = [];
				node.params.forEach(function (param) {
					params.push({ name: param.name, start: param.loc.start, end: param.loc.end });
				});

				nodes.push({
					path: path,
					start: node.loc.start,
					end: node.loc.end,
					id: makeId("function", path, node.loc),
					type: "function",
					childrenIds: [],
					parentId: undefined,
					name: concoctFunctionName(node),
					params: params
				});

			} else if (node.type === 'CallExpression') {
				var nameLoc = (node.callee.type === 'MemberExpression') ? node.callee.property.loc : node.callee.loc;

				nodes.push({
					path: path,
					start: node.loc.start,
					end: node.loc.end,
					id: makeId("callsite", path, node.loc),
					type: "callsite",
					childrenIds: [],
					parentId: undefined,
					name: node.callee.source(),
					nameStart: nameLoc.start,
					nameEnd: nameLoc.end
				});

			} else if (node.type === 'IfStatement') {
				var handleBranch = function (node) {
					nodes.push({
						path: path,
						start: node.loc.start,
						end: node.loc.end,
						id: makeId("branch", path, node.loc),
						type: "branch",
						childrenIds: [],
						parentId: undefined,
					});
				};

				if (node.consequent) {
					handleBranch(node.consequent);
				}

				// we will have already visited a nested IfStatement since falafel visits children first
				if (node.alternate && node.alternate.type !== 'IfStatement') {
					handleBranch(node.alternate);
				}
			}
		}).toString();

		// I ought to be able to do this by taking advantage of falafel's walk order,
		// but I don't feel like being that fancy right now

		// link up parent pointers
		var nodesById = {};
		nodes.forEach(function (n1) {
			nodesById[n1.id] = n1;

			nodes.forEach(function (n2) {
				if (n1 == n2) {
					return;
				}

				if (contains(n1.start, n1.end, n2.start, n2.end)) {
					// set as parent if it's closer than the current parent
					if (n2.parentId) {
						if (comparePositions(n1, n2.parentId) > 0) {
							n2.parentId = n1.id;
						}
					} else {
						n2.parentId = n1.id;
					}
				}
			});
		});

		// link children pointers using the parent pointers
		nodes.forEach(function (n) {
			if (n.parentId) {
				nodesById[n.parentId].childrenIds.push(n.id);
			}
		});

	} catch (e) {
		console.log("exception during parsing", e);
		return;
	}

	return JSON.stringify({ nodes: nodes });
};

/**
 * injects code for tracing the execution of functions.
 *
 * the bodies of named functions are:
 *  - wrapped in try {} finally {},
 *  - have a call to traceEnter is prepended, and
 *  - have a call to traceExit added to the finally block
 *
 * here is an example:
 *
 *   function foo() {...}
 *     -->
 *   function foo() {
 *     tracer.traceEnter({
 *       start: { line: ..., column: ... },
 *       end: { line: ..., column: ... },
 *       vars: { a: a, b: b, ... }
 *     });
 *     try {
 *       ...
 *     } finally {
 *       tracer.traceExit({
 *         start: { line: ..., column: ... },
 *         end: { line: ..., column: ... }
 *       });
 *     }
 *   }
 *
 * anonymous functions get the same transformation, but they're also
 * wrapped in a call to traceFunCreate:
 *
 *   function () {...}
 *     -->
 *   tracer.traceFunCreate({
 *     start: { line: ..., column: ... },
 *     end: { line: ..., column: ... }
 *   }, function () {...})
 */
var traceFilter = function (content, options) {
	if (content.trim() === '') {
		return content;
	}

	var defaultOptions = {
		path: '<anonymous>',
		tracer_name: 'tracer',
		trace_exceptions: true,
		trace_function_entry: true,
		trace_function_creation: true,
		trace_function_calls: true,
		trace_branches: false,
		trace_switches: false,
		trace_loops: false,
	};
	options = mergeInto(options, defaultOptions);

	JSHINT(content);
	var jshintData = JSHINT.data();

	var processed = content;

	try {
		processed = falafel({
			source: content,
			loc: true
		}, function (node) {

			var loc = {
				path: options.path,
				start: node.loc.start,
				end: node.loc.end
			};

			/**
			 * find all variables in scope and generate the code to capture
			 * their values like { a: a, b: b, ... }
			 */
			var makeCaptureVarsJS = function (node, includeLocal) {
				var vars = findVariablesInScope(jshintData, node.loc.start.line, node.loc.start.column, includeLocal);
				var captureVarsJS = '';
				for (var i = 0; i < vars.length; i++) {
					if (i > 0) {
						captureVarsJS += ',';
					}
					captureVarsJS += vars[i] + ":" + vars[i];
				}
				return '{' + captureVarsJS + '}';
			};

			var traceBranch = function (node) {
				var attrs = { nodeId: makeId("branch", options.path, node.loc) };
				// TODO: take into account which variables can't have values at beginning and end
				var captureVarsJS = makeCaptureVarsJS(node, true);
				var postCaptureVarsJS = makeCaptureVarsJS(node, true);

				// convert the arguments to strings
				var args = JSON.stringify(attrs);
				var entryArgs = args.slice(0, args.length - 1) + ', vars: ' + captureVarsJS + '}';
				var exitArgs = args.slice(0, args.length - 1) + ', vars: ' + postCaptureVarsJS + '}';

				var oldBody = node.source();
				if (oldBody[0] === '{') {
					oldBody = oldBody.slice(1, oldBody.length - 1); // remove braces
				}

				// insert the traces for when the function is called and when it exits
				var traceBegin = options.tracer_name + '.traceBranchEnter(' + entryArgs + ');';
				var traceError = options.tracer_name + '.traceBranchExceptionThrown(' + exitArgs + ', e); throw e;';
				var traceEnd = ';' + options.tracer_name + '.traceBranchExit(' + exitArgs + ');';
				if (options.trace_exceptions) {
					// add line break after oldBody in case it ends in a //-comment
					node.update('{ ' + traceBegin + ' try { ' + oldBody + '\n } catch (e) { ' + traceError + ' } finally { ' + traceEnd + ' } }');
				} else {
					// add line break after oldBody in case it ends in a //-comment
					node.update('{ ' + traceBegin + oldBody + '\n' + traceEnd + ' }');
				}
			};

			if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
				var attrs = { nodeId: makeId('function', options.path, node.loc) };
				var captureVarsJS = makeCaptureVarsJS(node.body);
				var postCaptureVarsJS = makeCaptureVarsJS(node.body, true);

				// convert the arguments to strings
				var args = JSON.stringify(attrs);
				var entryArgs = args.slice(0, args.length - 1) + ', vars: ' + captureVarsJS + ', arguments: Array.prototype.slice.apply(arguments), this: this }';
				var exitArgs = args.slice(0, args.length - 1) + ', vars: ' + postCaptureVarsJS + '}';

				if (options.trace_function_entry) {
					// insert the traces for when the function is called and when it exits
					var oldBody = node.body.source().slice(1, node.body.source().length - 1);
					var traceBegin = options.tracer_name + '.traceEnter(' + entryArgs + ');';
					var traceError = options.tracer_name + '.traceExceptionThrown(' + exitArgs + ', e); throw e;';
					var traceEnd = ';' + options.tracer_name + '.traceExit(' + exitArgs + ');';
					if (options.trace_exceptions) {
						// add line break after oldBody in case it ends in a //-comment
						node.body.update('{ ' + traceBegin + ' try { ' + oldBody + '\n } catch (e) { ' + traceError + ' } finally { ' + traceEnd + ' } }');
					} else {
						// add line break after oldBody in case it ends in a //-comment
						node.body.update('{ ' + traceBegin + oldBody + '\n' + traceEnd + ' }');
					}
				}

				if (node.type === 'FunctionExpression' && options.trace_function_creation) {
					node.update(options.tracer_name + '.traceFunCreate(' + node.source() + ')');
				}
			} else if (node.type === 'CallExpression') {
				if (options.trace_function_calls) {
					var id = makeId("callsite", loc.path, loc);

					if (node.callee.source() !== "require") {
						if (node.callee.type === 'MemberExpression') {
							if (node.callee.computed) {
								node.callee.update(' ' + options.tracer_name + '.traceFunCall({ this: ' + node.callee.object.source() + ', property: ' + node.callee.property.source() + ', nodeId: ' + JSON.stringify(id) + ', vars: {} })');
							} else {
								node.callee.update(' ' + options.tracer_name + '.traceFunCall({ this: ' + node.callee.object.source() + ', property: "' + node.callee.property.source() + '", nodeId: ' + JSON.stringify(id) + ', vars: {} })');
							}
						} else {
							node.callee.update(' ' + options.tracer_name + '.traceFunCall({ func: ' + node.callee.source() + ', nodeId: ' + JSON.stringify(id) + ', vars: {} })');
						}
					}
				}
			} else if (/Statement$/.test(node.type)) {
				var semiColonStatements = ["BreakStatement", "ContinueStatement", "ExpressionStatement", "ReturnStatement", "ThrowStatement"];
				if (node.type === "ReturnStatement" && node.argument) {
					node.argument.update(" " + options.tracer_name + ".traceReturnValue(" + node.argument.source() + ")");
				} else if (node.type === 'IfStatement') {
					if (options.trace_branches) {
						traceBranch(node.consequent);
						if (node.alternate && node.alternate.type !== 'IfStatement') { // if "else if" don't treat else as a block
							traceBranch(node.alternate);
						}
					}
				} else if (semiColonStatements.indexOf(node.type) !== -1) {
					if (!/;$/.test(node.source())) {
						node.update(node.source() + ";");
					}
				}
			} else if (node.type === 'SwitchStatement') {
				if (options.trace_switches) {
					for (var i in node.cases) {
						var c = node.cases[i];
						if (c.consequent.length > 0) {
							// it's impossible to get the source minus the "case 0:" at the beginning,
							// so calculate the offset of the first statement of the consequence, then slice off the front
							var relStart = {
								line: c.consequent[0].loc.start.line - c.loc.start.line,
								column: c.consequent[0].loc.start.column - c.loc.start.column
							};
							var source = c.source();
							var lines = c.source().split("\n").slice(relStart.line);
							lines[0] = lines[0].slice(relStart.column);
							var sourceWithoutCase = lines.join('\n');

							var attrs = { path: c.loc.path, start: c.loc.start, end: c.loc.end };
							console.log({
								attrs: attrs,
								originalSource: sourceWithoutCase
							});
						}
					}
				}
			} else if (node.type === 'ForStatement' || node.type === 'ForInStatement') {
				if (options.trace_loops) {
					node.body;
				}
			} else if (node.type === 'WhileStatement' || node.type === 'DoWhileStatement') {
				if (options.trace_loops) {
					node.body;
				}
			}
		}).toString();
	} catch (e) {
		console.log('exception during parsing', e);
		return content;
	}

	var prologue = options.tracer_name + '.add(' + JSON.stringify(options.path) + ', ' + extractTracePoints(content, options.path) + '); ';
	// add line break after processed in case it ends in a //-comment
	return prologue + options.tracer_name + '.traceFileEntry(); try { ' + processed + '\n } finally { ' + options.tracer_name + '.traceFileExit(); }';
};

/**
 * finds the variables that are in scope at the given line/col using the
 * provided jshintData object, which you can obtain like this:
 * 
 *   jshint(src);
 *   var jshintData = jshint.data();
 * 
 * by default (if includeAllLocal is not true), local variables (except for
 * parameters) in the inner-most scope will not be included. for example:
 * 
 *   function foo(a) {
 *     var b;
 *     var c = function (d) {
 *       // XXX
 *       var e;
 *     }
 *   }
 * 
 * if you provide a line/col at the XXX, you'll receive
 *   [a, b, c, d]    if includeAllLocal is false
 *   [a, b, c, d, e] if includeAllLocal is true
 */
function findVariablesInScope(jshintData, line, col, includeAllLocal) {
	var fInfo = jshintData.functions;

	// comparator for positions in the form { line: XXX, character: YYY }
	var compare = function (pos1, pos2) {
		var c = pos1.line - pos2.line;
		if (c == 0) {
			c = pos1.character - pos2.character;
		}
		return c;
	};

	// finds all functions in fInfo surrounding line/col
	var findContainingFunctions = function () {
		var functions = [];
		for (var i in fInfo) {
			var startsBefore = compare({ line: fInfo[i].line, character: fInfo[i].character },
										 { line: line, character: col }) <= 0;
			var endsAfter    = compare({ line: fInfo[i].last, character: fInfo[i].lastcharacter },
										 { line: line, character: col }) >= 0;
			if (startsBefore && endsAfter) {
				functions.push(fInfo[i]);
			}
		}

		// sort functions by appearance (just in case they aren't)
		functions.sort(function (a, b) {
			if (a.line !== b.line) {
				return a.line < b.line ? -1 : 1;
			}
			if (a.character !== b.character) {
				return a.character < b.character ? -1 : 1;
			}
			return 0;
		});

		return functions;
	};

	// returns all variables that are in scope (except globals) from the given list of functions
	var collectVars = function (functions) {
		var outerGroups = ['closure', 'outer', 'var', 'unused', 'param'];
		var innerGroups = ['param'];

		// add vars as keys in an object (de-dup)
		var varsO = {};
		for (var i = 0; i < functions.length; i++) {
			var newVars = [];
			var group = (!includeAllLocal && i == functions.length - 1) ? innerGroups : outerGroups;
			for (var j in group) {
				newVars = newVars.concat(functions[i][group[j]] || []);
			}
			for (var v in newVars) {
				varsO[newVars[v]] = true;
			}
		}

		// pull them out into a sorted array
		var vars = [];
		for (var i in varsO) {
			vars.push(i);
		}
		return vars.sort();
	};

	return collectVars(findContainingFunctions());
}


module.exports = {
	instrument: instrument,
	instrumentationPrefix: instrumentationPrefix,
};

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

var assert = require('assert');
var fondue = require('../lib/fondue');
var fs = require('fs');
var vm = require('vm');

var wrapper = fs.readFileSync('scripts/wrapper.js', 'utf8');
function wrap(src) {
	return wrapper.replace("[[script]]", src);
}

var marshalledGlobalObject = {
	type: 'object',
	preview: '[object Object]',
	ownProperties: {
		setTimeout: { type: 'function' },
		console: { type: 'object', preview: '[object Object]' },
		tracer: { type: 'object', preview: '[object Object]' }
	},
};

function test001() {
	var src = fondue.instrument(fs.readFileSync('scripts/script-001.js', 'utf8'));
	var output = vm.runInNewContext(wrap(src), { setTimeout: setTimeout, console: console })();
	var tracer = output.tracer;
	assert.equal(output.exception, undefined);

	// ensure it knows about the functions and foo() call site
	var fooNode = tracer.nodes().filter(function (n) { return n.type === 'function' && n.name === 'foo' })[0];
	var barNode = tracer.nodes().filter(function (n) { return n.type === 'function' && n.name === 'bar' })[0];
	var fooCallSiteNode = tracer.nodes().filter(function (n) { return n.type === 'callsite' && n.name === 'foo' })[0];
	var barCallSiteNode = tracer.nodes().filter(function (n) { return n.type === 'callsite' && n.name === 'bar' && n.start.line === 7 })[0];
	assert.notEqual(fooNode, undefined);
	assert.notEqual(barNode, undefined);
	assert.notEqual(fooCallSiteNode, undefined);
	assert.notEqual(barCallSiteNode, undefined);

	// start tracking
	var hitHandle1 = tracer.trackHits();
	var hitHandle2 = tracer.trackHits();

	// test that having multiple queries still shows all hits for each query
	var hits1a = tracer.hitCountDeltas(hitHandle1);
	assert.equal(hits1a[fooNode.id], 1);
	assert.equal(hits1a[fooCallSiteNode.id], 1);
	assert.equal(hits1a[barNode.id], 1);
	assert(!(barCallSiteNode.id in hits1a));

	var hits2a = tracer.hitCountDeltas(hitHandle2);
	assert.equal(hits2a[fooNode.id], 1);
	assert.equal(hits2a[fooCallSiteNode.id], 1);
	assert.equal(hits2a[barNode.id], 1);
	assert(!(barCallSiteNode.id in hits2a));

	// test that calling again only returns the (empty) deltas
	var hits1b = tracer.hitCountDeltas(hitHandle1);
	assert(!(fooNode.id in hits1b));
	assert(!(fooCallSiteNode.id in hits1b));
	assert(!(barNode.id in hits1b));
	assert(!(barCallSiteNode.id in hits1b));

	var hits2b = tracer.hitCountDeltas(hitHandle2);
	assert(!(fooNode.id in hits2b));
	assert(!(fooCallSiteNode.id in hits2b));
	assert(!(barNode.id in hits2b));
	assert(!(barCallSiteNode.id in hits2b));

	// test that the deltas are updated over time with new traces
	setTimeout(function () {
		var hits1c = tracer.hitCountDeltas(hitHandle1);
		assert(!(fooNode.id in hits1c));
		assert(!(fooCallSiteNode.id in hits1c));
		assert.equal(hits1c[barNode.id], 1);
		assert.equal(hits1c[barCallSiteNode.id], 1);

		var hits2c = tracer.hitCountDeltas(hitHandle2);
		assert(!(fooNode.id in hits2c));
		assert(!(fooCallSiteNode.id in hits2c));
		assert.equal(hits2c[barNode.id], 1);
		assert.equal(hits2c[barCallSiteNode.id], 1);
	}, 200);
}

function test002() {
	var src = fondue.instrument(fs.readFileSync('scripts/script-001.js', 'utf8'));
	var output = vm.runInNewContext(wrap(src), { setTimeout: setTimeout, console: console })();
	var tracer = output.tracer;
	assert.equal(output.exception, undefined);

	// ensure it knows about the functions and foo() call site
	var fooNode = tracer.nodes().filter(function (n) { return n.type === 'function' && n.name === 'foo' })[0];
	var barNode = tracer.nodes().filter(function (n) { return n.type === 'function' && n.name === 'bar' })[0];
	var fooCallSiteNode = tracer.nodes().filter(function (n) { return n.type === 'callsite' && n.name === 'foo' })[0];
	var barCallSiteNode = tracer.nodes().filter(function (n) { return n.type === 'callsite' && n.name === 'bar' && n.start.line === 7 })[0];
	assert.notEqual(fooNode, undefined);
	assert.notEqual(barNode, undefined);
	assert.notEqual(fooCallSiteNode, undefined);
	assert.notEqual(barCallSiteNode, undefined);

	// start tracking
	var logHandle1 = tracer.trackLogs({ ids: [fooNode.id, barNode.id] });
	var logHandle2 = tracer.trackLogs({ ids: [fooNode.id, barNode.id] });

	// test that we can fetch logs
	var expectedLog1 = [
		{ invocationId: 1, nodeId: fooNode.id, topLevelInvocationId: 0, this: marshalledGlobalObject, arguments: [{ name: 'a', value: { type: 'number', value: 1 } }] },
		{ invocationId: 3, nodeId: barNode.id, topLevelInvocationId: 0, this: marshalledGlobalObject, arguments: [{ name: 'b', value: { type: 'number', value: 2 } }], parents: [{ invocationId: 1, type: 'call', inbetween: [] }] },
	];

	// step through the logs with both handles in lock-step
	assert.deepEqual(tracer.logDelta(logHandle1, 1), expectedLog1.slice(0, 1));
	assert.deepEqual(tracer.logDelta(logHandle2, 1), expectedLog1.slice(0, 1));
	assert.deepEqual(tracer.logDelta(logHandle1, 1), expectedLog1.slice(1, 2));
	assert.deepEqual(tracer.logDelta(logHandle2, 1), expectedLog1.slice(1, 2));

	assert.deepEqual(tracer.logDelta(logHandle1, 1), []);
	assert.deepEqual(tracer.logDelta(logHandle2, 1), []);

	setTimeout(function () {
		// test that the log now also holds the new values
		var expectedLog2 = [
			{ invocationId: 7, nodeId: barNode.id, topLevelInvocationId: 5, this: marshalledGlobalObject, arguments: [{ name: 'b', value: { type: 'number', value: 3 } }] },
		];

		// drain the first handle's logs, then the other
		assert.deepEqual(tracer.logDelta(logHandle1, 1), expectedLog2.slice(0, 1));
		assert.deepEqual(tracer.logDelta(logHandle1, 1), []);

		assert.deepEqual(tracer.logDelta(logHandle2, 1), expectedLog2.slice(0, 1));
		assert.deepEqual(tracer.logDelta(logHandle2, 1), []);
	}, 200);
}

function test003() {
	var src = fondue.instrument(fs.readFileSync('scripts/script-002.js', 'utf8'));
	var output = vm.runInNewContext(wrap(src), { setTimeout: setTimeout, console: console })();
	var tracer = output.tracer;
	assert.equal(output.exception, undefined);

	// ensure it knows about the functions and foo() call site
	var fooNode = tracer.nodes().filter(function (n) { return n.type === 'function' && n.name === 'foo' })[0];
	var barNode = tracer.nodes().filter(function (n) { return n.type === 'function' && n.name === 'bar' })[0];
	assert.notEqual(fooNode, undefined);
	assert.notEqual(barNode, undefined);

	// start tracking
	var logHandle = tracer.trackLogs({ ids: [fooNode.id, barNode.id] });

	setTimeout(function () {
		var marshalledTimer = { type: 'object',
			preview: '[object Timer]',
			ownProperties: {
				_callback: { type: 'function' },
				_onTimeout: { type: 'function' },
				ontimeout: { type: 'function' },
			},
		};

		var expectedLog = [
			{ invocationId: 1, nodeId: fooNode.id, topLevelInvocationId: 0, this: marshalledGlobalObject, arguments: [] },
			{ invocationId: 3, nodeId: barNode.id, topLevelInvocationId: 3, this: marshalledTimer, arguments: [], parents: [{ invocationId: 1, type: 'async', inbetween: [] }] },
		];

		assert.deepEqual(tracer.logDelta(logHandle, 3), expectedLog);
	}, 200);
}

function test004() {
	var src = fondue.instrument(fs.readFileSync('scripts/script-003.js', 'utf8'));
	var output = vm.runInNewContext(wrap(src), { setTimeout: setTimeout, console: console })();
	var tracer = output.tracer;
	assert.equal(output.exception, undefined);

	// ensure it knows about the functions and foo() call site
	var aNode = tracer.nodes().filter(function (n) { return n.type === 'function' && n.name === 'a' })[0];
	var bNode = tracer.nodes().filter(function (n) { return n.type === 'function' && n.name === 'b' })[0];
	var cNode = tracer.nodes().filter(function (n) { return n.type === 'function' && n.name === 'c' })[0];
	assert.notEqual(aNode, undefined);
	assert.notEqual(bNode, undefined);
	assert.notEqual(cNode, undefined);

	// start tracking
	var logHandle = tracer.trackLogs({ ids: [cNode.id] });

	var expectedLog = [
		{ invocationId: 5, nodeId: cNode.id, topLevelInvocationId: 0, this: marshalledGlobalObject, arguments: [] },
	];
	assert.deepEqual(tracer.logDelta(logHandle, 3), expectedLog);

	var expectedBacktrace = [
		{ invocationId: 5, nodeId: cNode.id, topLevelInvocationId: 0, this: marshalledGlobalObject, arguments: [] },
		{ invocationId: 3, nodeId: bNode.id, topLevelInvocationId: 0, this: marshalledGlobalObject, arguments: [] },
		{ invocationId: 1, nodeId: aNode.id, topLevelInvocationId: 0, this: marshalledGlobalObject, arguments: [] },
	];
	assert.deepEqual(tracer.backtrace({ invocationId: 5, range: [0, 1] }), expectedBacktrace.slice(0, 1));
	assert.deepEqual(tracer.backtrace({ invocationId: 5, range: [1, 2] }), expectedBacktrace.slice(1, 2));
	assert.deepEqual(tracer.backtrace({ invocationId: 5, range: [2, 3] }), expectedBacktrace.slice(2, 3));
	assert.deepEqual(tracer.backtrace({ invocationId: 5, range: [0, 3] }), expectedBacktrace);
}

function test005() {
	var src = fondue.instrument(fs.readFileSync('scripts/script-004.js', 'utf8'));
	var output = vm.runInNewContext(wrap(src), { setTimeout: setTimeout, console: console })();
	var tracer = output.tracer;
	assert.equal(output.exception, undefined);

	var logNode = tracer.nodes().filter(function (n) { return n.type === 'function' && n.name === 'log' })[0];
	assert.notEqual(logNode, undefined);

	var logHandle = tracer.trackLogs({ ids: [logNode.id] });

	var expectedLog = [
		{ invocationId: 1, nodeId: logNode.id, topLevelInvocationId: 0, this: marshalledGlobalObject, arguments: [{ name: 'first', value: { type: 'undefined', value: undefined } }] },
		{ invocationId: 3, nodeId: logNode.id, topLevelInvocationId: 2, this: marshalledGlobalObject, arguments: [{ name: 'first', value: { type: 'number', value: 1 } }] },
		{ invocationId: 5, nodeId: logNode.id, topLevelInvocationId: 4, this: marshalledGlobalObject, arguments: [{ name: 'first', value: { type: 'string', value: 'a' } }, { value: { type: 'string', value: 'b' } }] },
	];
	assert.deepEqual(tracer.logDelta(logHandle, 3), expectedLog);
}

function test006() {
	var src = fondue.instrument(fs.readFileSync('scripts/script-005.js', 'utf8'));
	var output = vm.runInNewContext(wrap(src), { setTimeout: setTimeout, console: console })();
	var tracer = output.tracer;
	assert.equal(output.exception, undefined);

	var logNode = tracer.nodes().filter(function (n) { return n.id === 'log' })[0];
	var fooNode = tracer.nodes().filter(function (n) { return n.type === 'function' && n.name === 'foo' })[0];
	assert.notEqual(logNode, undefined);
	assert.notEqual(fooNode, undefined);

	var logHandle = tracer.trackLogs({ ids: [fooNode.id] });

	var expectedLog = [
		{ invocationId: 1, nodeId: fooNode.id, topLevelInvocationId: 0, this: marshalledGlobalObject, arguments: [] },
		{ invocationId: 3, nodeId: logNode.id, topLevelInvocationId: 0, arguments: [{ value: { type: 'string', value: 'wat!' } }], parents: [{ invocationId: 1, type: 'call', inbetween: [] }] },
	];
	assert.deepEqual(tracer.logDelta(logHandle, 3), expectedLog);
}

test001();
test002();
test003();
test004();
test005();
test006();

/*
TODO:
- test that variables-in-scope are extracted correctly (seems broken)
- top-level nodes
*/

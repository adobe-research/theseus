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

/*!
 * Based on:
 *   Connect - staticProvider
 *   Copyright(c) 2010 Sencha Inc.
 *   Copyright(c) 2011 TJ Holowaychuk
 *   MIT Licensed
 */

/*
 middleware that works just like connect.static, but with callbacks for
 filtering the response body

 var staticMiddleware = require('middleware-static');
 var app = connect().use(staticMiddleware(rootDir, {
   accept: function (req, contentType) { return true },
   filter: function (req, realPath, contentType, content) { return content.replace(/foo/g, 'bar') }
 }));
 */

var fs = require('fs'),
    path = require('path'),
    join = path.join,
    basename = path.basename,
    normalize = path.normalize,
    parse = require('url').parse,
    mime = require('mime');

module.exports = function (root, options){
  options = options || {};

  // root required
  if (!root) throw new Error('static() root path required');
  options.root = root;

  return function static(req, res, next) {
    options.path = req.url;
    options.getOnly = true;
    send(req, res, next, options);
  };
};

/**
 * Expose mime module.
 *
 * If you wish to extend the mime table use this
 * reference to the "mime" module in the npm registry.
 */

exports.mime = mime;

/**
 * decodeURIComponent.
 *
 * Allows V8 to only deoptimize this fn instead of all
 * of send().
 *
 * @param {String} path
 * @api private
 */

function decode(path){
  try {
    return decodeURIComponent(path);
  } catch (err) {
    return err;
  }
}

/**
 * Attempt to transfer the requested file to `res`.
 *
 * @param {ServerRequest}
 * @param {ServerResponse}
 * @param {Function} next
 * @param {Object} options
 * @api private
 */

var send = exports.send = function(req, res, next, options){
  options = options || {};
  if (!options.path) throw new Error('path required');

  // setup
  var head = 'HEAD' == req.method
    , get = 'GET' == req.method
    , root = options.root ? normalize(options.root) : null
    , redirect = false === options.redirect ? false : true
    , getOnly = options.getOnly
    , fn = options.callback
    , hidden = options.hidden
    , done;

    res.setHeader('Cache-Control', 'no-cache');

  // replace next() with callback when available
  if (fn) next = fn;

  // ignore non-GET requests
  if (getOnly && !get && !head) return next();

  // parse url
  var url = parse(options.path)
    , path = decode(url.pathname)
    , type;

  if (path instanceof URIError) return next(utils.error(400));

  // null byte(s)
  if (~path.indexOf('\0')) return next(utils.error(400));

  // when root is not given, consider .. malicious
  if (!root && ~path.indexOf('..')) return next(utils.error(403));

  // index.html support
  if ('/' == path[path.length - 1]) path += 'index.html';

  // join / normalize from optional root dir
  path = normalize(join(root, path));

  // malicious path
  if (root && 0 != path.indexOf(root)) return next(utils.error(403));

  // "hidden" file
  if (!hidden && '.' == basename(path)[0]) return next();

  fs.stat(path, function(err, stat){
    // mime type
    type = mime.lookup(path);

    // ignore ENOENT, ENAMETOOLONG and ENOTDIR
    if (err) {
      if (fn) return fn(err);
      return ('ENOENT' == err.code || 'ENAMETOOLONG' == err.code || 'ENOTDIR' == err.code)
        ? next()
        : next(err);
    // redirect directory in case index.html is present
    } else if (stat.isDirectory()) {
      if (!redirect) return next();
      url = parse(req.originalUrl);
      res.statusCode = 301;
      res.setHeader('Location', url.pathname + '/');
      res.end('Redirecting to ' + url.pathname + '/');
      return;
    }

    // header fields
    if (!res.getHeader('Last-Modified')) res.setHeader('Last-Modified', stat.mtime.toUTCString());
    if (!res.getHeader('Content-Type')) {
      var charset = mime.charsets.lookup(type);
      res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''));
    }

    var opts = {}
      , len = stat.size;

    res.setHeader('Content-Length', len);

    // transfer
    if (head) return res.end();

    if (options.accept(req, type)) {
      var content = options.filter(req, path, type, fs.readFileSync(path, 'utf8'));
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      res.end(content);
      return;
    }

    // stream
    var stream = fs.createReadStream(path, opts);
    req.emit('static', stream);
    req.on('close', stream.destroy.bind(stream));
    stream.pipe(res);

    // clean up and flag as
    // done for remaining events
    function callback(err) {
      done || fn(err);
      done = true;
      req.socket.removeListener('error', callback);
    }

    // callback
    if (fn) {
      req.on('close', callback);
      req.socket.on('error', callback);
      stream.on('error', callback);
      stream.on('end', callback);
    } else {
      stream.on('error', function(err){
        if (res.headerSent) {
          console.error(err.stack);
          req.destroy();
        } else {
          next(err);
        }
      });
    }
  });
};

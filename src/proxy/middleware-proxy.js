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

/*
 middleware that proxies to http://localhost:3000/ with callbacks for filtering
 the response body

 var proxyMiddleware = require('middleware-proxy');
 var app = connect().use(proxyMiddleware(rootDir, {
   accept: function (req, contentType) { return true },
   filter: function (req, realPath, contentType, content) { return content.replace(/foo/g, 'bar') }
 }));
 */

var http = require('http'),
    httpProxy = require('http-proxy');

var proxy = new httpProxy.RoutingProxy();

module.exports = function (root, options) {
  return function (req, res, next) {
    if (req.url.indexOf("public") !== -1) {
      var modifiedUrl = req.url.replace("/public", "");
      var fullURL = "http://" + req.headers.host + modifiedUrl;

      res.writeHead(302, { Location: fullURL });
      res.end();

      return;
    }

    var buffer = httpProxy.buffer(req);
    var _process = false;
    var _contentType;
    var _code, _headers;
    var _content = '';

    var _writeHead = res.writeHead;
    res.writeHead = function (code, headers) {
      _contentType = (headers['content-type'] || '').split(";")[0];
      _process = options.accept(req, _contentType);
      if (_process) {
        _code = code;
        _headers = headers;
      } else {
        _writeHead.apply(res, arguments);
      }
    };

    var _write = res.write;
    res.write = function (data) {
      if (_process) {
        _content += data.toString();
      } else {
        _write.call(res, data);
      }
    }

    var _end = res.end;
    res.end = function () {
      if (_process) {
        var processedContent = options.filter(req, undefined, _contentType, _content);
        _headers['content-length'] = Buffer.byteLength(processedContent, 'utf8');
        _writeHead.call(res, _code, _headers);
        _write.call(res, processedContent);
      }
      _end.apply(res, arguments);
    }

    proxy.proxyRequest(req, res, {
      port: 3000,
      host: 'localhost',
      buffer: buffer
    });
  }
}

proxy.on('proxyError', function (err, req, res) {
  res.writeHead(500, { 'Content-Type': 'text/plain' });

  if (req.method !== 'HEAD') {
    res.write('An error has occurred (have you started a server on port 3000?): ' + JSON.stringify(err));
  }

  try { res.end() }
  catch (ex) { console.error("res.end error: %s", ex.message) }
});

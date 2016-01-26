/*
 * Copyright (c) 2016 IBM Corp. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 *
 */

var utils = require('com.cloudant.sync.utils');

/**
 * @class HttpInterceptorContext
 * @classdesc The {@link HttpInterceptorContext} prototype is an interface for manipulating an HTTP connection when the request or response has been intercepted.
 * @property {Object} request - The HTTP request context
 * @property {Object} request.headers - The HTTP request headers
 * @property {String} request.url - The HTTP request url
 * @property {Object} response - The HTTP response context
 * @property {Number} response.statusCode - The HTTP response status code
 * @property {Object} response.headers - The HTTP response headers
 * @property {Boolean} replayRequest - A flag that indicates whether or not to replay the request. This should be set in a response interceptor.
 * @property {Function} done - The function to call when done modifying the {@link HttpInterceptorContext}
 */
function HttpInterceptorContext(request, response, retry) {
    utils.defineProperty(this, 'request', {
        value: request,
        writable: true,
        enumerable: true,
        configurable: false
    });

    utils.defineProperty(this, 'response', {
        value: response,
        writable: false,
        enumerable: true,
        configurable: false
    });

    utils.defineProperty(this, 'replayRequest', {
        value: retry,
        writable: true,
        enumerable: true,
        configurable: false
    });
}

module.exports = HttpInterceptorContext;

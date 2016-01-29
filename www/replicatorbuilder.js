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

var Q = require('cloudant-sync.q');
var _ = require('cloudant-sync.underscore');
var utils = require('cloudant-sync.utils');
var Datastore = require('cloudant-sync.DatastoreManager').Datastore;
var Replicator = require('cloudant-sync.Replicator');

/**
 * @class ReplicatorBuilder
 * @classdesc A builder to create Replicators
 */
function ReplicatorBuilder() {}

/**
 * @summary Creates a push replication builder.
 * @returns The replication builder instance.
 */
ReplicatorBuilder.prototype.push = function() {
    utils.defineProperty(this, 'type', {
        value: 'push',
        writable: false,
        enumerable: true,
        configurable: false
    });

    return this;
};

/**
 * @summary Creates a pull replication builder.
 * @returns The replication builder instance.
 */
ReplicatorBuilder.prototype.pull = function() {
    utils.defineProperty(this, 'type', {
        value: 'pull',
        writable: false,
        enumerable: true,
        configurable: false
    });

    return this;
};

/**
 * @summary Sets the source database for replication.
 * @param {(Datastore|String)} source - The source database for replication.
 * @returns The replication builder instance.
 */
ReplicatorBuilder.prototype.from = function(source) {
    utils.defineProperty(this, 'source', {
        value: source,
        writable: false,
        enumerable: true,
        configurable: false
    });

    return this;
};

/**
 * @summary Sets the target database for replication.
 * @param {(Datastore|String)} target - The target database for replication.
 * @returns The replication builder instance.
 */
ReplicatorBuilder.prototype.to = function(target) {
    utils.defineProperty(this, 'target', {
        value: target,
        writable: false,
        enumerable: true,
        configurable: false
    });

    return this;
};

/**
 * @summary Adds interceptors to the list of handlers to execute before each request made by this replication.
 * @param {(...HttpInterceptor|HttpInterceptor[])} interceptors - The interceptors to add. Interceptors are executed in a pipeline and modify the connection context in a serial fashion.
 * @returns The replication builder instance
 */
ReplicatorBuilder.prototype.addRequestInterceptors = function() {
    if (arguments.length < 1)
        throw new Error('You must specify at least one request interceptor');

    // Convert arguments to Array. Never call Array.prototype.slice on arguments as it prevents optimazations
    var args = [];
    for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
    }

    var interceptors = _.isArray(args[0]) ? args[0] : args;
    interceptors.forEach(function(interceptor, index) {
        if (!_.isFunction(interceptor))
            throw new Error('Request interceptor at index ' + index + ' must be a function');
    });

    utils.defineProperty(this, 'requestInterceptors', {
        value: interceptors,
        writable: false,
        enumerable: true,
        configurable: false
    });

    return this;
};

/**
 * @summary Adds interceptors to the list of handlers to execute for each response recieved by this replication.
 * @param {(...HttpInterceptor|HttpInterceptor[])} interceptors - The interceptors to add. Interceptors are executed in a pipeline and modify the connection context in a serial fashion.
 * @returns The replication builder instance
 */
ReplicatorBuilder.prototype.addResponseInterceptors = function() {
    if (arguments.length < 1)
        throw new Error('You must specify at least one response interceptor');

    // Convert arguments to Array. Never call Array.prototype.slice on arguments as it prevents optimazations
    var args = [];
    for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
    }

    var interceptors = _.isArray(args[0]) ? args[0] : args;
    interceptors.forEach(function(interceptor, index) {
        if (!_.isFunction(interceptor))
            throw new Error('Request interceptor at index ' + index + ' must be a function');
    });

    utils.defineProperty(this, 'responseInterceptors', {
        value: interceptors,
        writable: false,
        enumerable: true,
        configurable: false
    });

    return this;
};

/**
 * @summary Builds a replicator based on the configuration set.
 * @param {ReplicatorBuilder~buildCallback} [callback] - The function to call after attempting to build the {@link Replicator}.
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} returning either the built {@link Replicator} or an Error.
 */
ReplicatorBuilder.prototype.build = function(callback) {
    if (_.isEmpty(this.type))
        throw new Error("push or pull replication must be specified");

    if (!_.isString(this.type))
        throw new Error("replication 'type' must be a String");

    if (_.isEmpty(this.source) || _.isEmpty(this.target))
        throw new Error('source and target must be set');

    var deferred = Q.defer();
    switch (this.type) {
        case 'pull':
            if (!_.isString(this.source))
                throw new Error('pull replication source uri must be a String');
            if (!isDatastore(this.target))
                throw new Error('pull replication target must be a valid Datastore');

            new Replicator(this.type, this.target, this.source, this.requestInterceptors, this.responseInterceptors, deferred);
            break;
        case 'push':
            if (!_.isString(this.target))
                throw new Error('push replication target uri must be a String');
            if (!isDatastore(this.source))
                throw new Error('push replication source must be a valid Datastore');

            new Replicator(this.type, this.source, this.target, this.requestInterceptors, this.responseInterceptors, deferred);
            break;
        default:
            throw new Error('unrecognized replication type: ' + this.type);
    }
    deferred.promise.nodeify(callback);
    return deferred.promise;
};

module.exports = ReplicatorBuilder;

////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////// Internal functions ////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @private
 * @param {Datastore} datastore - The Datastore to validate
 * @returns {Boolean} - true if datastore is not null and is an instance of Datastore with all associated properties; false otherwise.
 */
function isDatastore(datastore) {
    return !_.isEmpty(datastore) && datastore instanceof Datastore && !_.isEmpty(datastore.name) && _.isString(datastore.name);
}

////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////// Callback TypeDefs /////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @callback ReplicatorBuilder~buildCallback
 * @param {?Error} error
 * @param {Replicator} replicator - The Replicator object.
 */

/**
 * @typedef {Function} HttpInterceptor
 * @param {HttpInterceptorContext} httpInterceptorContext - The HTTP request and response context
 */

/**
 * @callback Replicator~startCallback
 * @param {?Error} error
 */

/**
 * @callback Replicator~getStateCallback
 * @param {?Error} error
 * @param {String} state - The current replication state.
 */

/**
 * @callback Replicator~stopCallback
 * @param {?Error} error
 */

/**
 * @callback Replicator~onCompleteHandler
 * @param {Number} numDocs - The number of documents replicated.
 */

/**
 * @callback Replicator~onErrorHandler
 * @param {String} message - The replication error message.
 */

/**
 * @callback Replicator~destroyCallback
 * @param {?Error} error
 */

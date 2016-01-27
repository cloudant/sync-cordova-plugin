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

var exec = require('cordova/exec');
var Q = require('com.cloudant.sync.q');
var _ = require('com.cloudant.sync.underscore');
var utils = require('com.cloudant.sync.utils');
var Datastore = require('com.cloudant.sync.DatastoreManager').Datastore;
var HttpInterceptorContext = require('com.cloudant.sync.HttpInterceptorContext');

module.exports = Replicator;

/**
 * @class Replicator
 * @classdesc The {@link Replicator} prototype is a common interface for managing pull/push replication between a {@link Datastore} and a remote Cloudant or CouchDB database.
 * @property {Number} token - A token unique to each {@link Replicator} object. (readonly)
 * @property {String} type - The type of replication to be performed. Either 'push' or 'pull'. (readonly)
 * @property {Datastore} datastore - The {@link Datastore} to replicate to/from. (readonly)
 * @property {String} uri - The remote Cloudant or CouchDB database uri. (readonly)
 * @property {Object} handlers - Replication event handlers
 * @property {Array} handlers.complete - The list of handlers to execute when replication completes.
 * @property {Array} handlers.error - The list of handlers to execute when replication errors.
 * @property {Object} interceptors - Replication HTTP interceptors (readonly)
 * @property {Array} interceptors.request - The list of handlers to execute when an HTTP request is made by this replicator
 * @property {Object} interceptors.response - A map of HTTP status codes and the handlers to execute when recieved by this replicator
 *
 * @description <strong>Should not be called by user; Use {@link ReplicatorFactory#pullReplicator} or {@link ReplicatorFactory#pushReplicator} to get {@link Replicator} objects</strong>
 */
function Replicator(type, datastore, uri, requestInterceptors, responseInterceptors, deferred) {
    if (_.isEmpty(type) || !_.isString(type))
        throw new Error("Replication type 'push' or 'pull' must be specified");

    if (!isDatastore(datastore))
        throw new Error('A valid datastore object must be set');

    if (_.isEmpty(uri) || !_.isString(uri))
        throw new Error('A valid uri must be set');


    var token = utils.generateToken();
    var handlers = {};

    utils.defineProperty(this, 'token', {
        value: token,
        writable: false,
        enumerable: true,
        configurable: false
    });
    utils.defineProperty(this, 'type', {
        value: type,
        writable: false,
        enumerable: true,
        configurable: false
    });
    utils.defineProperty(this, 'datastore', {
        value: datastore,
        writable: false,
        enumerable: true,
        configurable: false
    });
    utils.defineProperty(this, 'uri', {
        value: uri,
        writable: false,
        enumerable: true,
        configurable: false
    });

    utils.defineProperty(handlers, 'complete', {
        value: [],
        writable: true,
        enumerable: true,
        configurable: false
    });
    utils.defineProperty(handlers, 'error', {
        value: [],
        writable: true,
        enumerable: true,
        configurable: false
    });
    utils.defineProperty(this, 'handlers', {
        value: handlers,
        writable: true,
        enumerable: true,
        configurable: false
    });

    var interceptors = {};
    utils.defineProperty(interceptors, 'request', {
        value: requestInterceptors || [],
        writable: false,
        enumerable: true,
        configurable: false
    });
    utils.defineProperty(interceptors, 'response', {
        value: responseInterceptors || [],
        writable: false,
        enumerable: true,
        configurable: false
    });
    utils.defineProperty(interceptors, 'timeout', {
        value: 290000,
        writable: true,
        enumerable: true,
        configurable: false
    });

    utils.defineProperty(this, 'interceptors', {
        value: interceptors,
        writable: false,
        enumerable: true,
        configurable: false
    });

    var that = this;

    function successHandler(result) {
        if (result && _.isArray(result)) {
            var event = result.shift();
            if (event && _.isString(event)) {
                emit(that, event, result);
            }
        } else {
            deferred.resolve(that);
        }
    }

    function errorHandler(error) {
        deferred.reject(error);
    }

    exec(successHandler, errorHandler, "CloudantSync", "createReplicator", [this]);
}

/**
 * @summary Starts a replication.
 * @description The replication will continue until replication is caught up with the source database;
 * that is, until there are no current changes to replicate.
 *
 * @param {Replicator~startCallback} [callback] - The function to call after replication has started.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} which returns successfully or with Error.
 */
Replicator.prototype.start = function(callback) {
    var deferred = Q.defer();

    function successHandler() {
        deferred.resolve();
    }

    function errorHandler(error) {
        deferred.reject(error);
    }

    exec(successHandler, errorHandler, "CloudantSync", "startReplication", [this]);

    deferred.promise.nodeify(callback);
    return deferred.promise;
};

/**
 * @summary Returns the current Replicator state.
 * @description Possible states: ['Pending', 'Started', 'Stopping', 'Error', 'Stopped', 'Complete']
 *
 * @param {Replicator~getStateCallback} [callback] - The function to call after attempting to get replication state.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} returning either the current replication state or an Error.
 */
Replicator.prototype.getState = function(callback) {
    var deferred = Q.defer();

    function successHandler(response) {
        deferred.resolve(response);
    }

    function errorHandler(error) {
        deferred.reject(error);
    }

    exec(successHandler, errorHandler, "CloudantSync", "getReplicationStatus", [this]);

    deferred.promise.nodeify(callback);
    return deferred.promise;
};

/**
 * @summary Stops replication
 *
 * @param {Replicator~getStateCallback} [callback] - The function to call after attempting to stop replication.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} which returns successfully or with Error.
 */
Replicator.prototype.stop = function(callback) {
    var deferred = Q.defer();

    function successHandler() {
        deferred.resolve();
    }

    function errorHandler(error) {
        deferred.reject(error);
    }

    exec(successHandler, errorHandler, "CloudantSync", "stopReplication", [this]);

    deferred.promise.nodeify(callback);
    return deferred.promise;
};

/**
 * @summary Registers an event handler.
 * @description All 'complete' event handlers are executed when replication state reaches 'Completed' or 'Stopped'; continuous replications will never complete.
 * All 'error' event handlers are executed when replication state reaches 'Error'; Possible causes could be incorrect credentials or no network connection.
 *
 * @param {String} event - The event type. Either 'complete' or 'error'.
 * @param {Replicator~onCompleteHandler|Replicator~onErrorHandler} handler - The handler to register.
 */
Replicator.prototype.on = function(event, handler) {
    if (this.handlers.hasOwnProperty(event)) {
        if (!handler)
            throw new Error('handler must exist');

        if (!_.isFunction(handler))
            throw new Error('handler must be a Function');

        this.handlers[event].push(handler);
    }
};

/**
 * @summary Destroys the {@link Replicator} instance
 *
 * @param {Replicator~destroyCallback} [callback] - The function to call after attempting to destroy this {@link Replicator}.
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} which returns successfully or with Error.
 */
Replicator.prototype.destroy = function(callback) {
    var deferred = Q.defer();

    var that = this;

    function successHandler() {
        utils.defineProperty(that, 'destroyed', {
            value: true,
            writable: false,
            enumerable: true,
            configurable: false
        });
        deferred.resolve();
    }

    function errorHandler(error) {
        deferred.reject(error);
    }

    deferred.promise.nodeify(callback);
    exec(successHandler, errorHandler, "CloudantSync", "destroyReplicator", [this]);

    return deferred.promise;
};

/**
 * @private
 * @param {Datastore} datastore - The Datastore to validate
 * @returns {Boolean} - true if datastore is not null and is an instance of Datastore with all associated properties; false otherwise.
 */
isDatastore = function (datastore) {
    return !_.isEmpty(datastore) && datastore instanceof Datastore && !_.isEmpty(datastore.name) && _.isString(datastore.name);
}

/**
 * Executes all registered handlers or interceptors for the specified replication event.
 * @private
 * @param {Replicator} replicator - The associated replicator for the event.
 * @param {String} event - The event to emit.
 * @param {String} [args] - The arguments to pass to the registered event handlers.
 */
function emit(replicator, event, args) {
    if (replicator.handlers.hasOwnProperty(event)) {
        for (var i = 0; i < replicator.handlers[event].length; i++) {
            replicator.handlers[event][i].apply(undefined, args);
        }
    } else if (replicator.interceptors.hasOwnProperty(event)) {
        var promises = [];

        // Wrap each interceptor in a promise producing function
        for (var j = 0; j < replicator.interceptors[event].length; j++) {
            promises.push(promiseWrap(replicator.interceptors[event][j]));
        }

        var request = args[0];
        var response = args[1];
        var retry = args[2];
        var uuid = args[3];
        var httpInterceptorContext = new HttpInterceptorContext(request, response, retry);
        var timeout = replicator.interceptors.timeout || 290000;
        var timeoutMessage = event + " interceptors for replicator with token " + replicator.token + " timed out after " + timeout + "ms. Ensure HttpInterceptorContext#done() is called to end each interceptor function.";

        var success = function() {};

        var failure = function() {
            console.log("ERROR: Failed to unlock native " + event + " interceptor for replicator with token " + replicator.token);
        };

        // If no interceptors to execute add
        if (_.isEmpty(promises)) {
            exec(success, failure, "CloudantSync", "unlockInterceptor", [replicator.token, event, null, null, uuid]);
        } else {
            promises.reduce(Q.when, Q(httpInterceptorContext))
                .timeout(timeout, timeoutMessage)
                .then(function(context) {
                    exec(success, failure, "CloudantSync", "unlockInterceptor", [replicator.token, event, context, null, uuid]);
                })
                .catch(function (error) {
                    console.error(error.message);
                    if (error.message === timeoutMessage) {
                        exec(success, failure, "CloudantSync", "unlockInterceptor", [replicator.token, event, null, timeout, uuid]);
                    } else {
                        exec(success, failure, "CloudantSync", "unlockInterceptor", [replicator.token, event, null, null, uuid]);
                    }
                }).done();
        }
    }
}

/**
 * Wraps an interceptor in a promise producing Function
 * @private
 * @param {Function} interceptor - The HTTP interceptor to wrap
 * @returns A promise wrapped HTTP interceptor
 */
function promiseWrap(interceptor) {
    return function(httpInterceptorContext) {
        var deferred = Q.defer();

        utils.defineProperty(httpInterceptorContext, 'done', {
            value: function() {
                deferred.resolve(httpInterceptorContext);
            },
            writable: false,
            enumerable: false,
            configurable: true
        });

        interceptor(httpInterceptorContext);
        return deferred.promise;
    };
}

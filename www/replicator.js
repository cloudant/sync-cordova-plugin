/*
 * Copyright (c) 2016 IBM Corp. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy
 * of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND,either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 */

var exec = require('cordova/exec');
var Q = require('cloudant-sync.q');
var _ = require('cloudant-sync.lodash_funcs');
var utils = require('cloudant-sync.utils');
var Datastore = require('cloudant-sync.DatastoreManager').Datastore;
var HttpInterceptorContext = require('cloudant-sync.HttpInterceptorContext');

module.exports = Replicator;

/**
 * @class Replicator
 * @classdesc The {@link Replicator} prototype is a common interface for
 * managing pull/push replication between a {@link Datastore} and a remote
 * Cloudant or CouchDB database.
 */
function Replicator() {};

/**
 * @summary Internal function to create replicator.
 * @property {Number} token - A token unique to each
 * {@link Replicator} object. (readonly)
 */
function Replicator(options, deferred) {

  var token = utils.generateToken();
  var handlers = {};

  utils.defineProperty(this, 'token', {
    value: token,
    writable: false,
    enumerable: true,
    configurable: false,
  });
  utils.defineProperty(this, 'type', {
    value: options.type,
    writable: false,
    enumerable: true,
    configurable: false,
  });
  utils.defineProperty(this, 'datastore', {
    value: options.datastore,
    writable: false,
    enumerable: true,
    configurable: false,
  });
  utils.defineProperty(this, 'uri', {
    value: options.uri,
    writable: false,
    enumerable: true,
    configurable: false,
  });

  utils.defineProperty(handlers, 'complete', {
    value: [],
    writable: true,
    enumerable: true,
    configurable: false,
  });
  utils.defineProperty(handlers, 'error', {
    value: [],
    writable: true,
    enumerable: true,
    configurable: false,
  });
  utils.defineProperty(this, 'handlers', {
    value: handlers,
    writable: true,
    enumerable: true,
    configurable: false,
  });

  // Add request interceptors if they exist or add an empty array
  var requestInterceptors = new Interceptors([options.requestInterceptors]);
  utils.defineProperty(this, 'request', {
    value: requestInterceptors,
    writable: false,
    enumerable: true,
    configurable: false,
  });

  // Add response interceptors if they exist or add an empty array
  var responseInterceptors = new Interceptors([options.responseInterceptors]);
  utils.defineProperty(this, 'response', {
    value: responseInterceptors,
    writable: false,
    enumerable: true,
    configurable: false,
  });

  utils.defineProperty(this, 'interceptorTimeout', {
    value: 290000,
    writable: true,
    enumerable: true,
    configurable: false,
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

  exec(successHandler,
      errorHandler,
      'CloudantSync',
      'createReplicator',
      [this]);
};

/**
 * @summary Common function for adding interceptors to the list of
 * handlers.
 * @param {(...HttpInterceptor|HttpInterceptor[])} optionInterceptors
 * The interceptors to add. Interceptors are executed in a pipeline and
 * modify the connection context in a serial fashion.
 * @returns Array of interceptors or an empty array
 */
function Interceptors(optionInterceptors) {
  var interceptors = [];
  if (optionInterceptors.length > 0
    && typeof optionInterceptors[0] != 'undefined') {
    // Convert interceptors to Array.
    // Never call Array.prototype.slice on arguments
    // as it prevents optimizations
    var args = [];
    for (var i = 0; i < optionInterceptors.length; i++) {
      args.push(optionInterceptors[i]);
    }

    interceptors = _.isArray(args[0]) ? args[0] : args;
    interceptors.forEach(function(interceptor, index) {
      if (!_.isFunction(interceptor)) {
        throw new Error('Request or response interceptor at index '
          + index + ' must be a function');
      }
    });
  }
  return interceptors;
};

/**
 * @summary Create a pull or push replicator based on the source and
 * target parameters.
 * @example
 * // Options object containing the source and target for push replication
 * var pushReplicatorOptions = {
 *   source: datastore,
 *   target: uri
 * }
 *
 * // Create a replicator that replicates changes from the local
 * // Datastore to the remote database.
 * var replicator = Replicator.create(pushReplicatorOptions);
 *
 * // Start replicator using {@link Replicator#start}
 * replicator.start(function(error) {
 *   ...
 *   done();
 * }
 *
 * // Destroy replicator when finished with the object
 * replicator.destroy();
 *
 * @param options JSON object containing options for building replicator.
 * See options below:
 * @property {Datastore} options.datastore - The {@link Datastore} to
 * replicate to/from. (readonly)
 * @property {String} options.uri - The remote Cloudant or CouchDB database uri.
 * (readonly)
 * @property {Object} handlers - Replication event handlers
 * @property {Array} handlers.complete - The list of handlers to execute when
 * replication completes.
 * @property {Array} handlers.error - The list of handlers to execute when
 * replication errors.
 * @property {Array} options.requestInterceptors - The list of handlers
 * to execute when an HTTP request is made by this replicator
 * @property {Object} options.responseInterceptors - A map of HTTP status
 * codes and the handlers to execute when received by this replicator
 *
 * @param {Replicator~createCallback} [callback] - The function to call
 * after attempting to create the {@link Replicator}.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} returning
 * either the created {@link Replicator} or an Error.
*/
Replicator.create = function(options, callback) {

  var datastore, uri;
  var deferred = Q.defer();

  if (!options.hasOwnProperty('source') || _.isEmpty(options.source)) {
    throw new Error('Replication source must be set');

  } else if (isDatastore(options.source)) {
    // Check that the source is a datastore and target is a valid URI string

    if (!_.isString(options.target)) {
      throw new Error('push replication target uri must be a String');
    }
    options.type = 'push';
    options.datastore = options.source;
    options.uri = options.target;

  } else if (_.isString(options.source)) {
    // Check that the source is a valid URI string and target is a datastore

    if (!isDatastore(options.target)) {
      throw new Error('pull replication target must be a valid Datastore');
    }
    options.type = 'pull';
    options.datastore = options.target;
    options.uri = options.source;

  } else {
    throw new Error('Replication source must be either a Datastore object or '
      + 'or a URI. ' + 'Found: ' + options.source.toString());
  }

  new Replicator(options, deferred);

  deferred.promise.nodeify(callback);
  return deferred.promise;
};

/**
 * @summary Starts a replication.
 * @description The replication will continue until replication is caught up
 * with the source database;
 * that is, until there are no current changes to replicate.
 *
 * @param {Replicator~startCallback} [callback] - The function to call after
 * replication has started.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} which
 * returns successfully or with Error.
 */
Replicator.prototype.start = function(callback) {
  var deferred = Q.defer();


  function successHandler() {
    deferred.resolve();
  }

  function errorHandler(error) {
    deferred.reject(error);
  }

  exec(successHandler,
      errorHandler,
      'CloudantSync',
      'startReplication',
      [this]);

  deferred.promise.nodeify(callback);
  return deferred.promise;
};

/**
 * @summary Returns the current Replicator state.
 * @description Possible states: ['Pending', 'Started', 'Stopping', 'Error',
 * 'Stopped', 'Complete']
 *
 * @param {Replicator~getStateCallback} [callback] - The function to call
 * after attempting to get replication state.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q}
 * returning either the current replication state or an Error.
 */
Replicator.prototype.getState = function(callback) {
  var deferred = Q.defer();

  function successHandler(response) {
    deferred.resolve(response);
  }

  function errorHandler(error) {
    deferred.reject(error);
  }

  exec(successHandler,
      errorHandler,
      'CloudantSync',
      'getReplicationStatus',
      [this]);

  deferred.promise.nodeify(callback);
  return deferred.promise;
};

/**
 * @summary Stops replication
 *
 * @param {Replicator~getStateCallback} [callback] - The function to call
 * after attempting to stop replication.
 *
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} which
 * returns successfully or with Error.
 */
Replicator.prototype.stop = function(callback) {
  var deferred = Q.defer();

  function successHandler() {
    deferred.resolve();
  }

  function errorHandler(error) {
    deferred.reject(error);
  }

  exec(successHandler,
    errorHandler,
    'CloudantSync',
    'stopReplication',
    [this]
    );

  deferred.promise.nodeify(callback);
  return deferred.promise;
};

/**
 * @summary Registers an event handler.
 * @description All 'complete' event handlers are executed when replication
 * state reaches 'Completed' or 'Stopped'; continuous replications will never
 * complete.
 * All 'error' event handlers are executed when replication state reaches
 * 'Error'; Possible causes could be incorrect credentials or no network
 * connection.
 *
 * @param {String} event - The event type. Either 'complete' or 'error'.
 * @param {Replicator~onCompleteHandler|Replicator~onErrorHandler}
 * handler - The handler to register.
 */
Replicator.prototype.on = function(event, handler) {
  if (this.handlers.hasOwnProperty(event)) {
    if (!handler) {
      throw new Error('handler must exist');
    }

    if (!_.isFunction(handler)) {
      throw new Error('handler must be a Function');
    }

    this.handlers[event].push(handler);
  }
};

/**
 * @summary Destroys the {@link Replicator} instance
 *
 * @param {Replicator~destroyCallback} [callback] - The function to call after
 * attempting to destroy this {@link Replicator}.
 * @returns A [q style promise]{@link https://github.com/kriskowal/q} which
 * returns successfully or with Error.
 */
Replicator.prototype.destroy = function(callback) {
  var deferred = Q.defer();

  var that = this;

  function successHandler() {
    utils.defineProperty(that, 'destroyed', {
      value: true,
      writable: false,
      enumerable: true,
      configurable: false,
    });
    deferred.resolve();
  }

  function errorHandler(error) {
    deferred.reject(error);
  }

  deferred.promise.nodeify(callback);
  exec(successHandler,
      errorHandler,
      'CloudantSync',
      'destroyReplicator',
      [this]);

  return deferred.promise;
};

/**
 * @private
 * @param {Datastore} datastore - The Datastore to validate
 * @returns {Boolean} - true if datastore is not null and is an instance of
 * Datastore with all associated properties; false otherwise.
 */
isDatastore = function(datastore) {
  return !_.isEmpty(datastore) &&
  datastore instanceof Datastore &&
  !_.isEmpty(datastore.name) &&
  _.isString(datastore.name);
};

/**
 * Executes all registered handlers or interceptors for the specified
 * replication event.
 * @private
 * @param {Replicator} replicator - The associated replicator for the event.
 * @param {String} event - The event to emit.
 * @param {String} [args] - The arguments to pass to the registered event
 * handlers.
 */
function emit(replicator, event, args) {
  if (replicator.handlers.hasOwnProperty(event)) {
    for (var i = 0; i < replicator.handlers[event].length; i++) {
      replicator.handlers[event][i].apply(undefined, args);
    }
  } else if (replicator.hasOwnProperty(event)) {
    var promises = [];
    // Wrap request interceptor in a promise producing function
    for (var j = 0; j < replicator[event].length; j++) {
      promises.push(promiseWrap(replicator[event][j]));
    }

    var request = args[0];
    var response = args[1];
    var retry = args[2];
    var uuid = args[3];
    var httpInterceptorContext = new HttpInterceptorContext(request,
        response,
        retry);
    var timeout = replicator.interceptorTimeout || 290000;
    var timeoutMessage = event + ' interceptors for replicator with token ' +
    replicator.token + ' timed out after ' + timeout +
    'ms. Ensure HttpInterceptorContext#done() is called to end each' +
    ' interceptor function.';

    var success = function() {};

    var failure = function() {
      console.log('ERROR: Failed to unlock native ' + event +
      ' interceptor for replicator with token ' + replicator.token);
    };

    // If no interceptors to execute add
    if (_.isEmpty(promises)) {
      exec(success,
          failure,
          'CloudantSync',
          'unlockInterceptor',
          [replicator.token, event, null, null, uuid]);
    } else {
      promises.reduce(Q.when, Q(httpInterceptorContext))
          .timeout(timeout, timeoutMessage)
                .then(function(context) {
                  exec(success,
                      failure,
                      'CloudantSync',
                      'unlockInterceptor',
                      [replicator.token, event, context, null, uuid]);
                })
                .catch(function(error) {
                  console.error(error.message);
                  if (error.message === timeoutMessage) {
                    exec(success,
                        failure,
                        'CloudantSync',
                    'unlockInterceptor',
                    [replicator.token, event, null, timeout, uuid]);
                  } else {
                    exec(success,
                        failure,
                        'CloudantSync',
                        'unlockInterceptor',
                    [replicator.token, event, null, null, uuid]);
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
      configurable: true,
    });

    interceptor(httpInterceptorContext);
    return deferred.promise;
  };
}

// Callback TypeDefs


/**
 * @callback Replicator~createCallback
 * @param {?Error} error
 * @param {Replicator} replicator - The Replicator object.
 */

/**
 * @typedef {Function} HttpInterceptor
 * @param {HttpInterceptorContext} httpInterceptorContext - The HTTP request and
 * response context
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

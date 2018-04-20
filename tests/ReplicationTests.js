/**
 * Copyright (c) 2015 IBM Corp. All rights reserved.
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

var DBName = 'replicationdb';

try {
  var DatastoreManager = require('cloudant-sync.DatastoreManager').DatastoreManager;
  var Replicator = require('cloudant-sync.Replicator');
} catch (e) {
  console.log('error: ' + e);
}
var TestUtil = require('cloudant-sync-tests.TestUtil');
var Q = require('cloudant-sync.q');

exports.defineAutoTests = function() {

  describe('Replication', function() {

    var manager;

    var badtoken = 'badtoken';
    var badtype = 'badtype';
    var baddatastore = 'baddatastore';
    var baduri = 'baduri';

    var uri = TestUtil.LOCAL_COUCH_URL + '/animaldb';
    var localStore = null;
    var storeName = null;

    var defaultTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;

    // This timeout value is necessary in some tests to allow them to complete
    // successfully on iOS. There seems to be an issue in CDTDatastore that
    // causes connections to hang occasionally until they are timed out and
    // retried. If this issue is fixed in CDTDatastore it may be possible
    // to remove the use of this timeout and go back to the default by
    // not explicitly specifying a value.
    var LONG_TIMEOUT = 300000;

    beforeAll(function createManager(done) {
      DatastoreManager().then(function(m) {
          manager = m;
        })
        .fin(done);
    });

    afterEach(function deleteDatastores(done) {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = defaultTimeout;
      manager.deleteDatastore(DBName)
        .then(function() {
          return manager.deleteDatastore(DBName);
        }).fin(done);
    });


    function getDatastore() {
      return localStore;
    }

    beforeEach(function(done) {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = defaultTimeout;
      manager.openDatastore(DBName)
        .then(function(newLocalStore) {
          localStore = newLocalStore;
        })
        .catch(function(error) {
          console.error(error);
        })
        .fin(done);
    });

    function testReplication(storeDescription) {

      describe('Replicator creation (' + storeDescription + ')', function() {

        describe('Callbacks', function() {
          it('should create a pull replicator', function(done) {
            try {
              var datastore = getDatastore();
              expect(datastore).not.toBe(null);

              var options = {
                source: uri,
                target: datastore
              };

              expect(Replicator.create).not.toBe(null);

              Replicator.create(options, function(error, replicator) {
                expect(error).toBe(null);
                expect(replicator.token).not.toBe(null);
                replicator.token = badtoken; // Assert readonly
                expect(replicator.token).not.toBe(badtoken);

                expect(replicator.type).toBe('pull');
                replicator.type = badtype; // Assert readonly
                expect(replicator.type).not.toBe(badtype);

                expect(replicator.datastore).toBe(datastore);
                replicator.datastore = baddatastore; // Assert readonly
                expect(replicator.datastore).not.toBe(baddatastore);

                expect(replicator.uri).toBe(uri);
                replicator.uri = baduri; // Assert readonly
                expect(replicator.uri).not.toBe(baduri);
                done();
              });
            } catch (e) {
              fail('Exception occurred: ' + e);
              done();
            }
          });

          it('should create a pull replicator with a request and response interceptor', function(done) {
            try {
              var datastore = getDatastore();
              expect(datastore).not.toBe(null);

              var interceptor = function(context) {
                context.done();
              };

              var options = {
                source: uri,
                target: datastore,
                requestInterceptors: [interceptor],
                responseInterceptors: [interceptor]
              };

              expect(Replicator.create).not.toBe(null);

              Replicator.create(options, function(error, replicator) {
                expect(error).toBe(null);
                expect(replicator.token).not.toBe(null);
                replicator.token = badtoken; // Assert readonly
                expect(replicator.token).not.toBe(badtoken);

                expect(replicator.type).toBe('pull');
                replicator.type = badtype; // Assert readonly
                expect(replicator.type).not.toBe(badtype);

                expect(replicator.datastore).toBe(datastore);
                replicator.datastore = baddatastore; // Assert readonly
                expect(replicator.datastore).not.toBe(baddatastore);

                expect(replicator.uri).toBe(uri);
                replicator.uri = baduri; // Assert readonly
                expect(replicator.uri).not.toBe(baduri);
                done();
              });
            } catch (e) {
              fail('Test failed with exception: ' + e);
              done();
            }
          });

          it('should create a pull replicator with an array of request and response interceptors', function(done) {
            try {
              var datastore = getDatastore();
              expect(datastore).not.toBe(null);

              var interceptor1 = function(context) {
                context.done();
              };

              var interceptor2 = function(context) {
                context.done();
              };

              var options = {
                source: uri,
                target: datastore,
                requestInterceptors: [interceptor1, interceptor2],
                responseInterceptors: [interceptor1, interceptor2]
              };

              expect(Replicator.create).not.toBe(null);

              Replicator.create(options, function(error, replicator) {
                expect(error).toBe(null);
                expect(replicator.token).not.toBe(null);
                replicator.token = badtoken; // Assert readonly
                expect(replicator.token).not.toBe(badtoken);

                expect(replicator.type).toBe('pull');
                replicator.type = badtype; // Assert readonly
                expect(replicator.type).not.toBe(badtype);

                expect(replicator.datastore).toBe(datastore);
                replicator.datastore = baddatastore; // Assert readonly
                expect(replicator.datastore).not.toBe(baddatastore);

                expect(replicator.uri).toBe(uri);
                replicator.uri = baduri; // Assert readonly
                expect(replicator.uri).not.toBe(baduri);
                done();
              });
            } catch (e) {
              fail('Test failed with exception: ' + e);
              done();
            }
          });

          it('should create a pull replicator with an empty request and response interceptor array', function(done) {
            try {
              var datastore = getDatastore(storeDescription);
              expect(datastore).not.toBe(null);

              var options = {
                source: uri,
                target: datastore,
                requestInterceptors: [],
                responseInterceptors: []
              };

              expect(Replicator.create).not.toBe(null);

              Replicator.create(options, function(error, replicator) {
                expect(error).toBe(null);
                expect(replicator.token).not.toBe(null);
                replicator.token = badtoken; // Assert readonly
                expect(replicator.token).not.toBe(badtoken);

                expect(replicator.type).toBe('pull');
                replicator.type = badtype; // Assert readonly
                expect(replicator.type).not.toBe(badtype);

                expect(replicator.datastore).toBe(datastore);
                replicator.datastore = baddatastore; // Assert readonly
                expect(replicator.datastore).not.toBe(baddatastore);

                expect(replicator.uri).toBe(uri);
                replicator.uri = baduri; // Assert readonly
                expect(replicator.uri).not.toBe(baduri);
                done();
              });
            } catch (e) {
              fail('Test failed with exception: ' + e);
              done();
            }
          });

          it('should create a push replicator', function(done) {
            try {
              var datastore = getDatastore();
              expect(datastore).not.toBe(null);

              var options = {
                source: datastore,
                target: uri
              };

              expect(Replicator.create).not.toBe(null);

              Replicator.create(options, function(error, replicator) {
                expect(error).toBe(null);
                expect(replicator.token).not.toBe(null);
                replicator.token = badtoken; // Assert readonly
                expect(replicator.token).not.toBe(badtoken);

                expect(replicator.type).toBe('push');
                replicator.type = badtype; // Assert readonly
                expect(replicator.type).not.toBe(badtype);

                expect(replicator.datastore).toBe(datastore);
                replicator.datastore = baddatastore; // Assert readonly
                expect(replicator.datastore).not.toBe(baddatastore);

                expect(replicator.uri).toBe(uri);
                replicator.uri = baduri; // Assert readonly
                expect(replicator.uri).not.toBe(baduri);
                done();
              });
            } catch (e) {
              fail('Test failed with exception: ' + e);
              done();
            }
          });

          it('should create a push replicator with a request and response interceptor', function(done) {
            try {
              var datastore = getDatastore();
              expect(datastore).not.toBe(null);

              var interceptor = function(context) {
                context.done();
              };

              var options = {
                source: datastore,
                target: uri,
                requestInterceptors: [interceptor],
                responseInterceptors: [interceptor]
              };

              expect(Replicator.create).not.toBe(null);

              Replicator.create(options, function(error, replicator) {
                expect(error).toBe(null);
                expect(replicator.token).not.toBe(null);
                replicator.token = badtoken; // Assert readonly
                expect(replicator.token).not.toBe(badtoken);

                expect(replicator.type).toBe('push');
                replicator.type = badtype; // Assert readonly
                expect(replicator.type).not.toBe(badtype);

                expect(replicator.datastore).toBe(datastore);
                replicator.datastore = baddatastore; // Assert readonly
                expect(replicator.datastore).not.toBe(baddatastore);

                expect(replicator.uri).toBe(uri);
                replicator.uri = baduri; // Assert readonly
                expect(replicator.uri).not.toBe(baduri);
                done();
              });
            } catch (e) {
              fail('Test failed with exception: ' + e);
              done();
            }
          });

          it('should create a push replicator with an array of request and response interceptors', function(done) {
            try {
              var datastore = getDatastore();
              expect(datastore).not.toBe(null);

              var interceptor1 = function(context) {
                context.done();
              };

              var interceptor2 = function(context) {
                context.done();
              };

              var options = {
                source: datastore,
                target: uri,
                requestInterceptors: [interceptor1, interceptor2],
                responseInterceptors: [interceptor1, interceptor2]
              };

              expect(Replicator.create).not.toBe(null);

              Replicator.create(options, function(error, replicator) {
                expect(error).toBe(null);
                expect(replicator.token).not.toBe(null);
                replicator.token = badtoken; // Assert readonly
                expect(replicator.token).not.toBe(badtoken);

                expect(replicator.type).toBe('push');
                replicator.type = badtype; // Assert readonly
                expect(replicator.type).not.toBe(badtype);

                expect(replicator.datastore).toBe(datastore);
                replicator.datastore = baddatastore; // Assert readonly
                expect(replicator.datastore).not.toBe(baddatastore);

                expect(replicator.uri).toBe(uri);
                replicator.uri = baduri; // Assert readonly
                expect(replicator.uri).not.toBe(baduri);
                done();
              });
            } catch (e) {
              fail('Test failed with exception: ' + e);
              done();
            }
          });

          it('should create a push replicator with an empty request and response interceptor array', function(done) {
            try {
              var datastore = getDatastore(storeDescription);
              expect(datastore).not.toBe(null);

              var options = {
                source: datastore,
                target: uri,
                requestInterceptors: [],
                responseInterceptors: []
              };

              expect(Replicator.create).not.toBe(null);

              Replicator.create(options, function(error, replicator) {
                expect(error).toBe(null);
                expect(replicator.token).not.toBe(null);
                replicator.token = badtoken; // Assert readonly
                expect(replicator.token).not.toBe(badtoken);

                expect(replicator.type).toBe('push');
                replicator.type = badtype; // Assert readonly
                expect(replicator.type).not.toBe(badtype);

                expect(replicator.datastore).toBe(datastore);
                replicator.datastore = baddatastore; // Assert readonly
                expect(replicator.datastore).not.toBe(baddatastore);

                expect(replicator.uri).toBe(uri);
                replicator.uri = baduri; // Assert readonly
                expect(replicator.uri).not.toBe(baduri);
                done();
              });
            } catch (e) {
              fail('Test failed with exception: ' + e);
              done();
            }
          });

          it('should create two replicators with different tokens', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var firstReplicator;
            var calls = 0;

            function callback(error, replicator) {
              expect(error).toBe(null);
              calls++;
              if (calls === 2) {
                expect(firstReplicator.token).not.toEqual(replicator.token);
                done();
              } else {
                firstReplicator = replicator;
              }
            }

            var pushOptions = {
              source: datastore,
              target: uri
            };

            var pullOptions = {
              source: uri,
              target: datastore
            };

            Replicator.create(pullOptions, callback);
            Replicator.create(pushOptions, callback);
          });

          // Negative tests
          it('throws error if push source is null', function(done) {
            var datastore = getDatastore();
            expect(datastore).not.toBe(null);

            var options = {
              source: null,
              target: uri
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error, replicator) {
              });
              fail('Push replicator creation did not error with null source');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if push target is null', function(done) {
            var datastore = getDatastore();
            expect(datastore).not.toBe(null);

            var options = {
              source: datastore,
              target: null
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error, replicator) {
              });
              fail('Push replicator creation did not error with null target');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if pull source is null', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: null,
              target: datastore
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(
                error, replicator) {
              });
              fail('Pull replicator creation did not error with null source');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if pull target is null', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
               source: uri,
              target: null
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error,
                replicator) {
              });
              fail('Pull replicator creation did not error with null target');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if pull source is not a String', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: [],
              target: datastore
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error,
                replicator) {
              });
              fail('Pull replicator source is not a String');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if pull target is not a Datastore', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: uri,
              target: []
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error,
                replicator) {
              });
              fail('Pull replicator target is not a Datastore');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if push source is not a Datastore', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: [],
              target: uri
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error,
                replicator) {
              });
              fail('Push replicator source is not a Datastore');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if push target is not a String', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: datastore,
              target: []
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error,
                replicator) {
              });
              fail('Push replicator target is not a String');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if push target is not set', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: datastore
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error,
                replicator) {
              });
              fail('Push replicator target is not set');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if pull target is not set', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: uri
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error, replicator) {
              });
              fail('Pull replicator target is not set');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if push source is not set', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              target: uri
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error, replicator) {
              });
              fail('Push replicator source is not set');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if pull source is not set', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              target: datastore
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error,
                replicator) {
              });
              fail('Pull replicator source is not set');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if request interceptor is null', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: datastore,
              target: uri,
              requestInterceptors: null
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error,
                replicator) {
              });
              fail('Request interceptor is null');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if response interceptor is null', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: datastore,
              target: uri,
              responseInterceptors: null
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error,
                replicator) {
              });
              fail('Response interceptor is null');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if request interceptor is not a function or an array', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: datastore,
              target: uri,
              requestInterceptors: 'foo'
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error,
                replicator) {
              });
              fail('Request interceptor is not a function or an array');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if response interceptor is not a function or an array', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: datastore,
              target: uri,
              responseInterceptors: 'foo'
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error,
                replicator) {
              });
              fail('Response interceptor is not a function or an array');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if request interceptor in an array is not a function', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: datastore,
              target: uri,
              requestInterceptors: ['foo']
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error,
                replicator) {
              });
              fail('Request interceptor in an array is not a function');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if response interceptor in an array is not a function', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: datastore,
              target: uri,
              responseInterceptors: ['foo']
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error,
                replicator) {
              });
              fail('Response interceptor in an array is not a function');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if request interceptor following a valid interceptor is not a function', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var requestFunction = function(context) {
              context.done();
            };

            var options = {
              source: datastore,
              target: uri,
              requestInterceptors: [requestFunction, 'notaninterceptor']
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error,
                replicator) {
              });
              fail('Request interceptor following a valid interceptor is not a function');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if response interceptor following a valid interceptor is not a function', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var responseFunction = function(context) {
              context.done();
            };

            var options = {
              source: datastore,
              target: uri,
              responseInterceptors: [responseFunction, 'notaninterceptor']
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options, function(error,
                replicator) {
              });
              fail('Request interceptor following a valid interceptor is not a function');
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });
        });

        describe('Promises', function() {
          it('should create a pull replicator', function(done) {
            try {
              var datastore = getDatastore();
              expect(datastore).not.toBe(null);

              var options = {
                source: uri,
                target: datastore
              };

              expect(Replicator.create).not.toBe(null);

              Replicator.create(options).then(function(replicator) {
                  expect(replicator.token).not.toBe(null);
                  replicator.token = badtoken; // Assert readonly
                  expect(replicator.token).not.toBe(badtoken);

                  expect(replicator.type).toBe('pull');
                  replicator.type = badtype; // Assert readonly
                  expect(replicator.type).not.toBe(badtype);

                  expect(replicator.datastore).toBe(datastore);
                  replicator.datastore = baddatastore; // Assert readonly
                  expect(replicator.datastore).not.toBe(baddatastore);

                  expect(replicator.uri).toBe(uri);
                  replicator.uri = baduri; // Assert readonly
                  expect(replicator.uri).not.toBe(baduri);
                })
                .catch(function(error) {
                  expect(error).toBe(null);
                })
                .fin(done);
            } catch (e) {
              fail('Test failed with exception: ' + e);
              done();
            }
          });

          it('should create a pull replicator with an empty request and response interceptor array', function(done) {
            try {
              var datastore = getDatastore();
              expect(datastore).not.toBe(null);

              var options = {
                source: uri,
                target: datastore,
                requestInterceptors: [],
                responseInterceptors: []
              };

              expect(Replicator.create).not.toBe(null);

              Replicator.create(options).then(function(replicator) {
                  expect(replicator.token).not.toBe(null);
                  replicator.token = badtoken; // Assert readonly
                  expect(replicator.token).not.toBe(badtoken);

                  expect(replicator.type).toBe('pull');
                  replicator.type = badtype; // Assert readonly
                  expect(replicator.type).not.toBe(badtype);

                  expect(replicator.datastore).toBe(datastore);
                  replicator.datastore = baddatastore; // Assert readonly
                  expect(replicator.datastore).not.toBe(baddatastore);

                  expect(replicator.uri).toBe(uri);
                  replicator.uri = baduri; // Assert readonly
                  expect(replicator.uri).not.toBe(baduri);
                })
                .catch(function(error) {
                  expect(error).toBe(null);
                })
                .fin(done);
            } catch (e) {
              fail('Test failed with exception: ' + e);
              done();
            }
          });

          it('should create a push replicator', function(done) {
            try {
              var datastore = getDatastore();
              expect(datastore).not.toBe(null);

              var options = {
                source: datastore,
                target: uri
              };

              expect(Replicator.create).not.toBe(null);

              Replicator.create(options).then(function(replicator) {
                  expect(replicator.token).not.toBe(null);
                  replicator.token = badtoken; // Assert readonly
                  expect(replicator.token).not.toBe(badtoken);

                  expect(replicator.type).toBe('push');
                  replicator.type = badtype; // Assert readonly
                  expect(replicator.type).not.toBe(badtype);

                  expect(replicator.datastore).toBe(datastore);
                  replicator.datastore = baddatastore; // Assert readonly
                  expect(replicator.datastore).not.toBe(baddatastore);

                  expect(replicator.uri).toBe(uri);
                  replicator.uri = baduri; // Assert readonly
                  expect(replicator.uri).not.toBe(baduri);
                })
                .catch(function(error) {
                  expect(error).toBe(null);
                })
                .fin(done);
            } catch (e) {
              fail('Test failed with exception: ' + e);
              done();
            }
          });

          it('should create a push replicator with an empty request and response interceptor array', function(done) {
            try {
              var datastore = getDatastore();
              expect(datastore).not.toBe(null);

              var options = {
                source: datastore,
                target: uri,
                requestInterceptors: [],
                responseInterceptors: []
              };

              expect(Replicator.create).not.toBe(null);

              Replicator.create(options).then(function(replicator) {
                  expect(replicator.token).not.toBe(null);
                  replicator.token = badtoken; // Assert readonly
                  expect(replicator.token).not.toBe(badtoken);

                  expect(replicator.type).toBe('push');
                  replicator.type = badtype; // Assert readonly
                  expect(replicator.type).not.toBe(badtype);

                  expect(replicator.datastore).toBe(datastore);
                  replicator.datastore = baddatastore; // Assert readonly
                  expect(replicator.datastore).not.toBe(baddatastore);

                  expect(replicator.uri).toBe(uri);
                  replicator.uri = baduri; // Assert readonly
                  expect(replicator.uri).not.toBe(baduri);
                })
                .catch(function(error) {
                  expect(error).toBe(null);
                })
                .fin(done);
            } catch (e) {
              fail('Test failed with exception: ' + e);
              done();
            }
          });

          it('should create two replicators with different tokens', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var pushOptions = {
              source: datastore,
              target: uri
            };

            var pullOptions = {
              source: uri,
              target: datastore
            };

            var promises = [
              Replicator.create(pullOptions),
              Replicator.create(pushOptions),
            ];

            Q.all(promises)
              .spread(function(pullReplicator, pushReplicator) {
                expect(pullReplicator.token).not.toEqual(pushReplicator.token);
              })
              .catch(function(error) {
                expect(error).toBe(null);
              })
              .fin(done);
          });

          // Negative tests
          it('throws error if push source is null', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: null,
              target: uri
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Push replicator source is null');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if push target is null', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: datastore,
              target: null
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Push replicator target is null');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if pull source is null', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: null,
              target: datastore
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Pull replicator source is null');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if pull target is null', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: uri,
              target: null
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Pull replicator target is null');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if pull source is not a String', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: [],
              target: datastore
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Pull replicator source is not a String');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if pull target is not a Datastore', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: uri,
              target: []
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Pull replicator target is not a Datastore');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if push source is not a Datastore', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: [],
              target: uri
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Push replicator source is not a Datastore');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if push target is not a String', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: datastore,
              target: []
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Push replicator target is not a String');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if push target is not set', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: datastore,
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Push replicator target is not set');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if pull target is not set', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: uri
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Pull replicator target is not set');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if push source is not set', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              target: uri
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Push replicator source is not set');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if pull source is not set', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              target: datastore
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Pull replicator source is not set');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if request interceptor is null', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: uri,
              target: datastore,
              requestInterceptors: null
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Request interceptor is null');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if response interceptor is null', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: uri,
              target: datastore,
              responseInterceptors: null
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Response interceptor is null');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if request interceptor is not a function or an array', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: uri,
              target: datastore,
              requestInterceptors: 'foo'
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Request interceptor is not a function or an array');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if response interceptor is not a function or an array', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: uri,
              target: datastore,
              responseInterceptors: 'foo'
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Response interceptor is not a function or an array');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if request interceptor in an array is not a function', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: uri,
              target: datastore,
              requestInterceptors: ['foo']
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Request interceptor in an array is not a function');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if response interceptor in an array is not a function', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var options = {
              source: uri,
              target: datastore,
              responseInterceptors: ['foo']
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Response interceptor in an array is not a function');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if request interceptor following a valid interceptor is not a function', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var requestFunction = function(context) {
              context.done();
            };

            var options = {
              source: datastore,
              target: uri,
              requestInterceptors: [requestFunction, 'notaninterceptor']
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Request interceptor following a valid interceptor is not a function');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('throws error if response interceptor following a valid interceptor is not a function', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var responseFunction = function(context) {
              context.done();
            };

            var options = {
              source: datastore,
              target: uri,
              responseInterceptors: [responseFunction, 'notaninterceptor']
            };

            expect(Replicator.create).not.toBe(null);

            try {
              Replicator.create(options)
                .then(function(replicator) {
                })
                .catch(function(e) {
                });
              fail('Response interceptor following a valid interceptor is not a function');
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });
        });
      });

      describe('Replicator (' + storeDescription + ')', function() {

        var testPullReplicator;
        var testPushReplicator;

        var pullOptions;
        var pushOptions;

        function getReplicator(type) {
          var rep;
          switch (type) {
            case 'pull':
              rep = testPullReplicator;
              break;
            case 'push':
              rep = testPushReplicator;
              break;
          }
          return rep;
        }

        beforeEach(function(done) {
          jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;
          var datastore = getDatastore(storeDescription);
          expect(datastore).not.toBe(null);

          pullOptions = {
            source: uri,
            target: datastore
          };

          pushOptions = {
            source: datastore,
            target: uri
          };

          Replicator.create(pullOptions)
            .then(function(pullReplicator) {
              expect(pullReplicator).not.toBe(null);
              testPullReplicator = pullReplicator;


              return Replicator.create(pushOptions);
            })
            .then(function(pushReplicator) {
              expect(pushReplicator).not.toBe(null);
              testPushReplicator = pushReplicator;
            })
            .catch(function(error) {
              expect(error).toBe(null);
            })
            .fin(done);
        });

        it('should contain method start', function() {
          var pullReplicator = getReplicator('pull');
          expect(pullReplicator).not.toBe(null);
          var pushReplicator = getReplicator('push');
          expect(pushReplicator).not.toBe(null);

          expect(pullReplicator.start).toBeDefined();
          expect(pushReplicator.start).toBeDefined();
        });

        it('should contain method getState', function() {
          var pullReplicator = getReplicator('pull');
          expect(pullReplicator).not.toBe(null);
          var pushReplicator = getReplicator('push');
          expect(pushReplicator).not.toBe(null);

          expect(pullReplicator.getState).toBeDefined();
          expect(pushReplicator.getState).toBeDefined();
        });

        it('should contain method stop', function() {
          var pullReplicator = getReplicator('pull');
          expect(pullReplicator).not.toBe(null);
          var pushReplicator = getReplicator('push');
          expect(pushReplicator).not.toBe(null);

          expect(pullReplicator.stop).toBeDefined();
          expect(pushReplicator.stop).toBeDefined();
        });

        describe('.start([callback])', function() {

          describe('Callbacks', function() {

            it('should start pull replication', function(done) {
              var replicator = getReplicator('pull');
              expect(replicator).not.toBe(null);

              // Start replication
              replicator.start(function(error) {
                expect(error).toBe(null);
                done();
              });
            });

            it('should start push replication', function(done) {
              var replicator = getReplicator('push');
              expect(replicator).not.toBe(null);

              // Start replication
              replicator.start(function(error) {
                expect(error).toBe(null);
                done();
              });
            });
          }); // End-callbacks-tests

          describe('Promises', function() {

            it('should start pull replication', function(done) {
              var replicator = getReplicator('pull');
              expect(replicator).not.toBe(null);

              replicator.start()
                .then(function() {
                })
                .catch(function(error) {
                  expect(error).toBe(null);
                })
                .fin(done);
            });

            it('should start push replication', function(done) {
              var replicator = getReplicator('push');
              expect(replicator).not.toBe(null);

              // Start replication
              replicator.start()
                .then(function() {
                })
                .catch(function(error) {
                  expect(error).toBe(null);
                })
                .fin(done);
            });
          }); // End-promises-tests

        }); // End-start-tests

        describe('.getState([callback])', function() {

          describe('Callbacks', function() {

            it('should poll pull replication status until completion', function(done) {
              var replicator = getReplicator('pull');
              expect(replicator).not.toBe(null);

              var mtimer;

              function poll(replicator) {
                mtimer = setInterval(function() {
                  replicator.getState(function(error,
                    result) {
                    expect(error).toBe(null);
                    expect(result).not.toBe('Error');
                    if (result === 'Complete' || result === 'Error') {
                      stopPoll();
                      done();
                    }
                  });
                }, 500);
              }

              function stopPoll() {
                clearInterval(mtimer);
              }

              // Start replication
              replicator.start(function(error) {
                expect(error).toBe(null);
                poll(replicator); // Poll on the replication status
              });
            }, LONG_TIMEOUT);

            it('should poll push replication status until completion', function(done) {
              var replicator = getReplicator('push');
              expect(replicator).not.toBe(null);

              var mtimer;

              function poll(replicator) {
                mtimer = setInterval(function() {
                  replicator.getState(function(error,
                    result) {
                    expect(error).toBe(null);
                    expect(result).not.toBe('Error');
                    if (result === 'Complete' || result === 'Error') {
                      stopPoll();
                      done();
                    }
                  });
                }, 500);
              }

              function stopPoll() {
                clearInterval(mtimer);
              }

              // Start replication
              replicator.start(function(error) {
                expect(error).toBe(null);
                poll(replicator); // Poll on the replication status
              });
            });

            it('should poll two replication\'s status until completion', function(done) {
              var pullReplicator = getReplicator('pull');
              expect(pullReplicator).not.toBe(null);
              var pushReplicator = getReplicator('push');
              expect(pushReplicator).not.toBe(null);

              var mtimer1, mtimer2;
              var ncompletions = 0;

              function poll(rep) {
                return setInterval(repStatus, 2000, rep);
              }

              var repStatus = function(rep) {
                rep.getState(function(error,
                  result) {
                  if (result ===
                    'Complete') {
                    ncompletions++;
                  }
                  if (ncompletions > 1) {
                    stopPoll();
                    done();
                  }
                });
              };

              function stopPoll() {
                clearInterval(mtimer1);
                clearInterval(mtimer2);
              }

              // Start replications
              pullReplicator.start(function(error) {
                expect(error).toBe(null);
                // Start polling on replication status
                mtimer1 = poll(pullReplicator);
              });
              pushReplicator.start(function(error) {
                expect(error).toBe(null);
                mtimer2 = poll(pushReplicator);
              });
            });
          }); // End-callbacks-tests

          describe('Promises', function() {

            it('should poll pull replication status until completion', function(done) {
              var replicator = getReplicator('pull');
              expect(replicator).not.toBe(null);

              var mtimer;

              function poll(replicator) {
                mtimer = setInterval(function() {
                  replicator.getState()
                    .then(function(result) {
                      expect(result).not.toBe(null);
                      expect(result).not.toBe('Error');
                      if (result === 'Complete' || result === 'Error') {
                        stopPoll();
                        done();
                      }
                    })
                    .catch(function(error) {
                      expect(error).toBe(null);
                    });
                }, 500);
              }

              function stopPoll() {
                clearInterval(mtimer);
              }

              // Start replication
              replicator.start()
                .then(function() {
                  poll(replicator); // Poll on the replication status
                })
                .catch(function(error) {
                  expect(error).toBe(null);
                });
            }, LONG_TIMEOUT);

            it('should poll push replication status until completion', function(done) {
              var replicator = getReplicator('push');
              expect(replicator).not.toBe(null);

              var mtimer;

              function poll(replicator) {
                mtimer = setInterval(function() {
                  replicator.getState()
                    .then(function(result) {
                      expect(result).not.toBe(null);
                      expect(result).not.toBe('Error');
                      if (result === 'Complete' || result === 'Error') {
                        stopPoll();
                        done();
                      }
                    })
                    .catch(function(error) {
                      expect(error).toBe(null);
                    });
                }, 500);
              }

              function stopPoll() {
                clearInterval(mtimer);
              }

              replicator.start()
                .then(function() {
                  poll(replicator); // Poll on the replication status
                })
                .catch(function(error) {
                  expect(error).toBe(null);
                });
            });

            it('should poll two replication\'s status until completion', function(done) {
              var pullReplicator = getReplicator('pull');
              expect(pullReplicator).not.toBe(null);
              var pushReplicator = getReplicator('push');
              expect(pushReplicator).not.toBe(null);

              var mtimer1, mtimer2;
              var ncompletions = 0;

              function poll(rep) {
                return setInterval(repStatus, 2000, rep);
              }

              var repStatus = function(rep) {
                rep.getState()
                  .then(function(result) {
                    if (result === 'Complete') {
                      ncompletions++;
                    }
                    if (ncompletions > 1) {
                      stopPoll();
                      done();
                    }
                  })
                  .catch(function(error) {
                    expect(error).not.toBe(null);
                  });
              };

              function stopPoll() {
                clearInterval(mtimer1);
                clearInterval(mtimer2);
              }

              // Start replicators
              Q.all([pullReplicator.start(), pushReplicator.start()])
                .then(function() {
                  // Start polling on replication status
                  mtimer1 = poll(pullReplicator);
                  mtimer2 = poll(pushReplicator);
                })
                .catch(function(error) {
                  expect(error).toBe(null);
                });
            });
          }); // End-promises-tests

        }); // End-getState-tests

        describe('.stop([callback])', function() {

          describe('Callbacks', function() {

            it('should stop pull replication', function(done) {
              var replicator = getReplicator('pull');
              expect(replicator).not.toBe(null);

              // Start replication
              replicator.start(function(error) {
                expect(error).toBe(null);
                replicator.stop(function(error) {
                  expect(error).toBe(null);
                  done();
                });
              });
            });

            it('should stop push replication', function(done) {
              var replicator = getReplicator('push');
              expect(replicator).not.toBe(null);

              // Start replication
              replicator.start(function(error) {
                expect(error).toBe(null);
                replicator.stop(function(error) {
                  expect(error).toBe(null);
                  done();
                });
              });
            });
          }); // End-callbacks-tests

          describe('Promises', function() {

            it('should stop pull replication', function(done) {
              var replicator = getReplicator('pull');
              expect(replicator).not.toBe(null);

              // Start replication
              replicator.start()
                .then(function() {
                  return replicator.stop();
                })
                .catch(function(error) {
                  expect(error).toBe(null);
                })
                .fin(done);
            });

            it('should stop push replication', function(done) {
              var replicator = getReplicator('pull');
              expect(replicator).not.toBe(null);

              // Start replication
              replicator.start()
                .then(function() {
                  return replicator.stop();
                })
                .catch(function(error) {
                  expect(error).toBe(null);
                })
                .fin(done);
            });
          }); // End-promises-tests
        }); // End-stop-tests

        describe('.on(event, handler)', function() {
          it('should register and fire a "complete" event', function(done) {
            var replicator = getReplicator('pull');
            expect(replicator).not.toBe(null);

            replicator.on('complete', function(numDocs) {
              expect(numDocs).not.toBe(null);
              done();
            });

            replicator.start()
              .catch(function(error) {
                expect(error).toBe(null);
              });
          }, LONG_TIMEOUT);

          it('should register and fire an "error" event', function(done) {
            var datastore = getDatastore(storeDescription);
            expect(datastore).not.toBe(null);

            var pullOptions = {
              source: uri + 'foo',
              target: datastore
            };

            Replicator.create(pullOptions)
              .then(function(replicator) {
                expect(replicator).not.toBe(null);
                replicator.on('error', function(message) {
                  expect(message).not.toBe(null);
                  done();
                });

                return replicator.start();
              })
              .catch(function(error) {
                expect(error).toBe(null);
              });
          });
        });

        describe('.destroy([callback])', function() {
          describe('Callbacks', function() {
            it('should destroy a replicator', function(done) {
              try {
                var replicator = getReplicator('pull');
                expect(replicator).not.toBe(null);
                expect(replicator.destroyed).not.toBeDefined();

                replicator.destroy(function(error) {
                  try {
                    expect(error).toBe(null);
                    expect(replicator.destroyed).toBe(true);
                    done();
                  } catch (e) {
                    fail('Test failed with exception: ' + e);
                    done();
                  }
                });
              } catch (e) {
                fail('Test failed with exception: ' + e);
                done();
              }
            });
          });

          describe('Promises', function() {
            it('should destroy a replicator', function(done) {
              try {
                var replicator = getReplicator('pull');
                expect(replicator).not.toBe(null);
                expect(replicator.destroyed).not.toBeDefined();

                replicator.destroy()
                  .then(function() {
                    expect(replicator.destroyed).toBe(true);
                  })
                  .catch(function(error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
              } catch (e) {
                fail('Test failed with exception: ' + e);
                done();
              }
            });
          });
        });

        describe('pull replication', function() {
          it('should pull documents from animaldb', function(done) {
            var replicator = getReplicator('pull');
            expect(replicator).not.toBe(null);

            replicator.on('complete', function(numDocs) {
              expect(numDocs).not.toBe(null);

              replicator.datastore.getDocument('aardvark')
                .then(function(documentRevision) {
                  expect(documentRevision).not.toBe(null);
                  expect(documentRevision._id).not.toBe(null);
                  expect(documentRevision._id).toBe('aardvark');
                  done();
                });
            });

            replicator.start()
              .catch(function(error) {
                expect(error).toBe(null);
              });
          }, LONG_TIMEOUT);
        });

        describe('push replication', function() {
          it('should push documents to testdb', function(done) {
            try {
              var pushReplicator = getReplicator('push');
              expect(pushReplicator).not.toBe(null);

              var pullReplicator = getReplicator('pull');
              expect(pullReplicator).not.toBe(null);

              pullReplicator.on('complete', function(numDocs) {
                expect(numDocs).not.toBe(null);
              });

              pullReplicator.on('error', function(message) {
                expect(message).toBe(null);
                done();
              });

              pushReplicator.on('complete', function(numDocs) {
                expect(numDocs).not.toBe(null);
                expect(numDocs).toBe(1);
                done();
              });

              pushReplicator.on('error', function(message) {
                expect(message).toBe(null);
                done();
              });

              pullReplicator.on('complete', function(numDocs) {
                pushReplicator.datastore.createDocumentFromRevision({
                    foo: 'bar',
                  })
                  .then(function(savedRevision) {
                    expect(savedRevision).not.toBe(null);

                    return pushReplicator.start();
                  })
                  .catch(function(error) {
                    expect(error).toBe(null);
                    done();
                  });
              });

              pullReplicator.start()
                .catch(function(e) {
                  fail('Test failed with exception: ' + e);
                });
            } catch (e) {
              console.log(e);
              done();
            }
          }, LONG_TIMEOUT);
        });

        describe('interceptors', function() {
          it('should add a request header', function(done) {
            var datastore = getDatastore(storeDescription);

            var requestFunction = function(context) {
              expect(context).not.toBe(null);
              expect(context.request).toBeDefined();
              expect(context.request).not.toBe(null);
              expect(context.request.headers).toBeDefined();
              expect(context.request.headers).not.toBe(null);
              expect(context.request.url).toBeDefined();
              expect(context.request.url).not.toBe(null);

              expect(context.response).toBeDefined();
              expect(context.response).toBe(null);

              expect(context.replayRequest).toBeDefined();
              expect(context.replayRequest).not.toBe(null);

              context.request.headers['x-my-foo-header'] = 'bar';
              context.done();
            };

            var responseFunction = function(context) {
              expect(context).not.toBe(null);
              expect(context.request).toBeDefined();
              expect(context.request).not.toBe(null);
              expect(context.request.headers).toBeDefined();
              expect(context.request.headers).not.toBe(null);
              expect(context.request.headers['x-my-foo-header']).toBeDefined();
              expect(context.request.headers['x-my-foo-header']).toBe('bar');
              expect(context.request.url).toBeDefined();
              expect(context.request.url).not.toBe(null);

              expect(context.response).toBeDefined();
              expect(context.response).not.toBe(null);
              expect(context.response.statusCode).toBeDefined();
              expect(context.response.statusCode).not.toBe(null);
              expect(context.response.headers).toBeDefined();
              expect(context.response.headers).not.toBe(null);

              expect(context.replayRequest).toBeDefined();
              expect(context.replayRequest).not.toBe(null);

              context.done();
            };

            var options = {
              source: uri,
              target: datastore,
              requestInterceptors: requestFunction,
              responseInterceptors: responseFunction
            };

            Replicator.create(options)
              .then(function(replicator) {
                expect(replicator).not.toBe(null);

                replicator.on('complete', function(numDocs) {
                  expect(numDocs).not.toBe(null);

                  replicator.datastore.getDocument('aardvark')
                    .then(function(documentRevision) {
                      expect(documentRevision).not.toBe(null);
                      expect(documentRevision._id).not.toBe(null);
                      expect(documentRevision._id).toBe('aardvark');
                      done();
                    });
                });

                return replicator.start();
              })
              .catch(function(error) {
                expect(error).toBe(null);
                done();
              });
          }, LONG_TIMEOUT);

          it('should timeout', function(done) {
            var datastore = getDatastore(storeDescription);

            var requestFunction = function(context) {
              expect(context).not.toBe(null);
              expect(context.request).toBeDefined();
              expect(context.request).not.toBe(null);
              expect(context.request.headers).toBeDefined();
              expect(context.request.headers).not.toBe(null);

              context.request.headers['x-my-foo-header'] = 'bar';
              // NOT calling context.done() to force a timeout
            };

            var responseFunction = function(context) {
              expect(context).not.toBe(null);
              expect(context.request).toBeDefined();
              expect(context.request).not.toBe(null);
              expect(context.request.headers).toBeDefined();
              expect(context.request.headers).not.toBe(null);
              expect(context.request.headers['x-my-foo-header']).not.toBeDefined();

              context.done();
            };

            var options = {
              source: uri,
              target: datastore,
              requestInterceptors: requestFunction,
              responseInterceptors: responseFunction
            };

            Replicator.create(options)
              .then(function(replicator) {
                expect(replicator).not.toBe(null);

                // Shortening the timeout duration
                replicator.interceptorTimeout = 5000;

                replicator.on('complete', function(numDocs) {
                  expect(numDocs).not.toBe(null);

                  replicator.datastore.getDocument('aardvark')
                    .then(function(documentRevision) {
                      expect(documentRevision).not.toBe(null);
                      expect(documentRevision._id).not.toBe(null);
                      expect(documentRevision._id).toBe('aardvark');
                      done();
                    });
                });

                return replicator.start();
              })
              .catch(function(error) {
                expect(error).toBe(null);
              }).fin(done);
          });

          it('should execute two interceptors', function(done) {
            var datastore = getDatastore(storeDescription);

            var reqInterceptor1 = function(context) {
              expect(context).not.toBe(null);
              expect(context.request).toBeDefined();
              expect(context.request).not.toBe(null);
              expect(context.request.headers).toBeDefined();
              expect(context.request.headers).not.toBe(null);

              context.request.headers['x-my-foo-header'] = 'bar';
              context.done();
            };

            var reqInterceptor2 = function(context) {
              expect(context).not.toBe(null);
              expect(context.request).toBeDefined();
              expect(context.request).not.toBe(null);
              expect(context.request.headers).toBeDefined();
              expect(context.request.headers).not.toBe(null);

              context.request.headers['x-my-bar-header'] = 'foo';
              context.done();
            };

            var resInterceptor1 = function(context) {
              expect(context).not.toBe(null);
              expect(context.request).toBeDefined();
              expect(context.request).not.toBe(null);
              expect(context.request.headers).toBeDefined();
              expect(context.request.headers).not.toBe(null);
              expect(context.request.headers['x-my-foo-header']).toBeDefined();
              expect(context.request.headers['x-my-foo-header']).toBe('bar');

              context.done();
            };

            var resInterceptor2 = function(context) {
              expect(context).not.toBe(null);
              expect(context.request).toBeDefined();
              expect(context.request).not.toBe(null);
              expect(context.request.headers).toBeDefined();
              expect(context.request.headers).not.toBe(null);
              expect(context.request.headers['x-my-bar-header']).toBeDefined();
              expect(context.request.headers['x-my-bar-header']).toBe('foo');

              context.done();
            };

            var options = {
              source: uri,
              target: datastore,
              requestInterceptors: [reqInterceptor1, reqInterceptor2],
              responseInterceptors: [resInterceptor1, resInterceptor2]
            };

            Replicator.create(options)
              .then(function(replicator) {
                expect(replicator).not.toBe(null);

                // Shortening the timeout duration
                replicator.interceptorTimeout = 5000;

                replicator.on('complete', function(numDocs) {
                  expect(numDocs).not.toBe(null);

                  replicator.datastore.getDocument('aardvark')
                    .then(function(documentRevision) {
                      expect(documentRevision).not.toBe(null);
                      expect(documentRevision._id).not.toBe(null);
                      expect(documentRevision._id).toBe('aardvark');
                      done();
                    });
                });

                return replicator.start();
              })
              .catch(function(error) {
                expect(error).toBe(null);
                done();
              });
          }, LONG_TIMEOUT);

          it('should set the replay flag', function(done) {
            var datastore = getDatastore(storeDescription);

            var numTries = 0;
            var url = null;

            var requestFunction = function(context) {
              expect(context).not.toBe(null);
              expect(context.request).toBeDefined();
              expect(context.request).not.toBe(null);
              expect(context.request.url).toBeDefined();
              expect(context.request.url).not.toBe(null);

              // Capture the first request url
              if (!url) {
                url = context.request.url;
              }

              context.done();
            };

            var responseFunction = function(context) {
              expect(context).not.toBe(null);
              expect(context.request).toBeDefined();
              expect(context.request).not.toBe(null);
              expect(context.request.url).toBeDefined();
              expect(context.request.url).not.toBe(null);
              expect(context.response.statusCode).toBeDefined();
              expect(context.response.statusCode).not.toBe(null);
              expect(context.replayRequest).toBeDefined();
              expect(context.replayRequest).not.toBe(null);

              // Tick up the number of times the first request has been sent
              if (context.request.url === url) {
                numTries++;

                // If the url has only been requested once try again
                if (context.response.statusCode === 404 && numTries < 2) {
                  context.replayRequest = true;
                }
              }

              context.done();
            };

            var options = {
              source: uri + 'doesnotexist',
              target: datastore,
              requestInterceptors: requestFunction,
              responseInterceptors: responseFunction
            };

            Replicator.create(options)
              .then(function(replicator) {
                expect(replicator).not.toBe(null);

                replicator.on('error', function(error) {
                  expect(error).not.toBe(null);
                  expect(numTries).toBe(2);
                  done();
                });

                return replicator.start();
              })
              .catch(function(error) {
                expect(error).toBe(null);
                done();
              });
          });
        });
      }); // End-Replicator-tests
    }

    testReplication('local');
  });
};

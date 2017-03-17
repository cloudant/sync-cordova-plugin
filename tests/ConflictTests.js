/**
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

var DatastoreManager = require('cloudant-sync.DatastoreManager').DatastoreManager;
var Replicator = require('cloudant-sync.Replicator');
var TestUtil = require('cloudant-sync-tests.TestUtil');
var RemoteDbUtils = require('cloudant-sync-tests.RemoteDbUtils');
var _ = require('cloudant-sync.lodash_funcs');
var Q = require('cloudant-sync.q');

var DBName1 = 'conflictdb';
var DBName2 = 'conflictdb2';
var EncryptedDBName1 = DBName1 + 'secure';
var EncryptedDBName2 = DBName2 + 'secure';

exports.defineAutoTests = function () {
  var validEncryptionOptions = {
    password: 'passw0rd',
    identifier: 'toolkit'
  };

  var manager;
  var localStore1 = null;
  var localStore2 = null;
  var encryptedStore1 = null;
  var encryptedStore2 = null;

  var uri = TestUtil.LOCAL_COUCH_URL + '/conflictdb';

  // Replicators
  var pullToStore1;
  var pushFromStore1;
  var pullToStore2;
  var pushFromStore2;

  function createDatastoreManager() {
    return DatastoreManager()
            .then(function (m) {
              manager = m;
            });
  }

  function createLocalDatastores() {
    return manager.openDatastore(DBName1)
            .then(function (newLocalStore) {
              localStore1 = newLocalStore;
              return manager.openDatastore(EncryptedDBName1, validEncryptionOptions);
            })
            .then(function (newEncryptedLocalStore) {
              encryptedStore1 = newEncryptedLocalStore;
              return manager.openDatastore(DBName2);
            })
            .then(function (newLocalStore) {
              localStore2 = newLocalStore;
              return manager.openDatastore(EncryptedDBName2, validEncryptionOptions);
            })
            .then(function (newEncryptedLocalStore) {
              encryptedStore2 = newEncryptedLocalStore;
            })
            .catch(function (error) {
              console.error(error);
            });
  }

  function deleteLocalDatastores() {
    return manager.deleteDatastore(DBName1)
            .then(function () {
              return manager.deleteDatastore(EncryptedDBName1);
            })
            .then(function () {
              return manager.deleteDatastore(DBName2);
            })
            .then(function () {
              return manager.deleteDatastore(EncryptedDBName2);
            })
            .catch(function (error) {
              console.error(error);
            });
  }

  function createReplicators() {
    var pushOptions = {
      source: localStore1,
      target: uri
    };
    var pullOptions = {
      source: uri,
      target: localStore1
    };
    var r1 = new Replicator.create(pullOptions);
    var r2 = new Replicator.create(pushOptions);

    pushOptions = {
      source: localStore2,
      target: uri
    };
    pullOptions = {
      source: uri,
      target: localStore2
    };
    var r3 = new Replicator.create(pullOptions);
    var r4 = new Replicator.create(pushOptions);

    return Q.allSettled([r1, r2, r3, r4])
            .then(function (results) {
              expect(results.length).toBe(4);
              expect(results[0]).not.toBe(null);
              expect(results[1]).not.toBe(null);
              expect(results[2]).not.toBe(null);
              expect(results[3]).not.toBe(null);
              pullToStore1 = results[0]['value'];
              pushFromStore1 = results[1]['value'];
              pullToStore2 = results[2]['value'];
              pushFromStore2 = results[3]['value'];
            })
            .catch(function (error) {
              console.error(error);
            });
  }

  // Invoke the given replicator and return a promise that signals
  // completion of the replication.
  function replicate(replicator) {
    var deferred = Q.defer();

    expect(replicator).not.toBe(null);

    var mtimer;

    function poll(replicator) {
      mtimer = setInterval(function () {
        replicator.getState()
                .then(function (result) {
                  expect(result).not.toBe(null);
                  expect(result).not.toBe('Error');
                  if (result === 'Complete' || result === 'Error') {
                    stopPoll();
                    deferred.resolve(result);
                  }
                })
                .catch(function (error) {
                  expect(error).toBe(null);
                });
      }, 500);
    }

    function stopPoll() {
      clearInterval(mtimer);
    }

    replicator.start()
            .then(function () {
              poll(replicator); // Poll on the replication status
            })
            .catch(function (error) {
              expect(error).toBe(null);
            });
    return deferred.promise;
  }

  function createConflictedDocs(docIds) {
    // 1. Create the replicators.
    return createReplicators()
            .then(function () {
              // 2. Create a document in local datastore 1.
              var creates = [];
              for (var i = 0; i < docIds.length; ++i) {
                creates.push(localStore1.createDocumentFromRevision({_id: docIds[i], foo1a: 'bar1a'}));
              }
              return Q.allSettled(creates);
            })
            .then(function (results) {
              // 3. Update the document in local datastore 1.
              var updates = [];
              for (var i = 0; i < results.length; ++i) {
                var docRev = results[i]['value'];
                delete docRev.foo1a;
                docRev.foo2a = 'bar2a';
                updates.push(localStore1.updateDocumentFromRevision(docRev));
              }
              return Q.allSettled(updates);
            })
            .then(function (results) {
              // 4. Push the document to the remote.
              return replicate(pushFromStore1);
            })
            .then(function (result) {
              // 5. Pull the document to local datastore 2.
              return replicate(pullToStore2);
            })
            .then(function (result) {
              // 6. Get the document from local datastore 1.
              var gets = [];
              for (var i = 0; i < docIds.length; ++i) {
                gets.push(localStore1.getDocument(docIds[i]));
              }

              return Q.allSettled(gets);
            })
            .then(function (results) {
              // 7. Update the document in local datastore 1.
              var updates = [];
              for (var i = 0; i < results.length; ++i) {
                var docRev = results[i]['value'];
                delete docRev.foo2a;
                docRev.foo2b = 'bar2b';
                updates.push(localStore1.updateDocumentFromRevision(docRev));
              }
              return Q.allSettled(updates);
            })
            .then(function (results) {
              // 8. Get the document from local datastore 2.
              var gets = [];
              for (var i = 0; i < docIds.length; ++i) {
                gets.push(localStore2.getDocument(docIds[i]));
              }

              return Q.allSettled(gets);
            })
            .then(function (results) {
              // 9. Update the document in local datastore 2.
              var updates = [];
              for (var i = 0; i < results.length; ++i) {
                var docRev = results[i]['value'];
                delete docRev.foo2a;
                docRev.foo2c = 'bar2c';
                updates.push(localStore2.updateDocumentFromRevision(docRev));
              }
              return Q.allSettled(updates);
            })
            .then(function (results) {
              // 10. Push the document from local datastore 2 to the remote.
              return replicate(pushFromStore2);
            })
            .then(function (result) {
              // 11. Pull the document from the remote to local datastore 1.
              // The documents should now conflict.
              return replicate(pullToStore1);
            })
            .catch(function (error) {
              expect(error).toBe(null);
            });
  }

  function checkConflictedDocIds(args) {
    expect(_.isObject(args));
    expect(args.expected).not.toBeUndefined();
    expect(args.actual).not.toBeUndefined();
    expect(_.isArray(args.expected));
    expect(_.isArray(args.actual));
    expect(args.actual.length).toBe(args.expected.length);
    for (var i = 0; i < args.expected.length; ++i) {
      expect(args.actual).toContain(args.expected[i]);
    }
  }

  function createRemoteAndLocalDatastores() {
    RemoteDbUtils.createRemoteDb(uri);

    return createLocalDatastores();
  }

  function deleteRemoteAndLocalDatastores() {
    RemoteDbUtils.deleteRemoteDb(uri);

    return deleteLocalDatastores();
  }

  describe('Conflicts', function () {

    beforeAll(function (done) {
      // Create the datastore manager and make sure there aren't any
      // datastores (local or remote) hanging around from a previous run.
      createDatastoreManager()
              .then(function () {
                return deleteRemoteAndLocalDatastores();
              })
              .fin(done);
    });

    describe('Conflict operations exist', function () {

      beforeAll(function (done) {
        createLocalDatastores().then(done);
      });

      afterAll(function (done) {
        deleteLocalDatastores().then(done);
      });

      it('.getConflictedDocumentIds exists', function () {
        expect(localStore1).not.toBe(null);
        expect(localStore1.getConflictedDocumentIds).toBeDefined();
      });

      it('.resolveConflictsForDocument exists', function () {
        expect(localStore1).not.toBe(null);
        expect(localStore1.resolveConflictsForDocument).toBeDefined();
      });
    });

    describe('Callbacks', function () {

      beforeAll(function (done) {
        createRemoteAndLocalDatastores().then(done);
      });

      afterAll(function (done) {
        deleteRemoteAndLocalDatastores().then(done);
      });

      var document1a = {
        _id: 'myId',
        foo1a: 'bar1a'
      };

      var objWithoutBody = {};

      describe('No conflicts', function () {
        it('check there no conflicted doc ids', function (done) {
          localStore1.getConflictedDocumentIds(function (error, docIds) {
            expect(error).toBe(null);
            checkConflictedDocIds({expected: [], actual: docIds});
            done();
          });
        });

        it('call resolveConflictsForDocument with no conflicts to resolve', function (done) {
          var conflictResolver = jasmine.createSpy();

          localStore1.resolveConflictsForDocument('myId', conflictResolver,
                  function (error) {
                    expect(error).toBe(null);
                    expect(conflictResolver).not.toHaveBeenCalled();
                    done();
                  });
        });
      }); // describe - No conflicts

      describe('Single conflict', function () {

        it('create a conflicted document', function (done) {
          createConflictedDocs(['myId']).then(done);
        });

        it('check the conflicted doc id', function (done) {
          localStore1.getConflictedDocumentIds(function (error, docIds) {
            expect(error).toBe(null);
            checkConflictedDocIds({expected: ['myId'], actual: docIds});
            done();
          });
        });

        it('return null from the conflictResolver', function (done) {
          var conflictResolver = {
            resolver: function (docId, documentRevisions) {
              return null;
            }
          };

          spyOn(conflictResolver, 'resolver').and.callThrough();

          localStore1.resolveConflictsForDocument('myId', conflictResolver.resolver,
                  function (error) {
                    expect(error).toBe(null);
                    expect(conflictResolver.resolver).toHaveBeenCalled();
                    done();
                  });
        });

        it('check that returning null from the conflictResolver didn\'t resolve the conflict', function (done) {
          localStore1.getConflictedDocumentIds(function (error, docIds) {
            expect(error).toBe(null);
            checkConflictedDocIds({expected: ['myId'], actual: docIds});
            done();
          });
        });

        it('resolve the conflicts', function (done) {
          var conflictResolver = {
            resolver: function (docId, documentRevisions) {
              expect(docId).toBe('myId');
              expect(documentRevisions).not.toBe(null);
              expect(documentRevisions.length).toBe(2);
              var resolvedDoc = documentRevisions[0];
              resolvedDoc.fooResolved = 'barResolved';
              return resolvedDoc;
            }
          };

          spyOn(conflictResolver, 'resolver').and.callThrough();

          localStore1.resolveConflictsForDocument('myId', conflictResolver.resolver,
                  function (error) {
                    expect(error).toBe(null);
                    expect(conflictResolver.resolver).toHaveBeenCalled();
                    done();
                  });
        });

        it('check there are now no conflicted doc ids', function (done) {
          localStore1.getConflictedDocumentIds(function (error, docIds) {
            expect(error).toBe(null);
            checkConflictedDocIds({expected: [], actual: docIds});
            done();
          });
        });

        it('get the doc and check the resolved version is as expected', function (done) {
          localStore1.getDocument('myId', function (error, docRevision) {
            expect(error).toBe(null);
            expect(docRevision).not.toBe(null);
            expect(docRevision._id).toBeDefined();
            expect(docRevision._id).toBe('myId');
            expect(docRevision._rev).toBeDefined();
            expect(docRevision.fooResolved).toBe('barResolved');
            done();
          });
        });
      }); // describe - Single conflict

      describe('Three conflicts', function () {

        it('create three conflicted documents', function (done) {
          createConflictedDocs(['doc1', 'doc2', 'doc3'])
                  .then(done);
        });

        it('check the conflicted doc ids', function (done) {
          localStore1.getConflictedDocumentIds(function (error, docIds) {
            expect(error).toBe(null);
            checkConflictedDocIds({expected: ['doc1', 'doc2', 'doc3'], actual: docIds});
            done();
          });
        });

        it('resolve the conflicts for doc1', function (done) {
          var conflictResolver = {
            resolver: function (docId, documentRevisions) {
              expect(docId).toBe('doc1');
              expect(documentRevisions).not.toBe(null);
              expect(documentRevisions.length).toBe(2);
              var resolvedDoc = {
                _id: docId,
                _rev: documentRevisions[0]._rev,
                fooResolved: 'barResolved'
              };
              return resolvedDoc;
            }
          };

          spyOn(conflictResolver, 'resolver').and.callThrough();

          localStore1.resolveConflictsForDocument('doc1', conflictResolver.resolver,
                  function (error) {
                    expect(error).toBe(null);
                    expect(conflictResolver.resolver).toHaveBeenCalled();
                    done();
                  });
        });

        it('check the conflicted doc ids contain only doc2 and doc3', function (done) {
          localStore1.getConflictedDocumentIds(function (error, docIds) {
            expect(error).toBe(null);
            checkConflictedDocIds({expected: ['doc2', 'doc3'], actual: docIds});
            done();
          });
        });

        it('resolve the conflicts for doc2', function (done) {
          var conflictResolver = {
            resolver: function (docId, documentRevisions) {
              expect(docId).toBe('doc2');
              expect(documentRevisions).not.toBe(null);
              expect(documentRevisions.length).toBe(2);
              var resolvedDoc = {
                _id: docId,
                _rev: documentRevisions[0]._rev,
                fooResolved: 'barResolved'
              };
              return resolvedDoc;
            }
          };

          spyOn(conflictResolver, 'resolver').and.callThrough();

          localStore1.resolveConflictsForDocument('doc2', conflictResolver.resolver,
                  function (error) {
                    expect(error).toBe(null);
                    expect(conflictResolver.resolver).toHaveBeenCalled();
                    done();
                  });
        });

        it('check the conflicted doc ids contain only doc3', function (done) {
          localStore1.getConflictedDocumentIds(function (error, docIds) {
            expect(error).toBe(null);
            checkConflictedDocIds({expected: ['doc3'], actual: docIds});
            done();
          });
        });

        it('resolve the conflicts for doc3', function (done) {
          var conflictResolver = {
            resolver: function (docId, documentRevisions) {
              expect(docId).toBe('doc3');
              expect(documentRevisions).not.toBe(null);
              expect(documentRevisions.length).toBe(2);
              var resolvedDoc = {
                _id: docId,
                _rev: documentRevisions[0]._rev,
                fooResolved: 'barResolved'
              };
              return resolvedDoc;
            }};

          spyOn(conflictResolver, 'resolver').and.callThrough();

          localStore1.resolveConflictsForDocument('doc3', conflictResolver.resolver,
                  function (error) {
                    expect(error).toBe(null);
                    expect(conflictResolver.resolver).toHaveBeenCalled();
                    done();
                  });
        });

        it('check there are now no conflicted doc ids', function (done) {
          localStore1.getConflictedDocumentIds(function (error, docIds) {
            expect(error).toBe(null);
            checkConflictedDocIds({expected: [], actual: docIds});
            done();
          });
        });

      }); // describe - Three conflicts

      describe('Attachment conflicts resolve in favour of local', function () {
        it('create a remote document', function (done) {
          var document =
                  {
                    _id: 'doc-1',
                    field1: 'remote-doc',
                    _attachments:
                            {
                              myRemoteAttachment:
                                      {
                                        'content-type': 'text-plain',
                                        data: btoa('Remote attachment') // btoa only supports ASCII, not Unicode.
                                      }
                            }
                  };
          var status = RemoteDbUtils.createRemoteDocument(uri, document);
          // Check the create returned a 2xx status.
          expect(Math.floor(status / 100)).toBe(2);
          done();
        });

        it('create a conflicting local document', function (done) {
          var document =
                  {
                    _id: 'doc-1',
                    field1: 'local-doc',
                    _attachments:
                            {
                              myLocalAttachment:
                                      {
                                        content_type: 'text-plain',
                                        data: btoa('Local attachment') // bota only supports ASCII, not Unicode.
                                      }
                            }
                  };
          localStore1.createDocumentFromRevision(document)
                  .then(function () {
                    return createReplicators();
                  })
                  .then(function () {
                    return replicate(pullToStore1);
                  })
                  .fin(done);
        });

        it('check the conflicted doc ids contain only doc-1', function (done) {
          localStore1.getConflictedDocumentIds(function (error, docIds) {
            expect(error).toBe(null);
            checkConflictedDocIds({expected: ['doc-1'], actual: docIds});
            done();
          });
        });

        it('resolve the conflicts for doc-1', function (done) {
          var conflictResolver = {
            resolver: function (docId, documentRevisions) {
              expect(docId).toBe('doc-1');
              expect(documentRevisions).not.toBe(null);
              expect(documentRevisions.length).toBe(2);
              for (var i = 0; i < documentRevisions.length; ++i) {
                var docRev = documentRevisions[i];
                if (docRev.field1 === 'local-doc') {
                  return docRev;
                }
              }
            }
          };

          spyOn(conflictResolver, 'resolver').and.callThrough();

          localStore1.resolveConflictsForDocument('doc-1', conflictResolver.resolver,
                  function (error) {
                    expect(error).toBe(null);
                    expect(conflictResolver.resolver).toHaveBeenCalled();
                    done();
                  });
        });

        it('check there are now no conflicted doc ids', function (done) {
          localStore1.getConflictedDocumentIds(function (error, docIds) {
            expect(error).toBe(null);
            checkConflictedDocIds({expected: [], actual: docIds});
            done();
          });
        });

        it('get the doc and check the resolved version is as expected', function (done) {
          localStore1.getDocument('doc-1', function (error, docRevision) {
            expect(error).toBe(null);
            expect(docRevision).not.toBe(null);
            expect(docRevision._id).toBeDefined();
            expect(docRevision._id).toBe('doc-1');
            expect(docRevision._rev).toBeDefined();
            expect(docRevision.field1).toBe('local-doc');
            expect(docRevision._attachments).toBeDefined();
            expect(Object.keys(docRevision._attachments).length).toBe(1);
            expect(atob(docRevision._attachments['myLocalAttachment'].data)).toBe('Local attachment');
            done();
          });
        });

      }); // describe - Attachment conflicts

      describe('Attachment conflicts resolve in favour of remote and merge attachments', function () {
        it('create a remote document', function (done) {
          var document =
                  {
                    _id: 'doc-2',
                    field1: 'remote-doc',
                    _attachments:
                            {
                              myRemoteAttachment:
                                      {
                                        'content-type': 'text-plain',
                                        data: btoa('Remote attachment') // btoa only supports ASCII, not Unicode.
                                      }
                            }
                  };
          var status = RemoteDbUtils.createRemoteDocument(uri, document);
          // Check the create returned a 2xx status.
          expect(Math.floor(status / 100)).toBe(2);
          done();
        });

        it('create a conflicting local document', function (done) {
          var document =
                  {
                    _id: 'doc-2',
                    field1: 'local-doc',
                    _attachments:
                            {
                              myLocalAttachment:
                                      {
                                        content_type: 'text-plain',
                                        data: btoa('Local attachment') // bota only supports ASCII, not Unicode.
                                      }
                            }
                  };
          localStore1.createDocumentFromRevision(document)
                  .then(function () {
                    return createReplicators();
                  })
                  .then(function () {
                    return replicate(pullToStore1);
                  })
                  .fin(done);
        });

        it('check the conflicted doc ids contain only doc-2', function (done) {
          localStore1.getConflictedDocumentIds(function (error, docIds) {
            expect(error).toBe(null);
            checkConflictedDocIds({expected: ['doc-2'], actual: docIds});
            done();
          });
        });

        it('resolve the conflicts for doc-2 and merge attachments', function (done) {
          var conflictResolver = {
            resolver: function (docId, documentRevisions) {
              expect(docId).toBe('doc-2');
              expect(documentRevisions).not.toBe(null);
              expect(documentRevisions.length).toBe(2);
              for (var i = 0; i < documentRevisions.length; ++i) {
                var docRev = documentRevisions[i];
                if (docRev.field1 === 'remote-doc') {
                  // Add the attachment from the other conflicted revision
                  // to our resolved document so we retain both attachments.
                  var otherRev = documentRevisions[(i + 1) % 2];
                  docRev._attachments['myLocalAttachment'] = otherRev._attachments['myLocalAttachment'];
                  return docRev;
                }
              }
            }
          };

          spyOn(conflictResolver, 'resolver').and.callThrough();

          localStore1.resolveConflictsForDocument('doc-2', conflictResolver.resolver,
                  function (error) {
                    expect(error).toBe(null);
                    expect(conflictResolver.resolver).toHaveBeenCalled();
                    done();
                  });
        });

        it('check there are now no conflicted doc ids', function (done) {
          localStore1.getConflictedDocumentIds(function (error, docIds) {
            expect(error).toBe(null);
            checkConflictedDocIds({expected: [], actual: docIds});
            done();
          });
        });

        it('get the doc and check the resolved version is as expected', function (done) {
          localStore1.getDocument('doc-2', function (error, docRevision) {
            expect(error).toBe(null);
            expect(docRevision).not.toBe(null);
            expect(docRevision._id).toBeDefined();
            expect(docRevision._id).toBe('doc-2');
            expect(docRevision._rev).toBeDefined();
            expect(docRevision.field1).toBe('remote-doc');
            expect(docRevision._attachments).toBeDefined();
            expect(Object.keys(docRevision._attachments).length).toBe(2);
            expect(atob(docRevision._attachments['myRemoteAttachment'].data)).toBe('Remote attachment');
            expect(atob(docRevision._attachments['myLocalAttachment'].data)).toBe('Local attachment');
            done();
          });
        });

      }); // describe - Attachment conflicts
    }); // End-Callbacks-describe-block

    describe('Promises', function () {

      beforeAll(function (done) {
        createRemoteAndLocalDatastores().then(done);
      });

      afterAll(function (done) {
        deleteRemoteAndLocalDatastores().then(done);
      });


      var document1a = {
        _id: 'myId',
        foo1a: 'bar1a'
      };

      var objWithoutBody = {};

      describe('No conflicts', function () {
        it('check there no conflicted doc ids', function (done) {
          localStore1.getConflictedDocumentIds()
                  .then(function (docIds) {
                    checkConflictedDocIds({expected: [], actual: docIds});
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

        it('call resolveConflictsForDocument with no conflicts to resolve', function (done) {
          var conflictResolver = jasmine.createSpy();

          localStore1.resolveConflictsForDocument('myId', conflictResolver)
                  .then(function () {
                    expect(conflictResolver).not.toHaveBeenCalled();
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });
      }); // describe - No conflicts

      describe('Single conflict', function () {

        it('create a conflicted document', function (done) {
          createConflictedDocs(['myId']).then(done);
        });

        it('check the conflicted doc id', function (done) {
          localStore1.getConflictedDocumentIds()
                  .then(function (docIds) {
                    checkConflictedDocIds({expected: ['myId'], actual: docIds});
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

        it('return null from the conflictResolver', function (done) {
          var conflictResolver = {
            resolver: function (docId, documentRevisions) {
              return null;
            }
          };

          spyOn(conflictResolver, 'resolver').and.callThrough();

          localStore1.resolveConflictsForDocument('myId', conflictResolver.resolver)
                  .then(function () {
                    expect(conflictResolver.resolver).toHaveBeenCalled();
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

        it('check that returning null from the conflictResolver didn\'t resolve the conflict', function (done) {
          localStore1.getConflictedDocumentIds()
                  .then(function (docIds) {
                    checkConflictedDocIds({expected: ['myId'], actual: docIds});
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

        it('resolve the conflicts', function (done) {
          var conflictResolver = {
            resolver: function (docId, documentRevisions) {
              expect(docId).toBe('myId');
              expect(documentRevisions).not.toBe(null);
              expect(documentRevisions.length).toBe(2);
              var resolvedDoc = documentRevisions[0];
              resolvedDoc.fooResolved = 'barResolved';
              return resolvedDoc;
            }
          };

          spyOn(conflictResolver, 'resolver').and.callThrough();

          localStore1.resolveConflictsForDocument('myId', conflictResolver.resolver)
                  .then(function () {
                    expect(conflictResolver.resolver).toHaveBeenCalled();
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

        it('check there are now no conflicted doc ids', function (done) {
          localStore1.getConflictedDocumentIds()
                  .then(function (docIds) {
                    checkConflictedDocIds({expected: [], actual: docIds});
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

        it('get the doc and check the resolved version is as expected', function (done) {
          localStore1.getDocument('myId')
                  .then(function (docRevision) {
                    expect(docRevision).not.toBe(null);
                    expect(docRevision._id).toBeDefined();
                    expect(docRevision._id).toBe('myId');
                    expect(docRevision._rev).toBeDefined();
                    expect(docRevision.fooResolved).toBe('barResolved');

                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });
      }); // describe - Single conflict

      describe('Three conflicts', function () {

        it('create three conflicted documents', function (done) {
          createConflictedDocs(['doc1', 'doc2', 'doc3'])
                  .then(done);
        });

        it('check the conflicted doc ids', function (done) {
          localStore1.getConflictedDocumentIds()
                  .then(function (docIds) {
                    checkConflictedDocIds({expected: ['doc1', 'doc2', 'doc3'], actual: docIds});
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

        it('resolve the conflicts for doc1', function (done) {
          var conflictResolver = {
            resolver: function (docId, documentRevisions) {
              expect(docId).toBe('doc1');
              expect(documentRevisions).not.toBe(null);
              expect(documentRevisions.length).toBe(2);
              var resolvedDoc = {
                _id: docId,
                _rev: documentRevisions[0]._rev,
                fooResolved: 'barResolved'
              };
              return resolvedDoc;
            }
          };

          spyOn(conflictResolver, 'resolver').and.callThrough();

          localStore1.resolveConflictsForDocument('doc1', conflictResolver.resolver)
                  .then(function () {
                    expect(conflictResolver.resolver).toHaveBeenCalled();
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

        it('check the conflicted doc ids contain only doc2 and doc3', function (done) {
          localStore1.getConflictedDocumentIds()
                  .then(function (docIds) {
                    checkConflictedDocIds({expected: ['doc2', 'doc3'], actual: docIds});
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

        it('resolve the conflicts for doc2', function (done) {
          var conflictResolver = {
            resolver: function (docId, documentRevisions) {
              expect(docId).toBe('doc2');
              expect(documentRevisions).not.toBe(null);
              expect(documentRevisions.length).toBe(2);
              var resolvedDoc = {
                _id: docId,
                _rev: documentRevisions[0]._rev,
                fooResolved: 'barResolved'
              };
              return resolvedDoc;
            }
          };

          spyOn(conflictResolver, 'resolver').and.callThrough();

          localStore1.resolveConflictsForDocument('doc2', conflictResolver.resolver)
                  .then(function () {
                    expect(conflictResolver.resolver).toHaveBeenCalled();
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

        it('check the conflicted doc ids contain only doc3', function (done) {
          localStore1.getConflictedDocumentIds()
                  .then(function (docIds) {
                    checkConflictedDocIds({expected: ['doc3'], actual: docIds});
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

        it('resolve the conflicts for doc3', function (done) {
          var conflictResolver = {
            resolver: function (docId, documentRevisions) {
              expect(docId).toBe('doc3');
              expect(documentRevisions).not.toBe(null);
              expect(documentRevisions.length).toBe(2);
              var resolvedDoc = {
                _id: docId,
                _rev: documentRevisions[0]._rev,
                fooResolved: 'barResolved'
              };
              return resolvedDoc;
            }};

          spyOn(conflictResolver, 'resolver').and.callThrough();

          localStore1.resolveConflictsForDocument('doc3', conflictResolver.resolver)
                  .then(function () {
                    expect(conflictResolver.resolver).toHaveBeenCalled();
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

        it('check there are now no conflicted doc ids', function (done) {
          localStore1.getConflictedDocumentIds()
                  .then(function (docIds) {
                    checkConflictedDocIds({expected: [], actual: docIds});
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

      }); // describe - Three conflicts

      describe('Attachment conflicts resolve in favour of local', function () {
        it('create a remote document', function (done) {
          var document =
                  {
                    _id: 'doc-1',
                    field1: 'remote-doc',
                    _attachments:
                            {
                              myRemoteAttachment:
                                      {
                                        'content-type': 'text-plain',
                                        data: btoa('Remote attachment') // btoa only supports ASCII, not Unicode.
                                      }
                            }
                  };
          var status = RemoteDbUtils.createRemoteDocument(uri, document);
          // Check the create returned a 2xx status.
          expect(Math.floor(status / 100)).toBe(2);
          done();
        });

        it('create a conflicting local document', function (done) {
          var document =
                  {
                    _id: 'doc-1',
                    field1: 'local-doc',
                    _attachments:
                            {
                              myLocalAttachment:
                                      {
                                        content_type: 'text-plain',
                                        data: btoa('Local attachment') // bota only supports ASCII, not Unicode.
                                      }
                            }
                  };
          localStore1.createDocumentFromRevision(document)
                  .then(function () {
                    return createReplicators();
                  })
                  .then(function () {
                    return replicate(pullToStore1);
                  })
                  .fin(done);
        });

        it('check the conflicted doc ids contain only doc-1', function (done) {
          localStore1.getConflictedDocumentIds()
                  .then(function (docIds) {
                    checkConflictedDocIds({expected: ['doc-1'], actual: docIds});
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

        it('resolve the conflicts for doc-1', function (done) {
          var conflictResolver = {
            resolver: function (docId, documentRevisions) {
              expect(docId).toBe('doc-1');
              expect(documentRevisions).not.toBe(null);
              expect(documentRevisions.length).toBe(2);
              for (var i = 0; i < documentRevisions.length; ++i) {
                var docRev = documentRevisions[i];
                if (docRev.field1 === 'local-doc') {
                  return docRev;
                }
              }
            }
          };

          spyOn(conflictResolver, 'resolver').and.callThrough();

          localStore1.resolveConflictsForDocument('doc-1', conflictResolver.resolver)
                  .then(function () {
                    expect(conflictResolver.resolver).toHaveBeenCalled();
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

        it('check there are now no conflicted doc ids', function (done) {
          localStore1.getConflictedDocumentIds()
                  .then(function (docIds) {
                    checkConflictedDocIds({expected: [], actual: docIds});
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

        it('get the doc and check the resolved version is as expected', function (done) {
          localStore1.getDocument('doc-1')
                  .then(function (docRevision) {
                    expect(docRevision).not.toBe(null);
                    expect(docRevision._id).toBeDefined();
                    expect(docRevision._id).toBe('doc-1');
                    expect(docRevision._rev).toBeDefined();
                    expect(docRevision.field1).toBe('local-doc');
                    expect(docRevision._attachments).toBeDefined();
                    expect(Object.keys(docRevision._attachments).length).toBe(1);
                    expect(atob(docRevision._attachments['myLocalAttachment'].data)).toBe('Local attachment');
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

      }); // describe - Attachment conflicts

      describe('Attachment conflicts resolve in favour of remote and merge attachments', function () {
        it('create a remote document', function (done) {
          var document =
                  {
                    _id: 'doc-2',
                    field1: 'remote-doc',
                    _attachments:
                            {
                              myRemoteAttachment:
                                      {
                                        'content-type': 'text-plain',
                                        data: btoa('Remote attachment') // btoa only supports ASCII, not Unicode.
                                      }
                            }
                  };
          var status = RemoteDbUtils.createRemoteDocument(uri, document);
          // Check the create returned a 2xx status.
          expect(Math.floor(status / 100)).toBe(2);
          done();
        });

        it('create a conflicting local document', function (done) {
          var document =
                  {
                    _id: 'doc-2',
                    field1: 'local-doc',
                    _attachments:
                            {
                              myLocalAttachment:
                                      {
                                        content_type: 'text-plain',
                                        data: btoa('Local attachment') // bota only supports ASCII, not Unicode.
                                      }
                            }
                  };
          localStore1.createDocumentFromRevision(document)
                  .then(function () {
                    return createReplicators();
                  })
                  .then(function () {
                    return replicate(pullToStore1);
                  })
                  .fin(done);
        });

        it('check the conflicted doc ids contain only doc-2', function (done) {
          localStore1.getConflictedDocumentIds()
                  .then(function (docIds) {
                    checkConflictedDocIds({expected: ['doc-2'], actual: docIds});
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

        it('resolve the conflicts for doc-2 and merge attachments', function (done) {
          var conflictResolver = {
            resolver: function (docId, documentRevisions) {
              expect(docId).toBe('doc-2');
              expect(documentRevisions).not.toBe(null);
              expect(documentRevisions.length).toBe(2);
              for (var i = 0; i < documentRevisions.length; ++i) {
                var docRev = documentRevisions[i];
                if (docRev.field1 === 'remote-doc') {
                  // Add the attachment from the other conflicted revision
                  // to our resolved document so we retain both attachments.
                  var otherRev = documentRevisions[(i + 1) % 2];
                  docRev._attachments['myLocalAttachment'] = otherRev._attachments['myLocalAttachment'];
                  return docRev;
                }
              }
            }
          };

          spyOn(conflictResolver, 'resolver').and.callThrough();

          localStore1.resolveConflictsForDocument('doc-2', conflictResolver.resolver)
                  .then(function () {
                    expect(conflictResolver.resolver).toHaveBeenCalled();
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

        it('check there are now no conflicted doc ids', function (done) {
          localStore1.getConflictedDocumentIds()
                  .then(function (docIds) {
                    checkConflictedDocIds({expected: [], actual: docIds});
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

        it('get the doc and check the resolved version is as expected', function (done) {
          localStore1.getDocument('doc-2')
                  .then(function (docRevision) {
                    expect(docRevision).not.toBe(null);
                    expect(docRevision._id).toBeDefined();
                    expect(docRevision._id).toBe('doc-2');
                    expect(docRevision._rev).toBeDefined();
                    expect(docRevision.field1).toBe('remote-doc');
                    expect(docRevision._attachments).toBeDefined();
                    expect(Object.keys(docRevision._attachments).length).toBe(2);
                    expect(atob(docRevision._attachments['myRemoteAttachment'].data)).toBe('Remote attachment');
                    expect(atob(docRevision._attachments['myLocalAttachment'].data)).toBe('Local attachment');
                  })
                  .catch(function (error) {
                    expect(error).toBe(null);
                  })
                  .fin(done);
        });

      }); // describe - Attachment conflicts

    }); // End-Promises-describe-block
  });
};

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

var DatastoreManager = require('cloudant-sync.DatastoreManager').DatastoreManager;
var DBName = 'cruddb';
exports.defineAutoTests = function() {
  describe('Datastore', function() {

    var manager;
    var localStore = null;
    var storeName = null;

    beforeAll(function createManager(done) {
      DatastoreManager().then(function(m) {
        manager = m;
        done();
      });
    });

    afterEach(function deleteDatastore(done) {
      manager.deleteDatastore(DBName)
        .catch(function(error) {
          console.error(error);
        })
        .fin(done);
    });

    beforeEach(function createDatastores(done) {
      manager.openDatastore(DBName)
        .then(function(newLocalStore) {
          localStore = newLocalStore;
        })
        .catch(function(error) {
          console.error(error);
        }).fin(done);
    });

    function getDatastore( datastoreDescription ) {
      return localStore;
    }

    beforeEach(function(done) {
          if (!localStore) {
            DatastoreManager.deleteDatastore(DBName)
                .then(function() {
                  return DatastoreManager.openDatastore(DBName);
                })
                .then(function(newLocalStore) {
                  localStore = newLocalStore;
                })
                .catch(function(error) {
                  console.error(error);
                })
                .fin(done);
          } else {
            done();
          }
        });

    function testCRUD(datastoreDescription) {

      describe('CRUD (' + datastoreDescription + ')', function() {

        it('.createDocumentFromRevision exists', function() {
          var datastore = getDatastore(datastoreDescription);
          expect(datastore).not.toBe(null);
          expect(datastore.createDocumentFromRevision).toBeDefined();
        });

        it('.updateDocumentFromRevision exists', function() {
          var datastore = getDatastore(datastoreDescription);
          expect(datastore).not.toBe(null);
          expect(datastore.updateDocumentFromRevision).toBeDefined();
        });

        it('.getDocument exists', function() {
          var datastore = getDatastore(datastoreDescription);
          expect(datastore).not.toBe(null);
          expect(datastore.getDocument).toBeDefined();
        });

        it('.deleteDocumentFromRevision exists', function() {
          var datastore = getDatastore(datastoreDescription);
          expect(datastore).not.toBe(null);
          expect(datastore.deleteDocumentFromRevision).toBeDefined();
        });

        describe('Callbacks', function() {
          var employee = {
            firstName: 'Todd',
            lastName: 'Kaplinger',
            numberOne: 1,
            numberFive: 5,
            assignments: ['zero', 'one'],
            cv: {education: 'Masters', skills: ['javascript', 'java']}
          };

          var objWithoutBody = {};

          it('creates a document revision', function(done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            datastore.createDocumentFromRevision(employee, function(error, docRevision) {
              expect(error).toBe(null);
              expect(docRevision).not.toBe(null);
              expect(docRevision._id).toBeDefined();
              expect(docRevision._rev).toBeDefined();
              expect(docRevision.firstName).toBe(employee.firstName);
              expect(docRevision.lastName).toBe(employee.lastName);
              done();
            }); //End-datastore-createDocumentFromRevision
          });

          it('updates a document revision', function(done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            datastore.createDocumentFromRevision(employee, function(error, docRevision) {
              expect(error).toBe(null);
              expect(docRevision).not.toBe(null);
              expect(docRevision._id).toBeDefined();
              expect(docRevision._rev).toBeDefined();
              expect(docRevision.firstName).toBe(employee.firstName);
              expect(docRevision.lastName).toBe(employee.lastName);

              // Update
              var newFirstName = 'Steve';
              docRevision.firstName = newFirstName;

              datastore.updateDocumentFromRevision(docRevision, function(error,
                  updatedRevision) {
                expect(error).toBe(null);
                expect(updatedRevision).not.toBe(
                    null);
                expect(updatedRevision._id).toBeDefined();
                expect(updatedRevision._rev).toBeDefined();
                expect(updatedRevision.firstName)
                    .toBe(newFirstName);
                done();
              }); //End-update
            }); //End-datastore-createDocumentFromRevision
          });

          it('finds a document revision by docId', function(done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            // Create
            datastore.createDocumentFromRevision(employee, function(error, docRevision) {
              expect(error).toBe(null);
              expect(docRevision).not.toBe(null);
              expect(docRevision._id).toBeDefined();
              expect(docRevision._rev).toBeDefined();
              expect(docRevision.firstName).toBe(employee.firstName);

              // GetDocument
              datastore.getDocument(docRevision._id, function(
                  error, fetchedRevision) {
                expect(error).toBe(null);
                expect(fetchedRevision).not.toBe(
                    null);
                expect(fetchedRevision._id).toBeDefined();
                expect(fetchedRevision._rev).toBeDefined();
                expect(fetchedRevision.firstName)
                    .toBe(employee.firstName);
                done();
              }); //End-getDocument
            }); //End-create
          });

          it('finds a document revision by docId (nested)', function(done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            // Create
            datastore.createDocumentFromRevision(employee, function(error, docRevision) {
              expect(error).toBe(null);
              expect(docRevision).not.toBe(null);
              expect(docRevision._id).toBeDefined();
              expect(docRevision._rev).toBeDefined();
              expect(docRevision.firstName).toBe(employee.firstName);
              expect(docRevision.assignments[0]).toBe(employee.assignments[0]);
              expect(docRevision.assignments[1]).toBe(employee.assignments[1]);
              expect(docRevision.cv.education).toBe(employee.cv.education);
              expect(docRevision.cv.skills[0]).toBe(employee.cv.skills[0]);

              // GetDocument
              datastore.getDocument(docRevision._id, function(
                  error, fetchedRevision) {
                expect(error).toBe(null);
                expect(fetchedRevision).not.toBe(
                    null);
                expect(fetchedRevision._id).toBeDefined();
                expect(fetchedRevision._rev).toBeDefined();
                expect(fetchedRevision.firstName)
                    .toBe(employee.firstName);
                expect(fetchedRevision.assignments[0])
                    .toBe(employee.assignments[0]);
                expect(fetchedRevision.assignments[1])
                    .toBe(employee.assignments[1]);
                expect(fetchedRevision.cv.education)
                    .toBe(employee.cv.education);
                expect(fetchedRevision.cv.skills[0])
                    .toBe(employee.cv.skills[0]);
                done();
              }); //End-getDocument
            }); //End-create
          });

          it('deletes a document revision', function(done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            // Create
            datastore.createDocumentFromRevision(employee, function(error, docRevision) {
              expect(error).toBe(null);
              expect(docRevision).not.toBe(null);
              expect(docRevision._id).toBeDefined();
              expect(docRevision._rev).toBeDefined();
              expect(docRevision.firstName).toBe(employee.firstName);

              // DeleteDocumentFromRevision
              datastore.deleteDocumentFromRevision(docRevision, function(error,
                  result) {
                expect(error).toBe(null);
                expect(result).not.toBe(null);
                expect(result._id).toBe(
                    docRevision._id);
                expect(result._rev).not.toBe(
                    docRevision._rev);
                expect(result._deleted).toBe(
                    true);
                done();
              }); //End-deleteDocumentFromRevision
            }); //End-create
          });

          // Negative tests
          it('returns error if doc revision is null', function(done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            // Datastore-updateDocumentFromRevision
            try {
              datastore.createDocumentFromRevision(null);
              expect(true).toBe(false);
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            } //End-datastore-updateDocumentFromRevision
          });

          it('returns error if doc revision is wrong datatype', function(
              done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            // Datastore-updateDocumentFromRevision
            try {
              datastore.createDocumentFromRevision([ 'foo' ]);
              expect(true).toBe(false);
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            } //End-datastore-updateDocumentFromRevision
          });

          it('createDocumentFromRevision without body is valid', function(done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            // Datastore-updateDocumentFromRevision
            datastore.createDocumentFromRevision(objWithoutBody, function(error, docRevision) {
              expect(error).toBe(null);
              expect(docRevision).not.toBe(null);
              done();
            }); //End-datastore-updateDocumentFromRevision
          });

          it('returns error if only rev field set', function(done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            employee._rev = 'some-revision';

            // Datastore-updateDocumentFromRevision
            try {
              datastore.updateDocumentFromRevision(employee, function(error, docRevision) {
                expect(true).toBe(false);
              });
              expect(true).toBe(false);
            } catch (e) {
              expect(e).not.toBe(null);
              done();
            }
            //End-datastore-updateDocumentFromRevision
          });

          it('returns error fetching a null document revision ID', function(
              done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            try {
              datastore.getDocument(null);
              expect(true).toBe(false);
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('returns error fetching a wrong datatype document revision ID',
                        function(done) {
                          var datastore = getDatastore(datastoreDescription);
                          expect(datastore).not.toBe(null);

                          try {
                            datastore.getDocument([ 'foo' ]);
                            expect(true).toBe(false);
                          } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                          }
                        });

          it('returns error fetching a non-exist document revision ID', function(
              done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            var badRevId = 'bad-revision-id';

            // GetDocument
            datastore.getDocument(badRevId, function(error, fetchedRevision) {
              expect(error).not.toBe(null);
              expect(fetchedRevision).not.toBeDefined();
              done();
            }); //End-getDocument
          });

          it('returns error deleting a null document revision', function(done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            try {
              datastore.deleteDocumentFromRevision(null);
              expect(true).toBe(false);
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('returns error deleting a wrong datatype document revision',
                        function(done) {
                          var datastore = getDatastore(datastoreDescription);
                          expect(datastore).not.toBe(null);

                          try {
                            datastore.deleteDocumentFromRevision([ 'foo' ]);
                            expect(true).toBe(false);
                          } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                          }
                        });

          it('returns error deleting a invalid document revision', function(
              done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            employee._rev = 'bad-revision-id';

            // DeleteDocumentFromRevision
            datastore.deleteDocumentFromRevision(employee, function(error, fetchedRevision) {
              expect(error).not.toBe(null);
              expect(fetchedRevision).not.toBeDefined();
              done();
            }); //End-deleteDocumentFromRevision
          });
        }); // End-Callbacks-describe-block

        describe('Promises', function() {
          var employee = {
            firstName: 'Todd',
            lastName: 'Kaplinger',
            numberOne: 1,
            numberFive: 5,
          };
          var objWithoutBody = {
            someParam: 'nobody',
          };

          it('creates a document revision', function(done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            datastore.createDocumentFromRevision(employee)
                            .then(function(docRevision) {
                              expect(docRevision).not.toBe(null);
                              expect(docRevision._id).toBeDefined();
                              expect(docRevision._rev).toBeDefined();
                              expect(docRevision.firstName).toBe(employee.firstName);
                              expect(docRevision.lastName).toBe(employee.lastName);
                            })
                            .catch(function(error) {
                              expect(error).toBe(null);
                            })
                            .fin(done);
          });


          it('updates a document revision', function(done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            // Update
            var newFirstName = 'Steve';

            datastore.createDocumentFromRevision(employee)
                            .then(function(docRevision) {
                              expect(docRevision).not.toBe(null);
                              expect(docRevision._id).toBeDefined();
                              expect(docRevision._rev).toBeDefined();
                              expect(docRevision.firstName).toBe(employee.firstName);
                              expect(docRevision.lastName).toBe(employee.lastName);

                              docRevision.firstName = newFirstName;

                              return datastore.updateDocumentFromRevision(docRevision);
                            })
                            .then(function(updatedRevision) {
                              expect(updatedRevision).not.toBe(null);
                              expect(updatedRevision._id).toBeDefined();
                              expect(updatedRevision._rev).toBeDefined();
                              expect(updatedRevision.firstName).toBe(
                                  newFirstName);
                            })
                            .catch(function(error) {
                              expect(error).toBe(null);
                            })
                            .fin(done);
          });

          it('finds a document revision by docId', function(done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            // Create
            datastore.createDocumentFromRevision(employee)
                            .then(function(docRevision) {
                              expect(docRevision).not.toBe(null);
                              expect(docRevision._id).toBeDefined();
                              expect(docRevision._rev).toBeDefined();
                              expect(docRevision.firstName).toBe(employee.firstName);

                              // GetDocument
                              return datastore.getDocument(docRevision._id);
                            })
                            .then(function(fetchedRevision) {
                              expect(fetchedRevision).not.toBe(null);
                              expect(fetchedRevision._id).toBeDefined();
                              expect(fetchedRevision._rev).toBeDefined();
                              expect(fetchedRevision.firstName).toBe(
                                  employee.firstName);
                            })
                            .catch(function(error) {
                              expect(error).toBe(null);
                            })
                            .fin(done);
          });

          it('deletes a document revision', function(done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            // Create
            datastore.createDocumentFromRevision(employee)
                            .then(function(docRevision) {
                              expect(docRevision).not.toBe(null);
                              expect(docRevision._id).toBeDefined();
                              expect(docRevision._rev).toBeDefined();
                              expect(docRevision.firstName).toBe(employee.firstName);

                              // DeleteDocumentFromRevision
                              return datastore.deleteDocumentFromRevision(docRevision);
                            })
                            .then(function(result) {
                              expect(result).not.toBe(null);
                              expect(result._id).toBe(docRevision._id);
                              expect(result._rev).not.toBe(docRevision._rev);
                              expect(result._deleted).toBe(true);
                            })
                            .catch(function(error) {
                              expect(error).not.toBe(null);
                            })
                            .fin(done);
          });

          // Negative tests
          it('returns error if doc revision is null', function(done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            try {
              datastore.createDocumentFromRevision(null)
                                .then(function(docRevision) {
                                  expect(true).toBe(false);
                                })
                                .catch(function(error) {
                                  expect(true).toBe(false);
                                });
              expect(true).toBe(false);
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('returns error if doc revision is wrong datatype', function(
              done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            try {
              datastore.createDocumentFromRevision([ 'foo' ])
                                .then(function(docRevision) {
                                  expect(true).toBe(false);
                                })
                                .catch(function(error) {
                                  expect(true).toBe(false);
                                });
              expect(true).toBe(false);
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('createDocumentFromRevision without body is valid', function(done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            // Datastore-updateDocumentFromRevision
            datastore.createDocumentFromRevision(objWithoutBody)
                            .then(function(docRevision) {
                              expect(true).toBe(true);
                            })
                            .catch(function(error) {
                              expect(error).toBe(null);
                            })
                            .fin(done);
          });

          it('returns updateDocumentFromRevision error if only rev field set', function(done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            employee._rev = 'some-revision';

            // Datastore-updateDocumentFromRevision
            try {
              datastore.updateDocumentFromRevision(employee)
                                .catch(function(error) {
                                  expect(true).toBe(false);
                                });
              expect(true).toBe(false);
              done();
            } catch (e) {
              expect(e).not.toBe(null);
              done();
            }
          });

          it('returns error fetching if datatype incorrect', function(done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            try {
              datastore.getDocument([ 'foo' ])
                                .then(function(docRevision) {
                                  expect(true).toBe(false);
                                })
                                .catch(function(error) {
                                  expect(true).toBe(false);
                                });
              expect(true).toBe(false);
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('returns error fetching a null document revision ID', function(
              done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            try {
              datastore.getDocument(null)
                                .then(function(docRevision) {
                                  expect(true).toBe(false);
                                })
                                .catch(function(error) {
                                  expect(true).toBe(false);
                                });
              expect(true).toBe(false);
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('returns error fetching a non-exist document revision ID', function(
              done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            var badRevId = 'bad-revision-id';

            // GetDocument
            datastore.getDocument(badRevId)
                            .then(function(fetchedRevision) {
                              expect(true).toBe(false);
                            })
                            .catch(function(error) {
                              expect(error).not.toBe(null);
                            })
                            .fin(done); //End-getDocument
          });

          it('returns error deleting a null document revision', function(done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            try {
              datastore.deleteDocumentFromRevision(null)
                                .then(function(result) {
                                  expect(true).toBe(false);
                                })
                                .catch(function(error) {
                                  expect(true).toBe(false);
                                });
              expect(true).toBe(false);
              done();
            } catch (error) {
              expect(error).not.toBe(null);
              done();
            }
          });

          it('returns error deleting a document revision with wrong datatype',
                        function(done) {
                          var datastore = getDatastore(datastoreDescription);
                          expect(datastore).not.toBe(null);

                          try {
                            datastore.deleteDocumentFromRevision([ 'foo' ])
                                    .then(function(result) {
                                      expect(true).toBe(false);
                                    })
                                    .catch(function(error) {
                                      expect(true).toBe(false);
                                    });
                            expect(true).toBe(false);
                            done();
                          } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                          }
                        });

          it('returns error deleting a invalid document revision', function(
              done) {
            var datastore = getDatastore(datastoreDescription);
            expect(datastore).not.toBe(null);

            employee._rev = 'bad-revision-id';

            // DeleteDocumentFromRevision
            datastore.deleteDocumentFromRevision(employee)
                            .then(function(fetchedRevision) {
                              expect(true).toBe(false);
                            })
                            .catch(function(error) {
                              expect(error).not.toBe(null);
                            })
                            .fin(done);
          });
        }); // End-Promises-describe-block
      });
    }

    testCRUD('local');
  });
};

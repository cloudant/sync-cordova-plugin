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

var DatastoreManager = require( 'cloudant-sync.DatastoreManager' );
var Q = require('cloudant-sync.q');

var DBName = "cruddb";
var EncryptedDBName = DBName + "secure";

exports.defineAutoTests = function() {
    describe('Datastore', function() {

        var validEncryptionOptions = {
            password: 'passw0rd',
            identifier: 'toolkit'
        };

        var encryptedStore = null;
        var localStore = null;

        var storeName = null;
        var encryptedStoreName = null;

        var todd_image = "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";

        var dillon_image = "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";

        beforeEach( function( done ) {
          if (!localStore || !encryptedStore) {
            DatastoreManager.deleteDatastore( DBName )
                .then( function() {
                    return DatastoreManager.deleteDatastore( EncryptedDBName );
                } )
                .then( function() {
                    return DatastoreManager.openDatastore( DBName );
                } )
                .then( function(newLocalStore) {
                  localStore = newLocalStore;
                    return DatastoreManager.openDatastore( EncryptedDBName, validEncryptionOptions );
                } )
                .then(function(newEncryptedLocalStore){
                  encryptedStore = newEncryptedLocalStore;
                })
                .catch( function( error ) {
                    console.error( error );
                } )
                .fin( done );
              } else {
                done();
              }
        });

        function testCRUD(storeDescription) {
            describe('CRUD with Attachments (' + storeDescription + ')', function() {

                describe('Callbacks', function() {
                    var toddEmployee = {
                        "firstName": "Todd",
                        "age": 50,
                        "ageAdjustment": 10,
                        "_attachments": {
                            "face": {
                                "contentType": "image/jpeg",
                                "data": todd_image
                            }
                        }
                    };

                    it("creates a document revision", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        datastore.createDocumentFromRevision(toddEmployee, function(error, docRevision) {
                            expect(error).toBe(null);
                            expect(docRevision).not.toBe(null);
                            expect(docRevision._id).toBeDefined();
                            expect(docRevision._rev).toBeDefined();
                            expect(docRevision.firstName).toBe(toddEmployee.firstName);
                            expect(docRevision._attachments).toBeDefined();
                            expect(docRevision._attachments.face).toBeDefined();
                            expect(docRevision._attachments.face.data).toBe(todd_image);
                            done();
                        }); //end-datastore-save
                    });

                    it("updates a document revision", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        datastore.createDocumentFromRevision(toddEmployee, function(error, docRevision) {
                            expect(error).toBe(null);
                            expect(docRevision).not.toBe(null);
                            expect(docRevision._id).toBeDefined();
                            expect(docRevision._rev).toBeDefined();
                            expect(docRevision.firstName).toBe(toddEmployee.firstName);
                            expect(docRevision._attachments).toBeDefined();
                            expect(docRevision._attachments.face).toBeDefined();
                            expect(docRevision._attachments.face.data).toBe(todd_image);

                            // update
                            var newFirstName = "Steve";
                            docRevision.firstName = newFirstName;
                            docRevision._attachments.face.data = dillon_image;

                            datastore.updateDocumentFromRevision(docRevision, function(error, updatedRevision) {
                                expect(error).toBe(null);
                                expect(updatedRevision).not.toBe(null);
                                expect(updatedRevision._id).toBeDefined();
                                expect(updatedRevision._rev).toBeDefined();
                                expect(updatedRevision.firstName).toBe(newFirstName);
                                expect(updatedRevision._attachments).toBeDefined();
                                expect(updatedRevision._attachments.face).toBeDefined();
                                expect(updatedRevision._attachments.face.data).toBe(dillon_image);
                                done();
                            }); //end-update
                        }); //end-datastore-save
                    });

                    it('removes one attachment from an existing document revision', function(done){
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        var toddMinion = {
                            firstName: "Dillon",
                            age: 28,
                            ageAdjustment: 12,
                            _attachments: {
                                face: {
                                    "contentType": "image/jpeg",
                                    "data": dillon_image
                                },
                                idolFace: {
                                    "contentType": "image/jpeg",
                                    "data": todd_image
                                }
                            }
                        };

                        datastore.createDocumentFromRevision(toddMinion, function(error, docRevision) {
                            expect(error).toBe(null);
                            expect(docRevision).not.toBe(null);
                            expect(docRevision._id).toBeDefined();
                            expect(docRevision._rev).toBeDefined();
                            expect(docRevision.firstName).toBe(toddMinion.firstName);
                            expect(docRevision._attachments).toBeDefined();
                            expect(docRevision._attachments.face).toBeDefined();
                            expect(docRevision._attachments.face.data).toBe(dillon_image);
                            expect(docRevision._attachments.idolFace).toBeDefined();
                            expect(docRevision._attachments.idolFace.data).toBe(todd_image);

                            // remove idolFace attachment
                            delete docRevision._attachments.idolFace;

                            datastore.updateDocumentFromRevision(docRevision, function(error, updatedRevision) {
                                expect(error).toBe(null);
                                expect(updatedRevision).not.toBe(null);
                                expect(updatedRevision._id).toBeDefined();
                                expect(updatedRevision._rev).toBeDefined();
                                expect(updatedRevision._attachments).toBeDefined();
                                expect(updatedRevision._attachments.face).toBeDefined();
                                expect(updatedRevision._attachments.face.data).toBe(dillon_image);
                                expect(updatedRevision._attachments.idolFace).not.toBeDefined();
                                done();
                            }); //end-update
                        }); //end-datastore-save
                    });

                    it('removes all attachments from an existing document revision', function(done){
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        var toddMinion = {
                            firstName: "Dillon",
                            age: 28,
                            ageAdjustment: 12,
                            _attachments: {
                                face: {
                                    "contentType": "image/jpeg",
                                    "data": dillon_image
                                },
                                idolFace: {
                                    "contentType": "image/jpeg",
                                    "data": todd_image
                                }
                            }
                        };

                        datastore.createDocumentFromRevision(toddMinion, function(error, docRevision) {
                            expect(error).toBe(null);
                            expect(docRevision).not.toBe(null);
                            expect(docRevision._id).toBeDefined();
                            expect(docRevision._rev).toBeDefined();
                            expect(docRevision.firstName).toBe(toddMinion.firstName);
                            expect(docRevision._attachments).toBeDefined();
                            expect(docRevision._attachments.face).toBeDefined();
                            expect(docRevision._attachments.face.data).toBe(dillon_image);
                            expect(docRevision._attachments.idolFace).toBeDefined();
                            expect(docRevision._attachments.idolFace.data).toBe(todd_image);

                            // remove _attachments
                            delete docRevision._attachments;

                            datastore.updateDocumentFromRevision(docRevision, function(error, updatedRevision) {
                                expect(error).toBe(null);
                                expect(updatedRevision).not.toBe(null);
                                expect(updatedRevision._id).toBeDefined();
                                expect(updatedRevision._rev).toBeDefined();
                                expect(updatedRevision._attachments).not.toBeDefined();
                                done();
                            }); //end-update
                        }); //end-datastore-save
                    });

                    it("fetches a document revision by docId", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        // save
                        datastore.createDocumentFromRevision(toddEmployee, function(error, docRevision) {
                            expect(error).toBe(null);
                            expect(docRevision).not.toBe(null);
                            expect(docRevision._id).toBeDefined();
                            expect(docRevision._rev).toBeDefined();
                            expect(docRevision.firstName).toBe(toddEmployee.firstName);
                            expect(docRevision._attachments).toBeDefined();
                            expect(docRevision._attachments.face).toBeDefined();
                            expect(docRevision._attachments.face.data).toBe(todd_image);

                            // getDocument
                            datastore.getDocument(docRevision._id, function(error, fetchedRevision) {
                                expect(error).toBe(null);
                                expect(fetchedRevision).not.toBe(null);
                                expect(fetchedRevision._id).toBeDefined();
                                expect(fetchedRevision._rev).toBeDefined();
                                expect(fetchedRevision.firstName).toBe(toddEmployee.firstName);
                                expect(fetchedRevision._attachments).toBeDefined();
                                expect(fetchedRevision._attachments.face).toBeDefined();
                                expect(fetchedRevision._attachments.face.data).toBe(todd_image);
                                done();
                            }); //end-getDocument
                        }); //end-save
                    });

                    it("deletes a document revision", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        // save
                        datastore.createDocumentFromRevision(toddEmployee, function(error, docRevision) {
                            expect(error).toBe(null);
                            expect(docRevision).not.toBe(null);
                            expect(docRevision._id).toBeDefined();
                            expect(docRevision._rev).toBeDefined();
                            expect(docRevision.firstName).toBe(toddEmployee.firstName);
                            expect(docRevision._attachments).toBeDefined();
                            expect(docRevision._attachments.face).toBeDefined();
                            expect(docRevision._attachments.face.data).toBe(todd_image);

                            // deleteDocumentFromRevision
                            datastore.deleteDocumentFromRevision(docRevision, function(error, result) {
                                expect(error).toBe(null);
                                expect(result).not.toBe(null);
                                done();
                            }); //end-deleteDocumentFromRevision
                        }); //end-save
                    });

                    describe('Negative Tests', function() {
                        var toddRedefined = {
                            "firstName": "Todd",
                            "age": 30,
                            "_attachments": {
                                "face": {
                                    "contentType": "image/jpeg",
                                    "data": todd_image
                                }
                            }
                        };


                        it("empty _attachments", function(done) {
                            var datastore = getDatastore(storeDescription);
                            expect(datastore).not.toBe(null);
                            var badAttachments = {};

                            toddRedefined._attachments = badAttachments;
                            try {
                                datastore.save(toddRedefined);
                                expect(true).toBe(false);
                                done();
                            } catch (error) {
                                expect(error).not.toBe(null);
                                done();
                            }
                        });

                        it("empty face attachment", function(done) {
                            var datastore = getDatastore(storeDescription);
                            expect(datastore).not.toBe(null);
                            var badAttachments = {
                                "face": {}
                            };

                            toddRedefined._attachments = badAttachments;
                            try {
                                datastore.save(toddRedefined);
                                expect(true).toBe(false);
                                done();
                            } catch (error) {
                                expect(error).not.toBe(null);
                                done();
                            }
                        });

                        it("missing contentType", function(done) {
                            var datastore = getDatastore(storeDescription);
                            expect(datastore).not.toBe(null);
                            var badAttachments = {
                                "face": {
                                    "data": todd_image
                                }
                            };

                            toddRedefined._attachments = badAttachments;
                            try {
                                datastore.save(toddRedefined);
                                expect(true).toBe(false);
                                done();
                            } catch (error) {
                                expect(error).not.toBe(null);
                                done();
                            }
                            //end-datastore-save
                        });

                        it("missing data", function(done) {
                            var datastore = getDatastore(storeDescription);
                            expect(datastore).not.toBe(null);
                            var badAttachments = {
                                "face": {
                                    "contentType": "image/jpeg"
                                }
                            };

                            toddRedefined._attachments = badAttachments;
                            try {
                                datastore.save(toddRedefined);
                                expect(true).toBe(false);
                                done();
                            } catch (error) {
                                expect(error).not.toBe(null);
                                done();
                            }
                            //end-datastore-save
                        });

                    }); // end negative tests

                }); // end-Callbacks-describe-block

                describe('Promises', function() {
                    var toddEmployee = {
                        "firstName": "Todd",
                        "age": 50,
                        "ageAdjustment": 10,
                        "_attachments": {
                            "face": {
                                "contentType": "image/jpeg",
                                "data": todd_image
                            }
                        }
                    };

                    it("creates a document revision", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        datastore.createDocumentFromRevision(toddEmployee)
                            .then(function(docRevision) {
                                expect(docRevision).not.toBe(null);
                                expect(docRevision._id).toBeDefined();
                                expect(docRevision._rev).toBeDefined();
                                expect(docRevision.firstName).toBe(toddEmployee.firstName);
                                expect(docRevision._attachments).toBeDefined();
                                expect(docRevision._attachments.face).toBeDefined();
                                expect(docRevision._attachments.face.data).toBe(todd_image);
                            })
                            .catch(function(error) {
                                expect(error).toBe(null);
                            })
                            .fin(done);
                    });


                    it("updates a saved document revision", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        // update
                        var newFirstName = "Steve";

                        datastore.createDocumentFromRevision(toddEmployee)
                            .then(function(docRevision) {
                                expect(docRevision).not.toBe(null);
                                expect(docRevision._id).toBeDefined();
                                expect(docRevision._rev).toBeDefined();
                                expect(docRevision.firstName).toBe(toddEmployee.firstName);
                                expect(docRevision._attachments).toBeDefined();
                                expect(docRevision._attachments.face).toBeDefined();
                                expect(docRevision._attachments.face.data).toBe(todd_image);

                                docRevision.firstName = newFirstName;
                                docRevision._attachments.face.data = dillon_image;

                                return datastore.updateDocumentFromRevision(docRevision);
                            })
                            .then(function(updatedRevision) {
                                expect(updatedRevision).not.toBe(null);
                                expect(updatedRevision._id).toBeDefined();
                                expect(updatedRevision._rev).toBeDefined();
                                expect(updatedRevision.firstName).toBe(newFirstName);
                                expect(updatedRevision._attachments).toBeDefined();
                                expect(updatedRevision._attachments.face).toBeDefined();
                                expect(updatedRevision._attachments.face.data).toBe(dillon_image);
                            })
                            .catch(function(error) {
                                expect(error).toBe(null);
                            })
                            .fin(done);
                    });

                    it("fetches a document revision by docId", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        // save
                        datastore.createDocumentFromRevision(toddEmployee)
                            .then(function(docRevision) {
                                expect(docRevision).not.toBe(null);
                                expect(docRevision._id).toBeDefined();
                                expect(docRevision._rev).toBeDefined();
                                expect(docRevision.firstName).toBe(toddEmployee.firstName);
                                expect(docRevision._attachments).toBeDefined();
                                expect(docRevision._attachments.face).toBeDefined();
                                expect(docRevision._attachments.face.data).toBe(todd_image);

                                // getDocument
                                return datastore.getDocument(docRevision._id);
                            })
                            .then(function(fetchedRevision) {
                                expect(fetchedRevision).not.toBe(null);
                                expect(fetchedRevision._id).toBeDefined();
                                expect(fetchedRevision._rev).toBeDefined();
                                expect(fetchedRevision.firstName).toBe(toddEmployee.firstName);
                                expect(fetchedRevision._attachments).toBeDefined();
                                expect(fetchedRevision._attachments.face).toBeDefined();
                                expect(fetchedRevision._attachments.face.data).toBe(todd_image);
                            })
                            .catch(function(error) {
                                expect(error).toBe(null);
                            })
                            .fin(done);
                    });

                    it("deletes a document revision", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        // save
                        datastore.createDocumentFromRevision(toddEmployee)
                            .then(function(docRevision) {
                                expect(docRevision).not.toBe(null);
                                expect(docRevision._id).toBeDefined();
                                expect(docRevision._rev).toBeDefined();
                                expect(docRevision.firstName).toBe(toddEmployee.firstName);
                                expect(docRevision._attachments).toBeDefined();
                                expect(docRevision._attachments.face).toBeDefined();
                                expect(docRevision._attachments.face.data).toBe(todd_image);

                                // deleteDocumentFromRevision
                                return datastore.deleteDocumentFromRevision(docRevision);
                            })
                            .then(function(result) {
                                expect(result).not.toBe(null);
                            })
                            .catch(function(error) {
                                expect(error).not.toBe(null);
                            })
                            .fin(done);
                    });

                    describe('Negative Tests', function() {
                        var toddRedefined = {
                            "firstName": "Todd",
                            "age": 30,
                            "_attachments": {
                                "face": {
                                    "contentType": "image/jpeg",
                                    "data": todd_image
                                }
                            }
                        };


                        it("empty _attachments", function(done) {
                            var datastore = getDatastore(storeDescription);
                            expect(datastore).not.toBe(null);

                            var badAttachments = {};

                            toddRedefined._attachments = badAttachments;
                            try {
                                datastore.save(toddRedefined)
                                    .then(function() {
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

                        it("empty face attachment", function(done) {
                            var datastore = getDatastore(storeDescription);
                            expect(datastore).not.toBe(null);
                            var badAttachments = {
                                "face": {}
                            };

                            toddRedefined._attachments = badAttachments;
                            try {
                                datastore.save(toddRedefined)
                                    .then(function() {
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

                        it("missing contentType", function(done) {
                            var datastore = getDatastore(storeDescription);
                            expect(datastore).not.toBe(null);
                            var badAttachments = {
                                "face": {
                                    "data": todd_image
                                }
                            };

                            toddRedefined._attachments = badAttachments;
                            try {
                                datastore.save(toddRedefined)
                                    .then(function() {
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

                        it("missing data", function(done) {
                            var datastore = getDatastore(storeDescription);
                            expect(datastore).not.toBe(null);
                            var badAttachments = {
                                "face": {
                                    "contentType": "image/jpeg"
                                }
                            };

                            toddRedefined._attachments = badAttachments;
                            try {
                                datastore.save(toddRedefined)
                                    .then(function() {
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
                    }); // end negative tests
                }); // end-Promises-describe-block
            });
        }

        function testQuery(storeDescription) {

            var indexName = 'ageIndex';
            var ageKey = 'age';
            var nameKey = 'name';
            var nameValue = 'Dillon';
            var faceKey = 'face';
            var idolKey = 'idolFace';

            var fieldNames = [ageKey];

            describe('Query with Attachments (' + storeDescription + ')', function() {
                beforeEach(function(done) {
                    var datastore = getDatastore(storeDescription);
                    expect(datastore).not.toBe(null);

                    datastore.ensureIndexed(fieldNames, indexName)
                        .then(function() {
                            return setupQueryTests(0, 5, datastore);
                        })
                        .then(function() {
                            return setupQueryTests(5, 10, datastore);
                        })
                        .then(function() {
                            return setupQueryTests(10, 15, datastore);
                        })
                        .then(function() {
                            return setupQueryTests(15, 20, datastore);
                        })
                        .catch(function(error) {
                            expect(error).toBe(null);
                        })
                        .fin(done);
                });

                describe('Callbacks', function() {
                    it('should perform a query for equality', function(done) {
                        var query = {
                            selector: {
                                age: {
                                    $eq: 5
                                }
                            }
                        };

                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        datastore.find(query,
                            function(err, results) {
                                expect(err).toBe(null);
                                expect(results).not.toBe(null);

                                results.forEach(function (result) {
                                  expect(result[ageKey]).toBe(5);
                                  expect(result[nameKey]).toBe(nameValue + 5);
                                  expect(result._attachments).toBeDefined();
                                  expect(result._attachments.face).toBeDefined();
                                  expect(result._attachments.face.data).toBe(dillon_image);
                                  expect(result._attachments.idolFace).toBeDefined();
                                  expect(result._attachments.idolFace.data).toBe(todd_image);
                                });

                                done();
                            });
                    });

                }); // End Callback Tests

                describe('Promises', function() {
                    it('should perform a query for equality', function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        var query = {
                            selector: {
                                age: {
                                    $eq: 5
                                }
                            }
                        };

                        datastore.find(query)
                            .then(function(results) {
                                expect(results).not.toBe(null);

                                results.forEach(function (result) {
                                  expect(result[ageKey]).toBe(5);
                                  expect(result[nameKey]).toBe(nameValue + 5);
                                  expect(result._attachments).toBeDefined();
                                  expect(result._attachments.face).toBeDefined();
                                  expect(result._attachments.face.data).toBe(dillon_image);
                                  expect(result._attachments.idolFace).toBeDefined();
                                  expect(result._attachments.idolFace.data).toBe(todd_image);
                                });
                            })
                            .catch(function(error) {
                                expect(true).toBe(false);
                            })
                            .fin(done);
                    });
                }); // End Promise Tests
            });

            function setupQueryTests(start, end, datastore) {
                var promises = [];
                for (var i = start; i < end; i++) {
                    var toddMinion = {
                        name: nameValue + i,
                        age: i,
                        "_attachments": {
                            face: {
                                "contentType": "image/jpeg",
                                "data": dillon_image
                            },
                            idolFace: {
                                "contentType": "image/jpeg",
                                "data": todd_image
                            }
                        }
                    };
                    promises.push(datastore.createDocumentFromRevision(toddMinion));
                }

                return Q.all(promises);
            }
        }

        testCRUD("local");
        testCRUD("encrypted");

        testQuery("local");
        testQuery("encrypted");

        function getDatastore(storeDescription){
            var datastore;
            switch(storeDescription){
                case "local":
                datastore = localStore;
                break;
                case "encrypted":
                datastore = encryptedStore;
                break;
            }
            return datastore;
        }
    });
};

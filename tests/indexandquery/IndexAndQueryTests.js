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

var DatastoreManager = require('com.cloudant.sync.DatastoreManager');
var Q = require('com.cloudant.sync.q');

var DBName = "indexandquerydb";
var encryptedDBName = DBName + "secure";
var validEncryptionOptions = {
    password: 'passw0rd',
    identifier: 'toolkit'
};

exports.defineAutoTests = function() {
    describe('Datastore', function() {

        var db = null;
        var encryptedDb = null;

        function getDatastore(datastoreDescription) {
            switch (datastoreDescription) {
                case "local":
                    return db;
                case "encrypted":
                    return encryptedDb;
            }
        }

        beforeEach(function(done) {
            if (!db || !encryptedDb) {
                DatastoreManager.deleteDatastore(DBName)
                    .then(function() {
                        return DatastoreManager.deleteDatastore(encryptedDBName);
                    })
                    .then(function() {
                        return DatastoreManager.openDatastore(DBName);
                    })
                    .then(function(newDatastore) {
                        db = newDatastore;
                        return DatastoreManager.openDatastore(encryptedDBName);
                    })
                    .then(function(newEncryptedDatastore) {
                        encryptedDb = newEncryptedDatastore;
                    })
                    .catch(function(error) {
                        console.error(error);
                    })
                    .fin(done);
            } else {
                done();
            }
        });

        function testIndex(datastoreDescription) {

            // Index Tests
            describe('Index (' + datastoreDescription + ')', function() {
                it('.ensureIndexed exists', function() {
                    try {
                        var datastore = getDatastore(datastoreDescription);
                        expect(datastore).not.toBe(undefined);
                        expect(datastore).not.toBe(null);
                        expect(datastore.ensureIndexed).toBeDefined();
                    } catch (e) {
                        console.error(".ensureIndexed exists failed: " + e);
                    }
                });

                it('.deleteIndexNamed exists', function() {
                    var datastore = getDatastore(datastoreDescription);
                    expect(datastore).not.toBe(null);
                    expect(datastore.deleteIndexNamed).toBeDefined();
                });

                describe('Callbacks', function() {
                    it('create and delete index', function(done) {
                        var datastore = getDatastore(datastoreDescription);
                        expect(datastore).not.toBe(null);
                        var indexName = 'lastnameindex';
                        datastore.ensureIndexed(['lastName'], indexName, function(err, result) {
                            expect(err).toBe(null);
                            expect(result).toBe(indexName);
                            datastore.deleteIndexNamed(indexName, function(err, result) {
                                expect(err).toBe(null);
                                expect(result).toBe(true);
                                done();
                            });
                        });
                    });

                    describe("create index negative tests", function() {
                        // Invalid index name for create
                        it('indexName is null', function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            var indexName = null;
                            try {
                                datastore.ensureIndexed(['lastName'], indexName);
                                expect(true).toBe(false);
                                done();
                            } catch (error) {
                                expect(error).not.toBe(null);
                                done();
                            }
                        });

                        it('indexName is empty string', function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            var indexName = "";
                            try {
                                datastore.ensureIndexed(['lastName'], indexName);
                                expect(true).toBe(false);
                                done();
                            } catch (error) {
                                expect(error).not.toBe(null);
                                done();
                            }
                        });

                        it('indexName is missing', function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            try {
                                datastore.ensureIndexed(['lastName']);
                                expect(true).toBe(false);
                                done();
                            } catch (error) {
                                expect(error).not.toBe(null);
                                done();
                            }
                        });

                        it('indexName is wrong type', function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            try {
                                datastore.ensureIndexed(
                                    ['lastName'], ['lastName']);
                                expect(true).toBe(false);
                                done();
                            } catch (error) {
                                expect(error).not.toBe(null);
                                done();
                            }
                        });

                        // Invalid fields
                        it('fields are empty', function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            var indexName = 'lastnameindex';
                            try {
                                datastore.ensureIndexed([], indexName);
                                expect(true).toBe(false);
                                done();
                            } catch (error) {
                                expect(error).not.toBe(null);
                                done();
                            }
                        });

                        it('fields are null', function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            var indexName = 'lastnameindex';
                            try {
                                datastore.ensureIndexed(null, indexName);
                                expect(true).toBe(false);
                                done();
                            } catch (error) {
                                expect(error).not.toBe(null);
                                done();
                            }
                        });

                        it('fields are missing', function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            var indexName = 'lastnameindex';
                            try {
                                datastore.ensureIndexed(indexName);
                                expect(true).toBe(false);
                                done();
                            } catch (error) {
                                expect(error).not.toBe(null);
                                done();
                            }
                        });

                        it('fields are wrong type', function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            var indexName = 'lastnameindex';
                            try {
                                datastore.ensureIndexed({
                                    'name': 'value'
                                }, indexName);
                                expect(true).toBe(false);
                                done();
                            } catch (error) {
                                expect(error).not.toBe(null);
                                done();
                            }
                        });
                    });

                    describe("delete index negative tests", function() {
                        // Invalid index name for delete
                        it('indexName is null', function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            var indexName = null;
                            try {
                                datastore.deleteIndexNamed(indexName);
                                expect(true).toBe(false);
                                done();
                            } catch (error) {
                                expect(error).not.toBe(null);
                                done();
                            }
                        });

                        it('indexName is empty string', function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            var indexName = "";
                            try {
                                datastore.deleteIndexNamed(indexName);
                                expect(true).toBe(false);
                                done();
                            } catch (error) {
                                expect(error).not.toBe(null);
                                done();
                            }
                        });

                        it('indexName is missing', function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            try {
                                datastore.deleteIndexNamed();
                                expect(true).toBe(false);
                                done();
                            } catch (error) {
                                expect(error).not.toBe(null);
                                done();
                            }
                        });

                        it('indexName is wrong type', function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            try {
                                datastore.deleteIndexNamed(
                                    ['lastName']);
                                expect(true).toBe(false);
                                done();
                            } catch (error) {
                                expect(error).not.toBe(null);
                                done();
                            }
                        });
                    });

                }); // End Callback Tests

                describe('Promises', function() {
                    it('create and delete index', function(done) {
                        var datastore = getDatastore(datastoreDescription);
                        expect(datastore).not.toBe(null);
                        var indexName = 'lastnameindex';
                        datastore.ensureIndexed(['lastName'], indexName)
                            .then(function(result) {
                                expect(result).toBe(indexName);
                                return datastore.deleteIndexNamed(indexName);
                            })
                            .then(function(result) {
                                expect(result).toBe(true);
                            })
                            .catch(function(err) {
                                expect(err).toBe(null);
                            })
                            .fin(done);
                    });

                    describe("create index negative tests", function() {
                        // invalid index name for create
                        it("indexName is null", function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            try {
                                var indexName = null;
                                datastore.ensureIndexed(['lastName'], indexName)
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

                        it("indexName is empty string", function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            try {
                                var indexName = "";
                                datastore.ensureIndexed(['lastName'], indexName)
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

                        it("indexName is missing", function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            try {
                                datastore.ensureIndexed(['lastName'])
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

                        it("indexName is wrong type", function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            try {
                                datastore.ensureIndexed(['lastName'], ['lastName'])
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

                        // invalid field tests
                        it("fields are null", function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            try {
                                var indexName = 'lastnameindex';
                                datastore.ensureIndexed(null, indexName)
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

                        it("fields are empty", function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            try {
                                var indexName = 'lastnameindex';
                                datastore.ensureIndexed([], indexName)
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

                        it("fields are missing", function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            try {
                                var indexName = 'lastnameindex';
                                datastore.ensureIndexed(indexName)
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

                        it("fields are wrong type", function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            try {
                                var indexName = 'lastnameindex';
                                datastore.ensureIndexed({
                                        'name': 'value'
                                    }, indexName)
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
                    }); // end create negative tests

                    describe("delete index negative tests", function() {
                        // invalid index name for delete
                        it("indexName is null", function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            try {
                                var indexName = null;
                                datastore.deleteIndexNamed(indexName)
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

                        it("indexName is empty string", function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            try {
                                var indexName = "";
                                datastore.deleteIndexNamed(indexName)
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

                        it("indexName is missing", function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            try {
                                datastore.deleteIndexNamed()
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

                        it("indexName is wrong type", function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            try {
                                datastore.deleteIndexNamed(['lastName'])
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
                    }); // end delete index tests

                }); // End Promise Tests
            });
        }

        function testQuery(datastoreDescription) {
            var indexName = 'ageIndex';
            var ageKey = 'age';
            var nameKey = 'name';
            var nameValue = 'data';
            var indexedFields = [ageKey];

            // Index Tests
            describe('Query (' + datastoreDescription + ')', function() {
                var employee = null;

                beforeEach(function() {

                });

                beforeEach(function(done) {
                    jasmine.addMatchers({
                        toBeLessThanOrEqualTo: function(util, customEqualityTesters) {
                            return {
                                compare: function(actual, expected) {
                                    var result = {};
                                    result.pass = actual <= expected;

                                    if (!result.pass) {
                                        result.message = "Expected " + actual + " to be less than or equal to " + expected;
                                    }
                                    return result;
                                }
                            };
                        }
                    });

                    try {
                        var datastore = getDatastore(datastoreDescription);
                        expect(datastore).not.toBe(null);
                        setupQueryTests(0, 5, datastore)
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
                    } catch (e) {
                        console.error("Query beforeEach failed: " + e);
                    }
                });

                it('.find exists', function() {
                    var datastore = getDatastore(datastoreDescription);
                    expect(datastore).not.toBe(null);
                    expect(datastore.find).toBeDefined();
                });

                describe('Callbacks', function() {

                    it('query for doc', function(done) {
                        var query = {
                            selector: {
                                age: 0
                            }
                        };

                        var datastore = getDatastore(datastoreDescription);
                        expect(datastore).not.toBe(null);

                        datastore.find(query,
                            function(err, results) {
                                expect(err).toBe(null);
                                expect(results).not.toBe(null);

                                results.forEach(function(result) {
                                    expect(result[ageKey]).toBe(0);
                                    expect(result[nameKey]).toBe(nameValue + 0);
                                });

                                done();
                            });
                    });

                    it('should perform a query for equality', function(done) {
                        var query = {
                            selector: {
                                age: {
                                    $eq: 5
                                }
                            }
                        };

                        var datastore = getDatastore(datastoreDescription);
                        expect(datastore).not.toBe(null);

                        datastore.find(query,
                            function(err, results) {
                                expect(err).toBe(null);
                                expect(results).not.toBe(null);

                                results.forEach(function(result) {
                                    expect(result[ageKey]).toBe(5);
                                    expect(result[nameKey]).toBe(nameValue + 5);
                                });

                                done();
                            });
                    });

                    it('should perform a query for inequality', function(done) {
                        var query = {
                            selector: {
                                age: {
                                    $gt: 1
                                }
                            }
                        };

                        var datastore = getDatastore(datastoreDescription);
                        expect(datastore).not.toBe(null);

                        datastore.find(query,
                            function(err, results) {
                                expect(err).toBe(null);
                                expect(results).not.toBe(null);

                                results.forEach(function(result) {
                                    expect(result[ageKey]).toBeGreaterThan(1);
                                });
                                done();
                            });
                    });

                    it('should perform a query with sort options', function(done) {
                        var query = {
                            selector: {
                                age: {
                                    $gte: 0
                                }
                            },
                            sort: [{
                                age: 'desc'
                            }]
                        };

                        var datastore = getDatastore(datastoreDescription);
                        expect(datastore).not.toBe(null);

                        datastore.find(query,
                            function(err, results) {
                                expect(err).toBe(null);
                                expect(results).not.toBe(null);

                                var age = results[0][ageKey];
                                results.forEach(function(result) {
                                    expect(result[ageKey]).toBeLessThanOrEqualTo(age);
                                    age = result[ageKey];
                                });

                                done();
                            });
                    });

                    it('should perform a query with skip and limit options', function(done) {
                        var query = {
                            selector: {
                                age: {
                                    $gte: 0
                                }
                            },
                            sort: [{
                                age: 'asc'
                            }],
                            limit: 3,
                            skip: 3
                        };

                        var datastore = getDatastore(datastoreDescription);
                        expect(datastore).not.toBe(null);

                        datastore.find(query,
                            function(err, results) {
                                expect(err).toBe(null);
                                expect(results).not.toBe(null);
                                expect(results.length).toBe(3);

                                done();
                            });
                    });

                    describe("Query negative tests", function() {

                        it('should throw for null query options', function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);

                            try {
                                datastore.find(null);
                                expect(true).toBe(false);
                                done();
                            } catch (e) {
                                expect(e).not.toBe(null);
                                done();
                            }

                        });

                        it('should reject bad query params', function(done) {
                            var query = {
                                42: {}
                            };

                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            try {
                                datastore.find(query);
                                expect(true).toBe(false);
                                done();
                            } catch (e) {
                                expect(e).not.toBe(null);
                                done();
                            }
                        });
                    }); // end query negative tests
                }); // End Callback Tests

                describe('Promises', function() {
                    it('query for doc', function(done) {
                        var datastore = getDatastore(datastoreDescription);
                        expect(datastore).not.toBe(null);

                        var query = {
                            selector: {
                                age: 0
                            }
                        };

                        datastore.find(query)
                            .then(function(results) {
                                expect(results).not.toBe(null);

                                results.forEach(function(result) {
                                    expect(result[ageKey]).toBe(0);
                                    expect(result[nameKey]).toBe(nameValue + 0);
                                });
                            })
                            .catch(function(error) {
                                expect(true).toBe(false);
                            })
                            .fin(done);
                    });

                    it('should perform a query for equality', function(done) {
                        var datastore = getDatastore(datastoreDescription);
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

                                results.forEach(function(result) {
                                    expect(result[ageKey]).toBe(5);
                                    expect(result[nameKey]).toBe(nameValue + 5);
                                });
                            })
                            .catch(function(error) {
                                expect(true).toBe(false);
                            })
                            .fin(done);
                    });

                    it('should perform a query for inequality', function(done) {
                        var datastore = getDatastore(datastoreDescription);
                        expect(datastore).not.toBe(null);

                        var query = {
                            selector: {
                                age: {
                                    $gt: 1
                                }
                            }
                        };

                        datastore.find(query)
                            .then(function(results) {
                                expect(results).not.toBe(null);

                                results.forEach(function(result) {
                                    expect(result[ageKey]).toBeGreaterThan(1);
                                });
                                done();
                            })
                            .catch(function(error) {
                                expect(true).toBe(false);
                            })
                            .fin(done);
                    });

                    it('should perform a query with sort options', function(done) {
                        var datastore = getDatastore(datastoreDescription);
                        expect(datastore).not.toBe(null);

                        var query = {
                            selector: {
                                age: {
                                    $gte: 0
                                }
                            },
                            sort: [{
                                age: 'desc'
                            }]
                        };

                        datastore.find(query)
                            .then(function(results) {
                                expect(results).not.toBe(null);

                                var age = results[0][ageKey];
                                results.forEach(function(result) {
                                    expect(result[ageKey]).toBeLessThanOrEqualTo(age);
                                    age = result[ageKey];
                                });

                                done();
                            })
                            .catch(function(error) {
                                expect(true).toBe(false);
                            })
                            .fin(done);
                    });

                    it('should perform a query with skip and limit options', function(done) {
                        var datastore = getDatastore(datastoreDescription);
                        expect(datastore).not.toBe(null);

                        var query = {
                            selector: {
                                age: {
                                    $gte: 0
                                }
                            },
                            sort: [{
                                age: 'asc'
                            }],
                            limit: 3,
                            skip: 3
                        };

                        datastore.find(query)
                            .then(function(results) {
                                expect(results).not.toBe(null);
                                expect(results.length).toBe(3);
                                done();
                            })
                            .catch(function(error) {
                                expect(true).toBe(false);
                            })
                            .fin(done);
                    });

                    describe("Query negative tests", function() {

                        it('should throw for null query options', function(done) {
                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);

                            try {
                                datastore.find(null)
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

                        it('should reject bad query params', function(done) {
                            var query = {
                                42: {}
                            };

                            var datastore = getDatastore(datastoreDescription);
                            expect(datastore).not.toBe(null);
                            try {
                                datastore.find(query)
                                    .then(function(results) {
                                        expect(true).toBe(false);
                                    })
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
                    }); // end query negative tests
                }); // End Promise Tests
            });

            function setupQueryTests(start, end, datastore) {
                try {

                    var promises = [];
                    promises.push(datastore.ensureIndexed(indexedFields, indexName));
                    for (var i = start; i < end; i++) {
                        var person = {};
                        person[ageKey] = i;
                        person[nameKey] = nameValue + i;

                        promises.push(datastore.createDocumentFromRevision(person));
                    }

                    return Q.all(promises);
                } catch (e) {
                    console.error("Query failed setup: " + e);
                }
            }
        }

        testIndex("local");
        testIndex("encrypted");

        testQuery("local");
        testQuery("encrypted");
    });
};

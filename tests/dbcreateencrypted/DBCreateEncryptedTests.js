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
var DBName = "testdbcreateencrypted";
exports.defineAutoTests = function() {
    describe('DatastoreManager', function() {

        beforeEach(function(done) {
            DatastoreManager.deleteDatastore(DBName)
                .fin(done);
        });

        afterEach(function(done) {
            DatastoreManager.deleteDatastore(DBName)
                .fin(done);
        });

        it('should exist', function() {
            expect(DatastoreManager).toBeDefined();
        });

        it('.openDatastore should be defined', function() {
            expect(DatastoreManager.openDatastore).toBeDefined();
        });

        describe('.openDatastore(name, [encryptionOptions], [callback])', function() {
            var validEncryptionOptions = {
                password: 'passw0rd',
                identifier: 'sync'
            };

            describe('Callback Tests', function() {

                it("should create an encrypted Datastore", function(done) {
                    var storeName = DBName;
                    DatastoreManager.openDatastore(storeName, validEncryptionOptions, function(error,
                        createdStore) {
                        expect(error).toBe(null);
                        expect(createdStore).not.toBe(null);
                        expect(createdStore.name).toBe(storeName);
                        done();
                    });
                });

                it("should fail create a Datastore with missing parameters", function(done) {
                    try {
                        DatastoreManager.openDatastore(function(error, result) {
                            expect(true).toBe(false);
                        });
                        expect(true).toBe(false);
                        done();
                    } catch (error) {
                        expect(error).not.toBe(null);
                        done();
                    }

                });

                it("should fail create a Datastore with null name", function(done) {
                    try {
                        DatastoreManager.openDatastore(null, validEncryptionOptions, function(error,
                            result) {
                            expect(true).toBe(false);
                        });
                        expect(true).toBe(false);
                        done();
                    } catch (error) {
                        expect(error).not.toBe(null);
                        done();
                    }

                });

                it("should fail create a Datastore with empty name", function(done) {
                    try {
                        DatastoreManager.openDatastore("", validEncryptionOptions, function(error,
                            result) {
                            expect(true).toBe(false);
                        });
                        expect(true).toBe(false);
                        done();
                    } catch (error) {
                        expect(error).not.toBe(null);
                        done();
                    }

                });

                it("should fail create a Datastore with name of wrong type", function(done) {
                    try {
                        DatastoreManager.openDatastore(['foo'], validEncryptionOptions, function(error,
                            result) {
                            expect(true).toBe(false);
                        });
                        expect(true).toBe(false);
                        done();
                    } catch (error) {
                        expect(error).not.toBe(null);
                        done();
                    }

                });
            }); // end callback tests

            describe('Promise Tests', function() {
                var providerPassword = 'passw0rd';
                var providerId = 'sync';

                it("should create an encrypted Datastore", function(done) {
                    var storeName = DBName;

                    DatastoreManager.openDatastore(storeName, validEncryptionOptions)
                        .then(function(createdStore) {
                            expect(createdStore).not.toBe(null);
                            expect(createdStore.name).toBe(storeName);
                        })
                        .catch(function(error) {
                            expect(error).toBe(null);
                        })
                        .fin(done);
                });

                it("should fail create a Datastore with missing parameters", function(done) {
                    try {
                        DatastoreManager.openDatastore()
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

                it("should fail create a Datastore with null name", function(done) {
                    try {
                        DatastoreManager.openDatastore(null, validEncryptionOptions)
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

                it("should fail create a Datastore with empty name", function(done) {
                    try {
                        DatastoreManager.openDatastore("", validEncryptionOptions)
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

                it("should fail create a Datastore with name of wrong type", function(done) {
                    try {
                        DatastoreManager.openDatastore(['foo'], validEncryptionOptions)
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
            }); // end promise tests
        });
    });
};

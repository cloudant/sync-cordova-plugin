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

var DatastoreManager = require('cloudant-sync.DatastoreManager');
var DBName = "testdbcreate";
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

        it("should contain method openDatastore", function() {
            expect(DatastoreManager.openDatastore).toBeDefined();
        });

        it("should contain method deleteDatastore", function() {
            expect(DatastoreManager.openDatastore).toBeDefined();
        });

        describe('.openDatastore(name, [callback])', function() {
            describe('Callbacks', function() {
                it("should create a Datastore", function(done) {
                    var storeName = DBName;

                    DatastoreManager.openDatastore(storeName, function(error,
                        createdStore) {
                        if (error) {
                            console.log(error);
                        }
                        expect(error).toBe(null);
                        expect(createdStore).not.toBe(
                            null);
                        expect(createdStore.name).toBe(
                            storeName);
                        done();
                    });
                });

                it("should fail create a Datastore with missing name parameter", function(
                    done) {
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
                        DatastoreManager.openDatastore(null, function(error,
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
                        DatastoreManager.openDatastore("", function(error, result) {
                            expect(true).toBe(false);
                        });
                        expect(true).toBe(false);
                        done();
                    } catch (error) {
                        expect(error).not.toBe(null);
                        done();
                    }

                });

                it("should fail create a Datastore with name of wrong type", function(
                    done) {
                    try {
                        DatastoreManager.openDatastore(['foo'], function(error,
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
                it("should create a Datastore", function(done) {
                    var storeName = DBName;

                    DatastoreManager.openDatastore(storeName)
                        .then(function(createdStore) {
                            expect(createdStore).not.toBe(
                                null);
                            expect(createdStore.name).toBe(
                                storeName);
                        })
                        .fin(done);
                });

                it("should fail create a Datastore with missing name parameter", function(
                    done) {
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

                it("should fail create a Datastore with null name parameter", function(
                    done) {
                    try {
                        DatastoreManager.openDatastore(null)
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

                it("should fail create a Datastore with empty name parameter", function(
                    done) {
                    try {
                        DatastoreManager.openDatastore("")
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

                it("should fail create a Datastore with name parameter wrong type",
                    function(done) {
                        try {
                            DatastoreManager.openDatastore(['foo'])
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
        }); // end openDatastore tests

        describe('.deleteDatastore(name, [callback])', function() {

            describe('Callbacks', function() {
                it('should delete a Datastore', function(done) {
                    var storeName = DBName;

                    DatastoreManager.openDatastore(storeName, function(error,
                        createdStore) {
                        expect(error).toBe(null);

                        DatastoreManager.deleteDatastore(storeName,
                            function(error) {
                                expect(error).toBe(null);
                                done();
                            });
                    });
                });

                it('should fail delete a Datastore with missing name parameter', function(
                    done) {
                    try {
                        DatastoreManager.deleteDatastore(function(error, result) {
                            expect(true).toBe(false);
                        });
                        expect(true).toBe(false);
                        done();
                    } catch (error) {
                        expect(error).not.toBe(null);
                        done();
                    }
                });

                it('should fail delete a Datastore with null name', function(done) {
                    try {
                        DatastoreManager.deleteDatastore(null, function(error,
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

                it('should fail delete a Datastore with empty name', function(done) {
                    try {
                        DatastoreManager.deleteDatastore("", function(error,
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

                it('should fail delete a Datastore with name of wrong type', function(
                    done) {
                    try {
                        DatastoreManager.deleteDatastore(['foo'], function(
                            error, result) {
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

            describe('Promises', function() {
                it('should delete a Datastore', function(done) {
                    var storeName = DBName;

                    DatastoreManager.openDatastore(storeName)
                        .then(function(createdStore) {
                            expect(createdStore).not.toBe(null);
                            return DatastoreManager.deleteDatastore(storeName);
                        })
                        .catch(function(error) {
                            expect(error).toBe(null);
                        })
                        .fin(done);
                });

                it('should fail delete a Datastore with missing name parameter', function(
                    done) {
                    try {
                        DatastoreManager.deleteDatastore()
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

                it('should fail delete a Datastore with null name', function(done) {
                    try {
                        DatastoreManager.deleteDatastore(null)
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

                it('should fail delete a Datastore with empty name', function(done) {
                    try {
                        DatastoreManager.deleteDatastore("")
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

                it('should fail delete a Datastore with name of wrong type', function(
                    done) {
                    try {
                        DatastoreManager.deleteDatastore(['foo'])
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
        }); // end deleteDatastore tests
    });
};

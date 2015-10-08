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

var DBName = "replicationdb";
var EncryptedDBName = DBName + "secure";
try {
    var DatastoreManager = require('com.cloudant.sync.DatastoreManager');
    var ReplicatorBuilder = require('com.cloudant.sync.ReplicatorBuilder');
} catch (e) {
    console.log("error: " + e);
}
var TestUtil = require('com.cloudant.sync.test.common.TestUtil');
var Q = require('com.cloudant.sync.q');

exports.defineAutoTests = function() {

    describe('Replication', function() {

        var validEncryptionOptions = {
            password: 'passw0rd',
            identifier: 'toolkit'
        };

        var badtoken = 'badtoken';
        var badtype = 'badtype';
        var baddatastore = 'baddatastore';
        var baduri = 'baduri';

        var uri = TestUtil.LOCAL_COUCH_URL + '/animaldb';
        var localStore = null;
        var encryptedStore = null;
        var storeName = null;
        var encryptedStoreName = null;

        function getDatastore(storeDescription) {
            var datastore;
            switch (storeDescription) {
                case "local":
                    datastore = localStore;
                    break;
                case "encrypted":
                    datastore = encryptedStore;
                    break;
            }
            return datastore;
        }

        beforeEach(function(done) {
            DatastoreManager.deleteDatastore(DBName)
                .then(function() {
                    return DatastoreManager.deleteDatastore(EncryptedDBName);
                })
                .then(function() {
                    return DatastoreManager.openDatastore(DBName);
                })
                .then(function(newLocalStore) {
                    localStore = newLocalStore;
                    return DatastoreManager.openDatastore(EncryptedDBName, validEncryptionOptions);
                })
                .then(function(newEncryptedLocalStore) {
                    encryptedStore = newEncryptedLocalStore;
                })
                .catch(function(error) {
                    console.error(error);
                })
                .fin(done);
        });

        afterEach(function(done) {
            DatastoreManager.deleteDatastore(DBName)
                .then(function() {
                    return DatastoreManager.deleteDatastore(EncryptedDBName);
                })
                .fin(done);
        });

        function testReplication(storeDescription) {

            describe('ReplicatorBuilder (' + storeDescription + ')', function() {
                it('should return a new ReplicatorBuilder', function() {
                    var builder = new ReplicatorBuilder();
                    expect(builder).not.toBe(null);
                });

                it("should contain method push", function() {
                    var builder = new ReplicatorBuilder();
                    expect(builder.push).toBeDefined();
                });

                it("should contain method pull", function() {
                    var builder = new ReplicatorBuilder();
                    expect(builder.pull).toBeDefined();
                });

                it("should contain method to", function() {
                    var builder = new ReplicatorBuilder();
                    expect(builder.to).toBeDefined();
                });

                it("should contain method from", function() {
                    var builder = new ReplicatorBuilder();
                    expect(builder.from).toBeDefined();
                });

                it("should contain method build", function() {
                    var builder = new ReplicatorBuilder();
                    expect(builder.build).toBeDefined();
                });

                describe('Callbacks', function() {
                    it("should create a pull replicator", function(done) {
                        try {
                            var datastore = getDatastore(storeDescription);
                            expect(datastore).not.toBe(null);
                            var builder = new ReplicatorBuilder();
                            expect(builder).not.toBe(null);

                            builder.pull().from(uri).to(datastore).build(function(error, replicator) {
                                expect(error).toBe(null);
                                expect(replicator.token).not.toBe(null);
                                replicator.token = badtoken; // assert readonly
                                expect(replicator.token).not.toBe(badtoken);

                                expect(replicator.type).toBe('pull');
                                replicator.type = badtype; // assert readonly
                                expect(replicator.type).not.toBe(badtype);

                                expect(replicator.datastore).toBe(datastore);
                                replicator.datastore = baddatastore; // assert readonly
                                expect(replicator.datastore).not.toBe(baddatastore);

                                expect(replicator.uri).toBe(uri);
                                replicator.uri = baduri; // assert readonly
                                expect(replicator.uri).not.toBe(baduri);
                                done();
                            });
                        } catch (e) {
                            expect(e).toBe(null);
                            done();
                        }
                    });
                    it("should create a push replicator", function(done) {
                        try {
                            var datastore = getDatastore(storeDescription);
                            expect(datastore).not.toBe(null);
                            var builder = new ReplicatorBuilder();
                            expect(builder).not.toBe(null);

                            builder.push().from(datastore).to(uri).build(function(error, replicator) {
                                expect(error).toBe(null);
                                expect(replicator.token).not.toBe(null);
                                replicator.token = badtoken; // assert readonly
                                expect(replicator.token).not.toBe(badtoken);

                                expect(replicator.type).toBe('push');
                                replicator.type = badtype; // assert readonly
                                expect(replicator.type).not.toBe(badtype);

                                expect(replicator.datastore).toBe(datastore);
                                replicator.datastore = baddatastore; // assert readonly
                                expect(replicator.datastore).not.toBe(baddatastore);

                                expect(replicator.uri).toBe(uri);
                                replicator.uri = baduri; // assert readonly
                                expect(replicator.uri).not.toBe(baduri);
                                done();
                            });
                        } catch (e) {
                            expect(e).toBe(null);
                            done();
                        }
                    });
                    // negative tests
                    it("throws error if push source is null", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().push().from(null).to(uri).build(function(error,
                                replicator) {
                                expect(true).toBe(false);
                            });
                            expect(true).toBe(false);
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                    it("throws error if push target is null", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().push().from(datastore).to(null).build(function(
                                error, replicator) {
                                expect(true).toBe(false);
                            });
                            expect(true).toBe(false);
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                    it("throws error if pull source is null", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().pull().from(null).to(datastore).build(function(
                                error, replicator) {
                                expect(true).toBe(false);
                            });
                            expect(true).toBe(false);
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                    it("throws error if pull target is null", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().pull().from(uri).to(null).build(function(error,
                                replicator) {
                                expect(true).toBe(false);
                            });
                            expect(true).toBe(false);
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });

                    it("throws error if pull source is not a String", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().pull().from([]).to(datastore).build(function(error,
                                replicator) {
                                expect(true).toBe(false);
                            });
                            expect(true).toBe(false);
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                    it("throws error if pull target is not a Datastore", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().pull().from(uri).to([]).build(function(error,
                                replicator) {
                                expect(true).toBe(false);
                            });
                            expect(true).toBe(false);
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });

                    it("throws error if push source is not a Datastore", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().push().from([]).to(uri).build(function(error,
                                replicator) {
                                expect(true).toBe(false);
                            });
                            expect(true).toBe(false);
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                    it("throws error if push target is not a String", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().push().from(datastore).to([]).build(function(error,
                                replicator) {
                                expect(true).toBe(false);
                            });
                            expect(true).toBe(false);
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });

                    it("throws error if push target is not set", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().push().from(datastore).build(function(error,
                                replicator) {
                                expect(true).toBe(false);
                            });
                            expect(true).toBe(false);
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                    it("throws error if pull target is not set", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().pull().from(uri).build(function(error, replicator) {
                                expect(true).toBe(false);
                            });
                            expect(true).toBe(false);
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                    it("throws error if push source is not set", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().push().to(uri).build(function(error, replicator) {
                                expect(true).toBe(false);
                            });
                            expect(true).toBe(false);
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                    it("throws error if pull target is not set", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().pull().to(datastore).build(function(error,
                                replicator) {
                                expect(true).toBe(false);
                            });
                            expect(true).toBe(false);
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                    it("throws error if replication type is not set", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().from(datastore).to(uri).build(function(error,
                                replicator) {
                                expect(true).toBe(false);
                            });
                            expect(true).toBe(false);
                        } catch (error) {
                            expect(error).not.toBe(null);
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

                        new ReplicatorBuilder().pull().to(datastore).from(uri).build(callback);
                        new ReplicatorBuilder().push().from(datastore).to(uri).build(callback);
                    });
                });
                describe('Promises', function() {
                    it("should create a pull replicator", function(done) {
                        try {
                            var datastore = getDatastore(storeDescription);
                            expect(datastore).not.toBe(null);
                            var builder = new ReplicatorBuilder();
                            expect(builder).not.toBe(null);

                            builder.pull().from(uri).to(datastore).build()
                                .then(function(replicator) {
                                    expect(replicator.token).not.toBe(null);
                                    replicator.token = badtoken; // assert readonly
                                    expect(replicator.token).not.toBe(badtoken);

                                    expect(replicator.type).toBe('pull');
                                    replicator.type = badtype; // assert readonly
                                    expect(replicator.type).not.toBe(badtype);

                                    expect(replicator.datastore).toBe(datastore);
                                    replicator.datastore = baddatastore; // assert readonly
                                    expect(replicator.datastore).not.toBe(baddatastore);

                                    expect(replicator.uri).toBe(uri);
                                    replicator.uri = baduri; // assert readonly
                                    expect(replicator.uri).not.toBe(baduri);
                                })
                                .catch(function(error) {
                                    expect(error).toBe(null);
                                })
                                .fin(done);
                        } catch (e) {
                            expect(e).toBe(null);
                            done();
                        }
                    });
                    it("should create a push replicator", function(done) {
                        try {
                            var datastore = getDatastore(storeDescription);
                            expect(datastore).not.toBe(null);
                            var builder = new ReplicatorBuilder();
                            expect(builder).not.toBe(null);

                            builder.push().from(datastore).to(uri).build()
                                .then(function(replicator) {
                                    expect(replicator.token).not.toBe(null);
                                    replicator.token = badtoken; // assert readonly
                                    expect(replicator.token).not.toBe(badtoken);

                                    expect(replicator.type).toBe('push');
                                    replicator.type = badtype; // assert readonly
                                    expect(replicator.type).not.toBe(badtype);

                                    expect(replicator.datastore).toBe(datastore);
                                    replicator.datastore = baddatastore; // assert readonly
                                    expect(replicator.datastore).not.toBe(baddatastore);

                                    expect(replicator.uri).toBe(uri);
                                    replicator.uri = baduri; // assert readonly
                                    expect(replicator.uri).not.toBe(baduri);
                                })
                                .catch(function(error) {
                                    expect(error).toBe(null);
                                })
                                .fin(done);
                        } catch (e) {
                            expect(e).toBe(null);
                            done();
                        }
                    });
                    // negative tests
                    it("throws error if push source is null", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().push().from(null).to(uri).build()
                                .then(function(replicator) {
                                    expect(true).toBe(false);
                                })
                                .catch(function(e) {
                                    expect(true).toBe(false);
                                });
                            expect(true).toBe(false);
                            done();
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                    it("throws error if push target is null", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().push().from(datastore).to(null).build()
                                .then(function(replicator) {
                                    expect(true).toBe(false);
                                })
                                .catch(function(e) {
                                    expect(true).toBe(false);
                                });
                            expect(true).toBe(false);
                            done();
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                    it("throws error if pull source is null", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().pull().from(null).to(datastore).build()
                                .then(function(replicator) {
                                    expect(true).toBe(false);
                                })
                                .catch(function(e) {
                                    expect(true).toBe(false);
                                });
                            expect(true).toBe(false);
                            done();
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                    it("throws error if pull target is null", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().pull().from(uri).to(null).build()
                                .then(function(replicator) {
                                    expect(true).toBe(false);
                                })
                                .catch(function(e) {
                                    expect(true).toBe(false);
                                });
                            expect(true).toBe(false);
                            done();
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });

                    it("throws error if pull source is not a String", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().pull().from([]).to(datastore).build()
                                .then(function(replicator) {
                                    expect(true).toBe(false);
                                })
                                .catch(function(e) {
                                    expect(true).toBe(false);
                                });
                            expect(true).toBe(false);
                            done();
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                    it("throws error if pull target is not a Datastore", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().pull().from(uri).to([]).build()
                                .then(function(replicator) {
                                    expect(true).toBe(false);
                                })
                                .catch(function(e) {
                                    expect(true).toBe(false);
                                });
                            expect(true).toBe(false);
                            done();
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });

                    it("throws error if push source is not a Datastore", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().push().from([]).to(uri).build()
                                .then(function(replicator) {
                                    expect(true).toBe(false);
                                })
                                .catch(function(e) {
                                    expect(true).toBe(false);
                                });
                            expect(true).toBe(false);
                            done();
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                    it("throws error if push target is not a String", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().push().from(datastore).to([]).build()
                                .then(function(replicator) {
                                    expect(true).toBe(false);
                                })
                                .catch(function(e) {
                                    expect(true).toBe(false);
                                });
                            expect(true).toBe(false);
                            done();
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });

                    it("throws error if push target is not set", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().push().from(datastore).build()
                                .then(function(replicator) {
                                    expect(true).toBe(false);
                                })
                                .catch(function(e) {
                                    expect(true).toBe(false);
                                });
                            expect(true).toBe(false);
                            done();
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                    it("throws error if pull target is not set", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().pull().from(uri).build()
                                .then(function(replicator) {
                                    expect(true).toBe(false);
                                })
                                .catch(function(e) {
                                    expect(true).toBe(false);
                                });
                            expect(true).toBe(false);
                            done();
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                    it("throws error if push source is not set", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().push().to(uri).build()
                                .then(function(replicator) {
                                    expect(true).toBe(false);
                                })
                                .catch(function(e) {
                                    expect(true).toBe(false);
                                });
                            expect(true).toBe(false);
                            done();
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                    it("throws error if pull target is not set", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().pull().to(datastore).build()
                                .then(function(replicator) {
                                    expect(true).toBe(false);
                                })
                                .catch(function(e) {
                                    expect(true).toBe(false);
                                });
                            expect(true).toBe(false);
                            done();
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                    it("throws error if replication type is not set", function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        try {
                            new ReplicatorBuilder().from(datastore).to(uri).build()
                                .then(function(replicator) {
                                    expect(true).toBe(false);
                                })
                                .catch(function(e) {
                                    expect(true).toBe(false);
                                });
                            expect(true).toBe(false);
                            done();
                        } catch (error) {
                            expect(error).not.toBe(null);
                            done();
                        }
                    });
                });

                it('should create two replicators with different tokens', function(done) {
                    var datastore = getDatastore(storeDescription);
                    expect(datastore).not.toBe(null);

                    var promises = [
                        new ReplicatorBuilder().pull().to(datastore).from(uri).build(),
                        new ReplicatorBuilder().push().from(datastore).to(uri).build()
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
            });

            describe('Replicator (' + storeDescription + ')', function() {

                var testPullReplicator;
                var testPushReplicator;

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
                    var datastore = getDatastore(storeDescription);
                    expect(datastore).not.toBe(null);

                    new ReplicatorBuilder().pull().from(uri).to(datastore).build()
                        .then(function(pullReplicator) {
                            expect(pullReplicator).not.toBe(null);
                            testPullReplicator = pullReplicator;

                            return new ReplicatorBuilder().push().from(datastore).to(uri).build();
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

                        it("should start pull replication", function(done) {
                            var replicator = getReplicator('pull');
                            expect(replicator).not.toBe(null);

                            // start replication
                            replicator.start(function(error) {
                                expect(error).toBe(null);
                                done();
                            });
                        });

                        it('should start push replication', function(done) {
                            var replicator = getReplicator('push');
                            expect(replicator).not.toBe(null);

                            // start replication
                            replicator.start(function(error) {
                                expect(error).toBe(null);
                                done();
                            });
                        });
                    }); // end-callbacks-tests

                    describe('Promises', function() {

                        it("should start pull replication", function(done) {
                            var replicator = getReplicator('pull');
                            expect(replicator).not.toBe(null);

                            replicator.start()
                                .then(function() {
                                    expect(true).toBe(true);
                                })
                                .catch(function(error) {
                                    expect(error).toBe(null);
                                })
                                .fin(done);
                        });

                        it("should start push replication", function(done) {
                            var replicator = getReplicator('push');
                            expect(replicator).not.toBe(null);

                            // start replication
                            replicator.start()
                                .then(function() {
                                    expect(true).toBe(true);
                                })
                                .catch(function(error) {
                                    expect(error).toBe(null);
                                })
                                .fin(done);
                        });
                    }); // end-promises-tests

                }); // end-start-tests

                describe('.getState([callback])', function() {

                    describe('Callbacks', function() {

                        it("should poll pull replication status until completion", function(done) {
                            var replicator = getReplicator('pull');
                            expect(replicator).not.toBe(null);

                            var mtimer;

                            function poll(replicator) {
                                mtimer = setInterval(function() {
                                    replicator.getState(function(error,
                                        result) {
                                        expect(error).toBe(null);
                                        if (result === 'Complete') {
                                            stopPoll();
                                            done();
                                        }
                                    });
                                }, 500);
                            }

                            function stopPoll() {
                                clearInterval(mtimer);
                            }

                            // start replication
                            replicator.start(function(error) {
                                expect(error).toBe(null);
                                poll(replicator); // poll on the replication status
                            });
                        });

                        it("should poll push replication status until completion", function(done) {
                            var replicator = getReplicator('push');
                            expect(replicator).not.toBe(null);

                            var mtimer;

                            function poll(replicator) {
                                mtimer = setInterval(function() {
                                    replicator.getState(function(error,
                                        result) {
                                        expect(error).toBe(null);
                                        if (result === 'Complete') {
                                            stopPoll();
                                            done();
                                        }
                                    });
                                }, 500);
                            }

                            function stopPoll() {
                                clearInterval(mtimer);
                            }

                            // start replication
                            replicator.start(function(error) {
                                expect(error).toBe(null);
                                poll(replicator); // poll on the replication status
                            });
                        });

                        it("should poll two replication's status until completion", function(done) {
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

                            // start replications
                            pullReplicator.start(function(error) {
                                expect(error).toBe(null);
                                // start polling on replication status
                                mtimer1 = poll(pullReplicator);
                            });
                            pushReplicator.start(function(error) {
                                expect(error).toBe(null);
                                mtimer2 = poll(pushReplicator);
                            });
                        });
                    }); // end-callbacks-tests

                    describe('Promises', function() {

                        it("should poll pull replication status until completion", function(done) {
                            var replicator = getReplicator('pull');
                            expect(replicator).not.toBe(null);

                            var mtimer;

                            function poll(replicator) {
                                mtimer = setInterval(function() {
                                    replicator.getState()
                                        .then(function(result) {
                                            expect(result).not.toBe(null);
                                            if (result === 'Complete') {
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

                            // start replication
                            replicator.start()
                                .then(function() {
                                    poll(replicator); // poll on the replication status
                                })
                                .catch(function(error) {
                                    expect(error).toBe(null);
                                });
                        });

                        it("should poll push replication status until completion", function(done) {
                            var replicator = getReplicator('push');
                            expect(replicator).not.toBe(null);

                            var mtimer;

                            function poll(replicator) {
                                mtimer = setInterval(function() {
                                    replicator.getState()
                                        .then(function(result) {
                                            expect(result).not.toBe(null);
                                            if (result === 'Complete') {
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
                                    poll(replicator); // poll on the replication status
                                })
                                .catch(function(error) {
                                    expect(error).toBe(null);
                                });
                        });

                        it("should poll two replication's status until completion", function(done) {
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

                            // start replicators
                            Q.all([pullReplicator.start(), pushReplicator.start()])
                                .then(function() {
                                    // start polling on replication status
                                    mtimer1 = poll(pullReplicator);
                                    mtimer2 = poll(pushReplicator);
                                })
                                .catch(function(error) {
                                    expect(error).toBe(null);
                                });
                        });
                    }); // end-promises-tests

                }); // end-getState-tests

                describe('.stop([callback])', function() {

                    describe('Callbacks', function() {

                        it('should stop pull replication', function(done) {
                            var replicator = getReplicator('pull');
                            expect(replicator).not.toBe(null);

                            // start replication
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

                            // start replication
                            replicator.start(function(error) {
                                expect(error).toBe(null);
                                replicator.stop(function(error) {
                                    expect(error).toBe(null);
                                    done();
                                });
                            });
                        });
                    }); // end-callbacks-tests

                    describe('Promises', function() {

                        it('should stop pull replication', function(done) {
                            var replicator = getReplicator('pull');
                            expect(replicator).not.toBe(null);

                            // start replication
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

                            // start replication
                            replicator.start()
                                .then(function() {
                                    return replicator.stop();
                                })
                                .catch(function(error) {
                                    expect(error).toBe(null);
                                })
                                .fin(done);
                        });
                    }); // end-promises-tests
                }); // end-stop-tests

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
                    });

                    it('should register and fire an "error" event', function(done) {
                        var datastore = getDatastore(storeDescription);
                        expect(datastore).not.toBe(null);

                        new ReplicatorBuilder().pull().to(datastore).from(uri + 'foo').build()
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

                describe('.destroy([callback])', function () {
                    describe('Callbacks', function () {
                        it('should destroy a replicator', function (done) {
                            try{
                                var replicator = getReplicator('pull');
                                expect(replicator).not.toBe(null);
                                expect(replicator.destroyed).not.toBeDefined();

                                replicator.destroy(function (error) {
                                    try {
                                        expect(error).toBe(null);
                                        expect(replicator.destroyed).toBe(true);
                                        done();
                                    } catch(e){
                                        expect(e).toBe(null);
                                        done();
                                    }
                                });
                            } catch (e){
                                expect(e).toBe(null);
                                done();
                            }
                        });
                    });

                    describe('Promises', function () {
                        it('should destroy a replicator', function (done) {
                            try {
                                var replicator = getReplicator('pull');
                                expect(replicator).not.toBe(null);
                                expect(replicator.destroyed).not.toBeDefined();

                                replicator.destroy()
                                    .then(function () {
                                        expect(replicator.destroyed).toBe(true);
                                    })
                                    .catch(function (error) {
                                        expect(error).toBe(null);
                                    })
                                    .fin(done);
                            } catch(e){
                                expect(e).toBe(null);
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
                    });
                });

                describe('push replication', function() {
                    it('should push documents to testdb', function(done) {
                        try {
                            var pushReplicator = getReplicator('push');
                            expect(pushReplicator).not.toBe(null);

                            var pullReplicator = getReplicator('pull');
                            expect(pullReplicator).not.toBe(null);

                            pullReplicator.on('complete', function (numDocs) {
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

                            pullReplicator.on('complete',function (numDocs) {
                                pushReplicator.datastore.createDocumentFromRevision({
                                        foo: 'bar'
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
                                .catch(function (e) {
                                    expect(e).toBe(null);
                                });
                        } catch (e) {
                            console.log(e);
                            done();
                        }
                    });
                });
            }); // end-Replicator-tests
        }

        testReplication("local");
        testReplication("encrypted");
    });
};

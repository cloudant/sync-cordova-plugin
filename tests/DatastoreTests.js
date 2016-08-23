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

var dbName = 'datastoretests';

exports.defineAutoTests = function() {

  var datastore;
  var manager;

  beforeAll(function(done) {
    DatastoreManager({})
        .then(function(localManager) {
          manager = localManager;
        }).fin(done);
  });


  beforeEach(function(done) {
    manager.openDatastore(dbName)
     .then(function(ds) {
        datastore = ds;
      }).fin(done);
  });

  afterEach(function(done) {
    manager.deleteDatastore(dbName)
    .fin(done);
  });


  describe('it is possible to close the datastore', function() {
    describe('using callbacks', function() {

      it('successfully closes a datastore', function(done) {

        function callback(error) {
          expect(error).toBe(null);
          done();
        }

        datastore.close(callback);
      });

      it('fails to close an already closed datastore', function(done) {
        if (typeof device !== 'undefined' && 'iOS' == device.platform) {
          // On iOS, mark this test as pending, so as to differentiate it from fail/success.
          pending('Skipped: On iOS there is no explicit close datastore operation. Calls to datastore.close() are always deemed successful');
        } else {
          datastore.close(function(error) {
            expect(error).toBe(null);
            datastore.close(function(error) {
              console.log('Close already closed error: ' + error);
              expect(error).not.toBe(null);
              done();
            });
          });
        }
      });
    });

    describe('using promises', function() {
      it('successfully closes a datastore', function(done) {

        datastore.close()
        .then(function() {
          // This prevents jasmine trying to be clever and say we didn't
          // have any expectations
          expect(true).toBe(true);
        })
        .catch(function(error) {
          fail('Closing datastore should not have failed');
        }).fin(done);
      });

      it('fails to close an already closed datastore', function(done) {
        if (typeof device !== 'undefined' && 'iOS' == device.platform) {
          // On iOS, mark this test as pending, so as to differentiate it from fail/success.
          pending('Skipped: On iOS there is no explicit close datastore operation. Calls to datastore.close() are always deemed successful');
        } else {
          datastore.close()
            .then(function() {
              return datastore.close();
            }).then(function() {
              fail('closing datastore should have failed');
            }).catch(function(error) {
              expect(error).not.toBe(null);
            }).fin(done);
        }
      });
    });
  });

};

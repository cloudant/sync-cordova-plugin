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

module.exports = function(context) {
    var shelljs = context.requireCordovaModule('shelljs');
    var Q = context.requireCordovaModule('q');
    var request = context.requireCordovaModule('request');

    // Ensure couchdb is available
    if (!shelljs.which('couchdb')) {
        shelljs.echo('Sorry, this script requires couchdb');
        shelljs.exit(1);
    }

    // Start couchdb
    if (shelljs.exec('couchdb -b').code !== 0){
        shelljs.echo('WARNING! couchdb may not have started correctly');
    }

    // Replicate animaldb to local couchdb
    var deferred = Q.defer();
    request({
        uri: 'http://localhost:5984/_replicate',
        method: 'POST',
        json: true,
        body: {
            source: 'https://examples.cloudant.com/animaldb',
            target: 'http://localhost:5984/animaldb',
            create_target: true
        }
    }, function (error, response, body) {
        if (error) {
            deferred.reject(error);
        } else {
            shelljs.echo('Replication completed! Status code: ' + response.statusCode);
            deferred.resolve();
        }
    });

    return deferred.promise;
};

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

/**
 * Create a remote database at the given uri.
 * @param {String} uri - The URI identifying the database we want to create.
 * @returns {Number} - The HTTP status code returned by the attempt to create
 * the database.
 */
exports.createRemoteDb = function(uri) {
  var client = new XMLHttpRequest();
  client.open("PUT", uri, false);
  client.send();
  return client.status;
};

/**
 * Delete a remote database at the given uri.
 * @param {String} uri - The URI identifying the database we want to delete.
 * @returns {Number} - The HTTP status code returned by the attempt to delete
 * the database.
 */
exports.deleteRemoteDb = function(uri) {
  var client = new XMLHttpRequest();
  client.open("DELETE", uri, false);
  client.send();
  return client.status;
};

/**
 * Create a document in a remote database.
 * @param {String} uri - The URI identifying the database in which we want to
 * create the document.
 * @param {Object} document - An object representing the document to be created.
 * @returns {Number} - The HTTP status code returned by the attempt to create
 * the document.
 */
exports.createRemoteDocument = function(uri, document) {
  var client = new XMLHttpRequest();
  client.open("POST", uri, false);
  client.setRequestHeader("Content-Type", "application/json");
  client.send(JSON.stringify(document));
  return client.status;
};

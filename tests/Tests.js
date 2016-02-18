var dbCreate = require('cloudant-sync-tests.DBCreateTests');
var attachments = require('cloudant-sync-tests.AttachmentsTests');
var crud = require('cloudant-sync-tests.CRUDTests');
var indexAndQuery = require('cloudant-sync-tests.IndexAndQueryTests');
var replication = require('cloudant-sync-tests.ReplicationTests');
var datastoreTests = require('cloudant-sync-tests.DatastoreTests');

exports.defineAutoTests = function() {
  // Time out in milliseconds
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
  dbCreate.defineAutoTests();
  attachments.defineAutoTests();
  crud.defineAutoTests();
  indexAndQuery.defineAutoTests();
  replication.defineAutoTests();
  datastoreTests.defineAutoTests();
};

var dbCreate = require('cloudant-sync-tests.DBCreateTests' );
var attachments= require('cloudant-sync-tests.AttachmentsTests');
var crud = require('cloudant-sync-tests.CRUDTests');
var dbCreateEncrypted = require('cloudant-sync-tests.DBCreateEncryptedTests');
var indexAndQuery = require('cloudant-sync-tests.IndexAndQueryTests');
var replication = require('cloudant-sync-tests.ReplicationTests');

exports.defineAutoTests = function (){
    dbCreate.defineAutoTests();
     attachments.defineAutoTests();
     crud.defineAutoTests();
     dbCreateEncrypted.defineAutoTests();
     indexAndQuery.defineAutoTests();
     replication.defineAutoTests();
}

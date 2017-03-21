# Replication with Cloudant Sync

Replication is used to synchronise data between the local datastore and a
remote database, either a CouchDB instance or a Cloudant database. Many
datastores can replicate with the same remote database, meaning that
cross-device synchronisation is achieved by setting up replications from each
device to the remote database.

## Replication Scenarios

Replication is a flexible system for copying data between local and remote
databases. Each replication is in a single direction, copying differences either
from a local database to a remote database or a remote database to a local
database.

![Push and pull replications](images/replication-push-pull.png)

Often, a single local and remote database will be kept synchronised with each
other. For example, all a user's notes synchronised between a web application
and a device-based application. To fully synchronise data between two databases,
run a push *and* a pull replication. These can be run concurrently.

![Synchronising two databases](images/replication-sync.png)

Replication is not limited to a single pair of databases. If a user has several
devices, it's simple to set up replications between each device and a central
remote database to synchronise data between devices.

![Synchronising local database with two remote databases](images/replication-multi-local.png)

Less commonly but just as tenable, data can be sent from a single local
database to several remote databases:

![Synchronising local database with two remote databases](images/replication-multi-remote.png)

A final diagram shows how to replicate databases on the local
device with several different remote databases, even if they are on different
servers.

![Replicating local databases with several remotes](images/replication-many.png)

Overall, replication is very flexible and can be set up in many topologies.
In particular, many scenarios might only require a push or a pull replication:

* A data collection application might only need to use a push replication to
  replicate data from the device to a remote database -- there's no need for
  synchronisation and therefore no corresponding pull replication.
* If only a local data cache is required, using only a pull replication will
  keep local data up to date with remote data.

### Setting Up For Sync

Currently, the replication process requires a remote database to exist already.
To avoid exposing credentials for the remote system on each device, we recommend
creating a web service to authenticate users and set up databases for client
devices. This web service needs to:

* Handle sign in/sign up for users.
* Create a new remote database for a new user.
* Grant access to the new database for the new device (e.g., via [API keys][keys]
  on Cloudant or the `_users` database in CouchDB).
* Return the database URL and credentials to the device.

[keys]: https://cloudant.com/for-developers/faq/auth/

### Replication on the Device

From the device side, replication is straightforward. You can replicate from a
local datastore to a remote database, from a remote database to a local
datastore, or both ways to implement synchronisation.

Replications are set up in code on a device. Use `Replicator` with
the appropriate source and target options to configure and create
the object. Each `Replicator` object can register an event handler
for when replication completes or encounters an error.

In this example we replicate a local Datastore to a remote database:

```js
var Replicator = cordova.require('cloudant-sync.Replicator');

// Note datastore var assigned from openDatastore, see CRUD documentation

// Username/password are supplied in the URL and can be Cloudant API keys
var uri = 'https://apikey:apipasswd@username.cloudant.com/my_database';  

// Options object containing the source and target for push replication
var pushReplicatorOptions = {
    source: datastore,
    target: uri
}

Replicator.create(pushReplicatorOptions)
    .then(function (replicator) {

        // register event handlers
        replicator.on('complete', function (numDocs) {
            console.log('Replicated ' + numDocs + ' documents');
            // Destroy push replicator object
            replicator.destroy();
        });

        replicator.on('error', function (message) {
            console.error('Error replicating to remote: ' + message);
            // Destroy push replicator object
            replicator.destroy();
        });

        // start replication
        replicator.start();
    })
    .done();
```

And getting data from a remote database to a local one:
```js
var Replicator = cordova.require('cloudant-sync.Replicator');

// Note datastore var assigned from openDatastore, see CRUD documentation

// Username/password are supplied in the URL and can be Cloudant API keys
var uri = 'https://apikey:apipasswd@username.cloudant.com/my_database';   

// Options object containing the source and target for pull replication
var pullReplicatorOptions = {
    source: uri,
    target: datastore
}

// Create a replicator that replicates changes from the remote database
// to the local Datastore.
Replicator.create(pullReplicatorOptions)
    .then(function (replicator) {

        // register event handlers
        replicator.on('complete', function (numDocs) {
            console.log('Replicated ' + numDocs + ' documents');
            // Destroy pull replicator object
            replicator.destroy();
        });

        replicator.on('error', function (message) {
            console.error('Error replicating to remote: ' + message);
            // Destroy pull replicator object
            replicator.destroy();
        });

        // start replication
        replicator.start();

    }).done();
```

And running a full sync, that is, two one way replications:
```js
var Replicator = cordova.require('cloudant-sync.Replicator');

// Note datastore var assigned from openDatastore, see CRUD documentation

// Username/password are supplied in the URL and can be Cloudant API keys
var uri = 'https://apikey:apipasswd@username.cloudant.com/my_database';
var pushReplicator;
var pullReplicator;

// Options object containing the source and target for pull replication
var pullReplicatorOptions = {
    source: uri,
    target: datastore
}
// Options object containing the source and target for push replication
var pushReplicatorOptions = {
    source: datastore,
    target: uri
}

// Create a replicator that replicates changes from the remote database
// to the local Datastore.
Replicator.create(pullReplicatorOptions)
    .then(function (replicator) {
        pullReplicator = replicator;

        // Create a replicator that replicates changes from the local
        // Datastore to the remote database.
        return Replicator.create(pushReplicatorOptions);
    })
    .then(function (replicator) {
        pushReplicator = replicator;

        // register event handlers
        pushReplicator.on('complete', function (numDocs) {
            console.log('Push complete! Replicated ' + numDocs + ' documents.');
            // Destroy push replicator object
            pushReplicator.destroy();
        });

        pushReplicator.on('error', function (message) {
            console.error('Push failed! Error replicating to remote: ' + message);
            // Destroy push replicator object
            pushReplicator.destroy();
        });

        pullReplicator.on('complete', function (numDocs) {
            console.log('Pull complete! Replicated ' + numDocs + ' documents');

            // After pull replication completes, destroy pull replicator object
            // and start push replication
            pullReplicator.destroy();
            pushReplicator.start();
        });

        pullReplicator.on('error', function (message) {
            console.error('Pull failed! Error replicating to remote: ' + message);
            // Destroy pull replicator object
            pullReplicator.destroy();
        });

        // start pull replication
        pullReplicator.start();
    }).done();
```

Most applications should register event handlers for their replicators for the
`'complete'` and `'error'` events as in the examples above, so that they can
call the replicator's `destroy()` method to free resources after the replication
has ended.  You may, of course, also want your own handling such as updating
your application's interface with the new data after a replication has completed
or retrying the replication at a later time after an error.

The `'error'` event will be received by any event handlers registered for it when
replication fails, including failure due to the network becoming unreachable.

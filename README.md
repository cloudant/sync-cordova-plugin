# Cloudant Sync - Cordova Plugin

**Applications use Cloudant Sync to store, index and query local JSON data on a
device and to synchronise data between many devices. Synchronisation is under
the control of the application, rather than being controlled by the underlying
system. Conflicts are also easy to manage and resolve, either on the local
device or in the remote database.**

Cloudant Sync is an [Apache CouchDB&trade;][acdb]
replication-protocol-compatible datastore for
devices that don't want or need to run a full CouchDB instance. It's built
by [Cloudant](https://cloudant.com), building on the work of many others, and
is available under the [Apache 2.0 licence][ap2].

[ap2]: https://github.com/cloudant/sync-cordova-plugin/blob/master/LICENSE
[acdb]: http://couchdb.apache.org/

The API is quite different from CouchDB's; we retain the
[MVCC](http://en.wikipedia.org/wiki/Multiversion_concurrency_control) data
model but not the HTTP-centric API.

This is a Cordova plugin which wraps our [iOS][ios] and [Android][android]
libraries.

[ios]: https://github.com/cloudant/CDTDatastore
[android]: https://github.com/cloudant/sync-android

## Supported Platforms

* Android
* iOS

## Using in your project

Add this plugin to your project via the Cordova CLI. Optionally append the
`--save` argument to persist the changes in your application's `config.xml`.

<pre>
$ cordova plugin add https://github.com/cloudant/sync-cordova-plugin#<b><i>VERSION</i></b>
</pre>

where **_`VERSION`_** should be replaced by a released version of the
sync-cordova-plugin, e.g.:

<pre>
$ cordova plugin add https://github.com/cloudant/sync-cordova-plugin#0.3.0
</pre>

Note that you should always specify a [released version](https://github.com/cloudant/sync-cordova-plugin/releases). Failure to do so would
mean you may be working with an unreleased version of the plugin that may not
be stable.

### Adding Platforms

#### Android
Add Android as a platform
```console
$ cordova platform add android
```

Set the environment variable `ANDROID_BUILD` to gradle (e.g. on mac this is `export ANDROID_BUILD=gradle`)

#### iOS
Add iOS as a platform
```console
$ cordova platform add ios
```

### Running on an iOS device

To run the cordova app on an iOS device, the following steps are necessary:
1. Open the iOS project in Xcode (the app is in the `platforms/ios` subdirectory).
1. General > Signing > Team:<br/>
   Set the team so the app can be signed.
1. General > Linked Frameworks and Libraries:<br/>
   Remove `CocoaLumberjack.framework`, `CDTDatastore.framework`, `FMDB.framework`.
1. General > Embedded Binaries:<br/>
   Add `CocoaLumberjack.framework`, `CDTDatastore.framework`, `FMDB.framework`.
1. Build Phases > Embed Frameworks:<br/>
   Change “Destination” to `Shared Frameworks`.
1. Execute the command `cordova run ios`.
1. If necessary, accept the developer profile on the device by going to
   Settings > General > Profiles & Device Management > Developer App > <dev_profile>
   and clicking “Trust <dev_profile>” and re-run the app either on the device or
   by rerunning `cordova run ios`.

## Overview of the library

Once the plugin has been added to a project, the basics are:

Opening a Datastore
```js
var DatastoreManager = cordova.require('cloudant-sync.DatastoreManager');
var datastore;
DatastoreManager.DatastoreManager().then(function(datastoreManager) {
    return datastoreManager.openDatastore('my_datastore');
}).then(function(my_datastore){
    datastore = my_datastore;
}).done();
```

Creating documents
```js
var revision = {
    animal: "cat"
};

datastore.createDocumentFromRevision(revision)
    .then(function(saved) {

    }).done();
```

Add a file attachment
```js
var image = 'base64 encoded string';
saved._attachments = {
    image: {
        content_type: 'image/jpeg',
        data: image
    }
};

datastore.updateDocumentFromRevision(saved)
    .then(function (updated) {

    }).done();
```

Read a document
```js
datastore.getDocument(updated._id)
    .then(function (fetchedRevision) {

    }).done();
```

Read more in [the CRUD document](doc/crud.md).

### Replicating Data Between Many Devices

Replication is used to synchronise data between the local datastore and a
remote database, either a CouchDB instance or a Cloudant database. Many
datastores can replicate with the same remote database, meaning that
cross-device synchronisation is achieved by setting up replications from each
device the remote database.

Replication is simple to get started in the common cases:

```js
var Replicator = cordova.require('cloudant-sync.Replicator');

var uri = 'https://apikey:apipasswd@username.cloudant.com/my_database';

// Options object to create a pull replicator
var pullReplicatorOptions = {
    source: uri,
    target: datastore
};

// Replicate from the remote to local database
Replicator.create(pullReplicatorOptions).then(function (replicator) {
    replicator.start(); // Fire-and-forget (there are easy ways to monitor the state too)
}).done();
```

Read more in [the replication docs](doc/replication.md).

### Finding data

Once you have thousands of documents in a database, it's important to have
efficient ways of finding them. We've added an easy-to-use querying API. Once
the appropriate indexes are set up, querying is as follows:

```js
var query = {
    selector: {
        name: 'mike',
        pet: 'cat'
    }
};

datastore.find(query)
    .then(function (results) {
        results.forEach(function (revision) {
            // do something
        });
    }).done();
```

See [Index and Querying Data](doc/query.md).

### Conflicts

An obvious repercussion of being able to replicate documents about the place
is that sometimes you might edit them in more than one place at the same time.
When the databases containing these concurrent edits replicate, there needs
to be some way to bring these divergent documents back together. Cloudant's
MVCC data-model is used to do this.

A document is really a tree of the document and its history. This is neat
because it allows us to store multiple versions of a document. In the main,
there's a single, linear tree -- just a single branch -- running from the
creation of the document to the current revision. It's possible, however,
to create further branches in the tree. At this point your document is
conflicted and needs some surgery to resolve the conflicts and bring it
back to full health.

Learn more about this essential process in the
[conflicts documentation](doc/conflicts.md).

## Known Issues

None at this time

## Contributors

See [CONTRIBUTORS](CONTRIBUTORS).

## Contributing to the project

See [CONTRIBUTING](CONTRIBUTING.md).

## License

See [LICENSE](LICENSE).

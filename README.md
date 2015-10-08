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

This is a Cordova plugin which complements our [iOS][ios] and [Android][android] libraries.

[ios]: https://github.com/cloudant/CDTDatastore
[android]: https://github.com/cloudant/sync-android

If you have questions, please join our [mailing list][mlist] and drop us a
line.

[mlist]: https://groups.google.com/forum/#!forum/cloudant-sync

## Supported Platforms

* Android
* iOS

## Using in your project

Add this plugin to your project via the Cordova CLI.

```console
$ cordova plugin add https://github.com/cloudant/sync-cordova-plugin#:plugin
```

### Adding Platforms

#### Android
Add Android as a platform
```console
$ cordova platform add android
```

Set the environment variable `ANDROID_BUILD` to gradle (e.g. on mac this is `export ANDROID_BUILD=gradle`)

### iOS
Add iOS as a platform
```console
$ cordova platform add ios
```
Navigate to the generated iOS application
```console
$ cd platforms/ios/
```
Copy the preconfigured Podfile into your application
```console
$ cp ../../plugins/com.cloudant.toolkit/assets/Podfile .
```
Update CocoaPods and install
```console
$ sudo gem update pods
$ pod install
```
*Note: You may see the message below. It can be safely ignored.*
```console
[!] Please close any current Xcode sessions and use `YourAppName.xcworkspace` for this project from now on.

[!] The `YourAppName [Debug]` target overrides the `OTHER_LDFLAGS` build setting defined in `Pods/Target Support Files/Pods/Pods.debug.xcconfig'. This can lead to problems with the CocoaPods installation
    - Use the `$(inherited)` flag, or
    - Remove the build settings from the target.

[!] The `YourAppName [Release]` target overrides the `OTHER_LDFLAGS` build setting defined in `Pods/Target Support Files/Pods/Pods.release.xcconfig'. This can lead to problems with the CocoaPods installation
    - Use the `$(inherited)` flag, or
    - Remove the build settings from the target.
```

Next open your native iOS application
```console
$ open YourAppName.xcodeproj
```
Expand the navigator in Xcode then open a Finder window and locate `yourappname/platforms/ios/Pods`. Drag the `Pods.xcodeproject` project into the Xcode navigator of the **YourAppName** project.  This will add the **Pods** project as a subproject to **YourAppName**.

Next, go to the **Build Phases** of the **YourAppName** build target (under Targets not Project) and add `YourAppName->Pods->Pods` dependency.

Lastly, search for `Other Linker Flags` and add `$(inherited)` to the list.

<!-- TODO update link to sample
## Example application

There is a [sample application and a quickstart guide]().
 -->
## Overview of the library

Once the plugin has been added to a project, the basics are:

Opening a Datastore
```js
var DatastoreManager = require('com.cloudant.sync.DatastoreManager');

var datastore;
DatastoreManager.openDatastore('my_datastore')
    .then(function(my_datastore) {
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

Read more in [the CRUD document](plugin/doc/crud.md).

### Replicating Data Between Many Devices

Replication is used to synchronise data between the local datastore and a
remote database, either a CouchDB instance or a Cloudant database. Many
datastores can replicate with the same remote database, meaning that
cross-device synchronisation is achieved by setting up replications from each
device the the remote database.

Replication is simple to get started in the common cases:

```js
var ReplicatorBuilder = require('com.cloudant.sync.ReplicatorBuilder');

var uri = 'https://apikey:apipasswd@username.cloudant.com/my_database';

// Replicate from the local to remote database
var builder = new ReplicatorBuilder();
builder.push().from(datastore).to(uri).build()
    .then(function (replicator) {
        replicator.start(); // Fire-and-forget (there are easy ways to monitor the state too)
    }).done();
```

Read more in [the replication docs](plugin/doc/replication.md).

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

See [Index and Querying Data](plugin/doc/query.md).

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
[conflicts documentation](plugin/doc/conflicts.md).

## Known Issues

None at this time

## Contributors

See [CONTRIBUTORS](CONTRIBUTORS).

## Contributing to the project

See [CONTRIBUTING](CONTRIBUTING.md).

## License

See [LICENSE](LICENSE).

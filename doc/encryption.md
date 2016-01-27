# Datastore encryption

The Cloudant Sync Cordova Plugin is able to create encrypted datastores

## Encryption details
Data in Cloudant Sync is stored in two formats:

1. In SQLite databases, for JSON data and Query indexes.
1. In binary blobs on disk, for document attachments.

Both of these are encrypted using 256-bit AES in CBC mode. SQLite databases are encrypted using SQLCipher. Attachment data is encrypted using Apple’s [CommonCrypto][CommonCrypto] library for iOS and [JCE][JCE] for Android.

Our implementation is not currently FIPS 140-2 compliant.

## Using Encryption in your Application
### Android
Download the [SQLCipher for Android v3.2 or greater](https://www.zetetic.net/sqlcipher/open-source/) `.jar` and `.so` binary files and include them in `libs` folder of your native application. Then, add the required `ICU*` zip file to your native application's `assets` folder.

### iOS
Open your `Podfile` and replace `pod 'CDTDatastore', '0.17.1'` with `pod 'CDTDatastore/SQLCipher', '0.17.1'`

Then, update CocoaPods and install
```console
$ sudo gem update pods
$ pod install
```

## Secure Key Generation and Storage using Encryption Options
Opening an encrypted Datastore requires a JSONObject that specifies the encryption options. Currently, you must provide values for `password` and `identifier` to encrypt a Datastore. This generates a strong encryption key using the provided options which is then encrypted and stored on the device.

Example:

```js
var options = {
    password: 'passw0rd',
    identifier: 'toolkit'
};
DatastoreManager.openDatastore('my_datastore', options)
    .then(function (my_datastore) {

    });
```

One example of an identifier might be if multiple users share the same
device, the identifier can be used on a per user basis to store a key
to their individual database.

## Known issues

Below we list known issues and gotchas.

### Unexpected type: 5

If you use a version of SQLCipher for Android lower than 3.2, you may see an exception saving documents.
We've observed this on version 3.1. It seems to be to do with the column type IDs reported
by SQLite/SQLCipher not matching the constants defined in SQLCipher's Java code.

The exception has the form:

    java.util.concurrent.ExecutionException: java.lang.RuntimeException: Unexpected type: 5
            at java.util.concurrent.FutureTask.report(FutureTask.java:93)
            at java.util.concurrent.FutureTask.get(FutureTask.java:163)
            at com.cloudant.sync.datastore.BasicDatastore.createDocumentFromRevision(BasicDatastore.java:1824)
            ...
            at com.android.internal.os.ZygoteInit$MethodAndArgsCaller.run(ZygoteInit.java:903)
            at com.android.internal.os.ZygoteInit.main(ZygoteInit.java:698)
     Caused by: java.lang.RuntimeException: Unexpected type: 5
            at com.cloudant.sync.datastore.BasicDatastore.getFullRevisionFromCurrentCursor(BasicDatastore.java:1709)
            at com.cloudant.sync.datastore.BasicDatastore.getDocumentInQueue(BasicDatastore.java:284)
            at com.cloudant.sync.datastore.BasicDatastore.createDocument(BasicDatastore.java:681)
            at com.cloudant.sync.datastore.BasicDatastore.access$1500(BasicDatastore.java:65)
            at com.cloudant.sync.datastore.BasicDatastore$23.call(BasicDatastore.java:1816)
            at com.cloudant.sync.datastore.BasicDatastore$23.call(BasicDatastore.java:1812)
            at com.cloudant.sync.sqlite.SQLQueueCallable.call(SQLQueueCallable.java:34)
            at java.util.concurrent.FutureTask.run(FutureTask.java:237)
            at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1112)
            at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:587)
            at java.lang.Thread.run(Thread.java:818)

To fix this, make sure to download 3.2 or higher of SQLCipher's Android library code from
https://www.zetetic.net/sqlcipher/open-source/. The Android documentation on the SQLCipher
site links to 3.1 right now.

## Licence

We use the [CommonCrypto][CommonCrypto] and [JCE][JCE] libraries to encrypt attachments before
saving to disk. There should be no licensing concerns for using the libraries.

Databases are automatically encrypted with
[SQLCipher][SQLCipher]. SQLCipher requires including its
[BSD-style license][BSD-style license] and copyright in your application and
documentation. Therefore, if you use datastore encryption in your application,
please follow the instructions mentioned [here](https://www.zetetic.net/sqlcipher/open-source/).

[CommonCrypto]: https://developer.apple.com/library/mac/documentation/Darwin/Reference/ManPages/man3/Common%20Crypto.3cc.html
[SQLCipher]: https://www.zetetic.net/sqlcipher/
[JCE]: http://developer.android.com/reference/javax/crypto/package-summary.html
[BSD-style license]:https://www.zetetic.net/sqlcipher/license/

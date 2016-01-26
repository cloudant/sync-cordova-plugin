### Datastore and DatastoreManager objects

A `Datastore` object manages a set of JSON documents, keyed by ID.

The `DatastoreManager` module manages a directory where `Datastore` objects
store their data. It's a factory for named `Datastore` instances. A
named datastore will persist its data between application runs. Names are
arbitrary strings, with the restriction that the name must match
`^[a-zA-Z]+[a-zA-Z0-9_]*`.

The `DatastoreManager` directory is "hybriddatastores" across all platforms and is scoped to your application. This directory contains simple folders and SQLite databases if you want to take a peek.

Therefore, start by requiring the `DatastoreManager` module to manage datastores for
that given directory:

```js
var DatastoreManager = require('com.cloudant.sync.DatastoreManager');
```

Once you've required the `DatastoreManager`, it's straightforward to create Datastores:

```js
DatastoreManager.openDatastore('my_datastore')
    .then(function(my_datastore) {
        // do something with my_datastore
        return DatastoreManager.openDatastore('other_datastore');
    })
    .then(function (other_datastore) {
        // do something with other_datastore
    }).done();
```

The `DatabaseManager` handles creating and initialising non-existent
datastores, so the object returned is ready for reading and writing.

To delete a datastore:

```js
DatastoreManager.deleteDatastore("my_datastore")
    .then(function () {
        // my_datastore successfully deleted
    });
```

It's important to note that this doesn't check there are any active
`Datastore` objects for this datastore. The behaviour of active `Datastore`
objects after their underlying files have been deleted is undefined.

### Document CRUD APIs

Once you have a `Datastore` instance, you can use it to create, update and
delete documents.


### Create

Documents are represented as a set of revisions. To create a document, you
set up the initial revision of the document and save that to the datastore.

Create a mutable document revision object, set its body, ID and attachments
and then call `createDocumentFromRevision(documentRevision)` to add it to the datastore:

```js
// Create a document
var rev = {};
rev._id = "doc1"; // Or don't assign the _id property, we'll generate one

// Build up body content
rev.description = 'Buy milk';
rev.completed = false;
rev.type = 'com.cloudant.sync.example.task';

datastore.createDocumentFromRevision(rev)
    .then(function (savedRevision) {
        // do something with savedRevision
    }).done();
```

### Retrieve

Once you have created one or more documents, retrieve them by ID:

```js
var docId = revision._id;
datastore.getDocument(docId)
    .then(function (fetchedRevision) {
        // do something with fetchedRevision
    }).done();
```

### Update

To update a document, make your changes on the most recent revision and save the document:

```js
fetchedRevision.completed = true;

datastore.updateDocumentFromRevision(fetchedRevision)
    .then(function (updatedRevision) {
        // do something with updatedRevision
    }).done();
```

### Delete

To delete a document, you need the current revision:

```js
datastore.deleteDocumentFromRevision(updatedRevision)
    .then(function (deletedRevision) {
        // do something with updatedRevision
    }).done();
```

## Indexing

You don't need to know the ID of the document to retrieve it. Datastore
provides ways to index and search the fields of your JSON documents.
For more, see [index-query.md](index-query.md).

<!-- TODO implement API to resolve conflicts
 ## Conflicts

## Getting all documents

The `getAllDocuments()` method allows iterating through all documents in the
database:

```java
// read all documents in one go
int pageSize = ds.getDocumentCount();
List<DocumentRevision> docs = ds.getAllDocuments(0, pageSize, true);
``` -->

## Using attachments

You can associate attachments with the JSON documents in your datastores.
Attachments are blobs of binary data, such as photos or short sound snippets.
They should be of small size -- maximum a few MB -- because they are
replicated to and from the server in a way which doesn't allow for resuming
an upload or download.

Attachments are stored in the `_attachments` property of a document revision
object. This is a map of attachments, keyed by attachment name.

To add an attachment to a document, just add (or overwrite) the attachment
in `_attachments`:

```js
// Create a new document or get an existing one
var rev = {};

// As with the document body, you can replace the attachments
rev._attachments = {};

// Or just add or update a single one:
rev._attachments['cute_cat.jpg'] = {
    content_type: 'image/jpeg',
    data: "Attachment data must be a Base64 encoded String"
};

datastore.createDocumentFromRevision(rev)
    .then(function (savedRevision) {
        // do something with saved revision
    }).done();
```

To read an attachment, hydrate the Base64 encoded 'data' value for the desired attachment in the `_attachments`
map.

```js
var data = savedRevision._attachments['cute_cat.jpg'].data;
```

To remove an attachment, remove it from the `_attachments` map:

```js
delete savedRevision._attachments['cute_cat.jpg'];
```

To remove all attachments, delete the `_attachments` property or set it to an empty map
or `null`:

```js
savedRevision._attachments = null;
```

## Cookbook

This section shows all the ways (that I could think of) that you can update,
modify and delete documents.

### Creating a new document

This is the simplest case as we don't need to worry about previous revisions.

1. Add a document with body, but not attachments or ID. You'll get an
   autogenerated ID.
    ```js
    var rev = {
        foo: 'bar'
    };

    datastore.createDocumentFromRevision(rev)
        .then(function (savedRevision) {
            // do something with savedRevision
        }).done();
    ```

1. Add a new document to the store with a body and ID, but without attachments.
    ```js
    var rev = {
        _id: 'doc1',
        foo: 'bar'
    };

    datastore.createDocumentFromRevision(rev)
        .then(function (savedRevision) {
            // do something with savedRevision
        }).done();
    ```

1. Add a new document to the store with attachments.
    ```js
    var rev = {
        _id: 'doc1',
        foo: 'bar',
        _attachments: {
            'image.jpg': {
                content_type: 'image/jpeg',
                data: "Attachment data must be a Base64 encoded String"
            }
        }
    };

    datastore.createDocumentFromRevision(rev)
        .then(function (savedRevision) {
            // do something with savedRevision
        }).done();
    ```

1. Add a document with body and attachments, but no ID. You'll get an
   autogenerated ID.
    ```js
    var rev = {
        foo: 'bar',
        _attachments: {
            'image.jpg': {
                content_type: 'image/jpeg',
                data: "Attachment data must be a Base64 encoded String"
            }
        }
    };

    datastore.createDocumentFromRevision(rev)
        .then(function (savedRevision) {
            // do something with savedRevision
        }).done();
    ```

### Updating a document

To update a document, make your changes to the winning revision and save the document.

For the first set of examples the original document is set up with a body
and no attachments:

```js
var rev = {
    _id: 'doc1',
    foo: 'bar'
};

datastore.createDocumentFromRevision(rev)
    .then(function (savedRevision) {
        // do something with savedRevision
    }).done();
```

We also assume an attachment ready to be added:

```js
var att1 = {
    content_type: 'image/jpeg',
    data: base64EncodedString
}
```

1. Update body for doc that has no attachments, adding no attachments
    ```js
    savedRevision.bar = 'foo';

    datastore.updateDocumentFromRevision(savedRevision)
        .then(function (updatedRevision) {
            // do something with updated revision
        }).done();
    ```

1. Update body for doc with no attachments, adding attachments. Here we see
   that a mutableCopy of a document with no attachments has an
   `HashMap` set for its `attachments` property.
    ```js
    savedRevision.bar = 'foo';
    savedRevision._attachments = {
        'image.jpg': att1
    };

    datastore.updateDocumentFromRevision(savedRevision)
        .then(function (updatedRevision) {
            // do something with updated revision
        }).done();
    ```

1. Update body for doc with no attachments, removing attachments dictionary
   entirely.
    ```js
    savedRevision.bar = 'foo';
    savedRevision._attachments = null;

    datastore.updateDocumentFromRevision(savedRevision)
        .then(function (updatedRevision) {
            // do something with updated revision
        }).done();
    ```

1. Update the attachments without changing the body, add attachments to a doc
   that had none.
    ```js
    savedRevision._attachments = {
        'image.jpg': att1
    };

    datastore.updateDocumentFromRevision(savedRevision)
        .then(function (updatedRevision) {
            // do something with updated revision
        }).done();
    ```

1. Update attachments by copying from another revision.
    ```js
    savedRevision._attachments = anotherDoc._attachments;

    datastore.updateDocumentFromRevision(savedRevision)
        .then(function (updatedRevision) {
            // do something with updated revision
        }).done();
    ```

1. Updating a document using an outdated source revision causes a conflict
    ```js
    // Note: clone() represents a function that makes a deep copy of the object
    var update1 = clone(savedRevision);
    var update2 = clone(savedRevision);

    udpate1.bar = 'foo';
    update2.bar = 'foobar';

    datastore.updateDocumentFromRevision(update1)
        .then(function (updatedRevision) {
            return datastore.updateDocumentFromRevision(update2);
        })
        .catch(function (error) {
            // Returns a conflict error
        }).done();
    ```

For the second set of examples the original document is set up with a body and
several attachments:

```js
var rev = {
    _id: 'doc1',
    food: 'bar',
    _attachments:{
        att1: att1,
        att2: att2,
        att3, att3
    }
};

datastore.createDocumentFromRevision(rev)
    .then(function (savedRevision) {

    }).done();
```

1. Update body without changing attachments
    ```js
    savedRevision.bar = 'foo';

    datastore.updateDocumentFromRevision(savedRevision)
        .then(function (updatedRevision) {
            // Should have the same attachments
        }).done();
    ```

1. Update the attachments without changing the body, remove attachments
    ```js
    delete savedRevision._attachments.att1;

    datastore.updateDocumentFromRevision(savedRevision)
        .then(function (updatedRevision) {

        }).done();
    ```

1. Update the attachments without changing the body, add attachments
    ```js
    // Create att100 attachment
    savedRevision._attachments.att100 = att100;

    datastore.updateDocumentFromRevision(savedRevision)
        .then(function (updatedRevision) {

        }).done();
    ```

1. Update the attachments without changing the body, remove all attachments
   by setting `null` for attachments map.
    ```js
    savedRevision._attachments = null;

    datastore.updateDocumentFromRevision(savedRevision)
        .then(function (updatedRevision) {

        }).done();
    ```

1. Update the attachments without changing the body, remove all attachments
   by setting an empty object.
    ```js
    savedRevision._attachments = {};

    datastore.updateDocumentFromRevision(savedRevision)
        .then(function (updatedRevision) {

        }).done();
    ```

1. Copy an attachment from one document to another.
    ```js
    // Note: clone() represents a function that makes a deep copy of the object
    var attCopy = clone(anotherRevision._attachments['nameOfAttachment']);
    MutableDocumentRevision rev = new MutableDocumentRevision();

    // Add copy of attachment to "savedRevision"
    savedRevision._attachments['nameOfAttachment'] = attCopy;

    datastore.updateDocumentFromRevision(savedRevision)
        .then(function (updatedRevision) {

        }).done();
    ```

### Deleting a document

1. You should be able to delete a given revision (i.e., add a tombstone to the end of the branch).

    ```js
    datastore.getDocument("doc1")
        .then(function (fetchedRevision) {
            return datastore.deleteDocumentFromRevision(fetchedRevision);
        })
        .then(function (deletedRevision) {

        }).done();
    ```

    This would refuse to delete if `fetchedRevision` was not a leaf node.


<!-- TODO Implement deleteDocument(docId) API
 1. **Advanced** You should also be able to delete a document in its entirety by passing in an ID.

    ```java
    DocumentRevision deleted = datastore.deleteDocument("doc1");
    ```

    This marks *all* leaf nodes deleted. Make sure to read
    [conflicts.md](conflicts.md) before using this method as it can result
    in data loss (deleting conflicted versions of documents, not just the
    current winner). -->

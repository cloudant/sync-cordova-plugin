# Cloudant Query

[Cloudant Query][1] is inspired by MongoDB's query implementation, so users of MongoDB should feel at home using [Cloudant Query][1] in their mobile applications.

The aim is that the query you use on our cloud-based database works for your mobile application.

[1]: https://docs.cloudant.com/api/cloudant-query.html

## Usage

These notes assume familiarity with Cloudant Sync Datastore.

Cloudant Query uses indexes explicitly defined over the fields in the document. Multiple indexes can be created for use in different queries, the same field may end up indexed in more than one index.

Query offers a powerful way to find documents within your datastore. There are a couple of restrictions on field names you need to be aware of before using query:

- A dollar sign (`$`) cannot be the first character of any field name.  This is because, when querying, a dollar sign tells the query engine to handle the object as a query operator and not a field.
- A field with a name that contains a period (`.`) cannot be indexed nor successfully queried.  This is because the query engine assumes dot notation refers to a sub-object.

These come from Query's MongoDB heritage where these characters are not allowed in field names, which we don't share. Hopefully we'll work around these restrictions in the future.

Querying is carried out by supplying a query in the form of a map which describes the query.

For the following examples, assume these documents are in the datastore:

```js
{ "name": "mike",
  "age": 12,
  "pet": { "species": "cat" },
  "comment": "Mike goes to middle school and likes reading books." };

{ "name": "mike",
  "age": 34,
  "pet": {"species": "dog"},
  "comment": "Mike is a doctor and likes reading books." };

{ "name": "fred",
  "age": 23,
  "pet": {"species": "cat"},
  "comment": "Fred works for a startup out of his home office." };
```

### Creating Indexes

In order to query documents, creating indexes over the fields to be queried against will typically enhance query performance.  Currently we support a JSON index, which is used by query clauses containing comparison operators like `$eq`, `$lt`, and `$gt`. Query clauses containing these operators are based on standard SQLite indexes to provide query results.

Basic querying of fields benefits but does _not require_ a JSON index. For example, `{ "name" : { "$eq" : "mike" } }` would benefit from a JSON index on the `name` field but would succeed even if there isn't an index on `name`.

Use the following method to create a JSON index:

```
datastore.ensureIndexed(fieldNames, indexName)
```

These indexes are persistent across application restarts as they are saved to disk. They are kept up to date as documents change; there's no need to call the `ensureIndexed(...)` method each time your applications starts, though there is no harm in doing so.

The first argument, `fieldNames` is a list of fields to put into the index. The second argument, `indexName` is a name for the index. This is used to delete indexes at a later stage.

A field can appear in more than one index. The query engine will select an appropriate index to use for a given query. However, the more indexes you have, the more disk space they will use and the greater the overhead in keeping them up to date.

To index values in sub-documents, use _dotted notation_. This notation puts the field names in the path to a particular value into a single string, separated by dots. Therefore, to index the `species` field of the `pet` sub-document in the examples above, use `pet.species`.

```js
// Create an index over the name, age, and species fields.
datastore.ensureIndexed(["name", "age", "pet.species"], "basic")
    .then(function (indexName) {
        // index created with indexName = "basic"
    });
```

####Changing and removing indexes

If an index needs to be changed, first delete the existing index by calling `deleteIndexNamed(indexName)` where the argument is the index name, then call the appropriate `ensureIndexed(...)` method with the new definition.

#### Indexing document metadata (\_id and \_rev)

The document ID and revision ID are automatically indexed under `_id` and `_rev`
respectively. If you need to query on document ID or document revision ID,
use these field names.

#### Indexing array fields

Indexing of array fields is supported. See "Array fields" below for the indexing and
querying semantics.

### Querying syntax

Query documents are JSON objects that use the [Cloudant Query `selector`][sel]
syntax. Several features of Cloudant Query are not yet supported in this implementation.
See below for more details.

[sel]: https://docs.cloudant.com/api/cloudant-query.html#selector-syntax

#### Equality and comparisons

To query for all documents where `pet.species` is `cat`:

```js
var query = {
    selector: {
        "pet.species": "cat"
    }
};
```

If you don't specify a condition for the clause, equality (`$eq`) is used. To use other conditions, supply them explicitly in the clause.

To query for documents where `age` is greater than twelve use the `$gt` condition:

```js
var query = {
    selector: {
        age: { $gt: 12 }
    }
};
```

See below for supported operators (Selections -> Conditions).

#### Modulo operation in queries

Using the `$mod` operator in queries allows you to select documents based on the value of a field divided by an integer yielding a specific remainder.

To query for documents where `age` divided by 5 has a remainder of  4, do the following:

```js
var query = {
    selector: {
        age: { $mod: [ 5, 4 ] }
    }
};
```

A few things to keep in mind when using `$mod` are:

- The list argument to the `$mod` operator must contain two number elements. The first element is the divisor and the second element is the remainder.
- Division by zero is not allowed so the divisor cannot be zero.
- The dividend (field value), divisor, and the remainder can be positive or negative.
- The dividend, divisor, and the remainder can be represented as whole numbers or by using decimal notation.  However internally, prior to performing the modulo arithmetic operation, all three are truncated to their logical whole number representations.  So, for example, the selector `{ "age": { "$mod": [ 5.6, 4.2 ] } }` will provide the same result as the selector `{ "age": { "$mod": [ 5, 4 ] } }`.

#### Compound queries

Compound queries allow selection of documents based on more than one criteria.  If you specify several clauses, they are implicitly joined by AND.

To find all people named `fred` with a `cat` use:

```js
var query = {
    selector: {
        name: "fred",
        pet.species: "cat"
    }
};
```

##### Using OR to join clauses

Use `$or` to find documents where just one of the clauses match.

To find all people with a `dog` or who are under thirty:

```js
var query = {
    selector: {
        $or: [
            { pet.species: { $eq: "dog" } },
            { age: { $lt: 30 } }
        ]
    }
};
```

#### Using AND and OR in queries

Using a combination of AND and OR allows the specification of complex queries.

This selects documents where _either_ the person has a pet `dog` _or_ they are
both over thirty _and_ named `mike`:

```js
var query = {
    selector: {
        $or: [
            { pet.species: { $eq: "dog" }},
            { $and: [
                { age: { $gt: 30 } },
                { name: { $eq: "mike" } }
            ]}
        ]
    }
};
```

### Executing queries

To find documents matching a query, use the `Datastore` object's `find(query)` method. This returns an array containing your query results.

```js
datastore.find(query)
    .then(function (results) {
        results.forEach(function (result) {
            // Do something with result
        });
    }).done();
```

There are options for the `find` method which support:

- Sorting results.
- Projecting fields from documents rather than returning whole documents.
- Skipping results.
- Limiting the number of results returned.

For any of these, use

```js
var query = {
    selector: selectorClause,
    skip: numberOfResultsToSkip,
    limit: numberOfResultsToReturn,
    fields: anArrayOfFieldNamesToProject,
    sort: anArrayOfSortOptions
});
```

#### Sorting

Provide a sort document to the `find` method to sort the results of a query.

The sort document is a list of fields to sort by. Each field is represented by a map specifying the name of the field to sort by and the direction to sort.

The sort document must use fields from a single index.

As yet, you can't leave out the sort direction. The sort direction can be `asc` (ascending) or `desc` (descending).

```js
var query = {
    selector: {},
    sort: [ { "name": "asc" },
            { "age": "desc" }
    ]
};
```

#### Projecting fields

Projecting fields is useful when you have a large document and only need to use a
subset of the fields for a given view.

To project certain fields from the documents included in the results, pass a list of field names to the `fields` argument. These field names:

- Must be top level fields in the document.
- Cannot use dotted notation to access sub-documents.

For example, in the following document the `name`, `age` and `pet` fields could be projected, but the `species` field inside `pet` cannot:

```json
{
    "name": "mike",
    "age": 12,
    "pet": { "species": "cat" }
}
```

To project the `name` and `age` fields of the above document:

```js
var query = {
    selector: {},
    fields: [ "name", "age" ]
};
```

#### Skip and limit

Skip and limit allow retrieving subsets of the results. Amongst other things, this is useful in pagination.

* `skip` skips over a number of results from the result set.
* `limit` defines the maximum number of results to return for the query.

To display the twenty-first to thirtieth results:

```js
var query = {
    selector: {},
    skip: 20,
    limit: 10
};
```

### Array fields

Indexing and querying over array fields is supported by this query engine, with some caveats.

Take this document as an example:

```js
{
  _id: 'mike32'
  pet: [ 'cat', 'dog', 'parrot' ],
  name: 'mike',
  age: 32
}
```

You can create an index over the `pet` field:

```js
datastore.ensureIndexed(["name", "age", "pet"], "basic")
    .then(function (indexName) {
        console.log('Successfuly created index: ' + indexName);
    });
```

Each value of the array is treated as a separate entry in the index. This means that a query such as:

```js
{ pet: { $eq: 'cat' } }
```

Will return the document `mike32`. Negation such as:

```js
{ pet: { $not: { $eq: 'cat' } } }
```

Will not return `mike32` because negation returns the set of documents that are not in the set of documents returned by the non-negated query.  In other words the negated query above will return all of the documents that are not in the set of documents returned by `{ pet: { $eq: cat } }`.

#### Restrictions

Only one field in a given index may be an array. This is because each entry in each array
requires an entry in the index, causing a Cartesian explosion in index size. Taking the
above example, this document wouldn't be indexed because the `name` and `pet` fields are
both indexed in a single index:

```
{
  _id: 'mike32'
  pet: [ 'cat', 'dog', 'parrot' ],
  name: [ 'mike', 'rhodes' ],
  age: 32
}
```

If this happens, an error will be emitted into the log but the indexing process will be
successful.

However, if there was one index with `pet` in and another with `name` in, like this:

```js
datastore.ensureIndexed(["name", "age"], "index_one");
datastore.ensureIndexed(["age", "pet"], "index_two");
```

The document _would_ be indexed in both of these indexes: each index only contains one of
the array fields.

Also see "Unsupported features", below.


### Errors

Error reporting is somewhat lacking right now. Presently a `null` return value from the `find` methods or the `ensureIndexed(fieldNames, String indexName)` method indicates that something went wrong. Any errors that are encountered are logged but exceptions are not thrown as of yet.

## Supported Cloudant Query features

Right now the list of supported features is:

- Create compound indexes using dotted notation that index JSON fields.
- Delete index by name.
- Execute nested queries.
- Limiting returned results.
- Skipping results.
- Queries can include unindexed fields.
- Queries can include a text search clause, although if they do no unindexed fields may be used.

Selectors -> combination

- `$and`
- `$or`

Selectors -> Conditions -> Equalities

- `$lt`
- `$lte`
- `$eq`
- `$gte`
- `$gt`
- `$ne`

Selectors -> combination

- `$not`

Selectors -> Condition -> Objects

- `$exists`

Selectors -> Condition -> Misc

- `$text` in combination with `$search`
- `$mod`

Selectors -> Condition -> Array

- `$in`
- `$nin`
- `$size`


Implicit operators

- Implicit `$and`.
- Implicit `$eq`.

Arrays

- Indexing individual values in an array.
- Querying for individual values in an array.

## Unsupported Cloudant Query features

As this is an early version of Query on this platform, some features are
not supported yet. We're actively working to support features -- check
the commit log :)

### Query

Overall restrictions:

- Cannot use covering indexes with projection (`fields`) to avoid loading
  documents from the datastore.

#### Query syntax

- Using non-dotted notation to query sub-documents.
    - That is, `{"pet": { "species": {"$eq": "cat"} } }` is unsupported,
      you must use `{"pet.species": {"$eq": "cat"}}`.
- Cannot use multiple conditions in a single clause, `{ field: { $gt: 7, $lt: 14 } }`.

Selectors -> combination

- `$nor` (unplanned)
- `$all` (unplanned)
- `$elemMatch` (unplanned)

Selectors -> Condition -> Objects

- `$type` (unplanned)

Selectors -> Condition -> Misc

- `$regex` (unplanned, waiting on filtering)


Arrays

- Dotted notation to index or query sub-documents in arrays.
- Querying for exact array match, `{ field: [ 1, 3, 7 ] }`.
- Querying to match a specific array element using dotted notation, `{ field.0: 1 }`.
- Querying using `$all`.
- Querying using `$elemMatch`.


## Performance

### Indexing

Not carried out yet.


## Grammar

To help, I've tried to write a grammar/schema for the Query language.

Here:

* Bold is used for the JSON formatting (or to indicate the representation of the use of Map, List etc. in Java).
* Italic is variables in the grammar-like thing.
* Quotes enclose literal string values.

<pre>
<em>query</em> :=
    <strong>{ }</strong>
    <strong>{</strong> <em>many-expressions</em> <strong>}</strong>

<em>many-expressions</em> := <em>expression</em> (&quot;,&quot; <em>expression</em>)*

<em>expression</em> :=
    <em>compound-expression</em>
    <em>comparison-expression</em>
    <em>text-search-expression</em>

<em>compound-expression</em> :=
    <strong>{</strong> (&quot;$and&quot; | &quot;$nor&quot; | &quot;$or&quot;) <strong>:</strong> <strong>[</strong> <em>many-expressions</em> <strong>] }</strong>  // nor not implemented

<em>comparison-expression</em> :=
    <strong>{</strong> <em>field</em> <strong>:</strong> <strong>{</strong> <em>operator-expression</em> <strong>} }</strong>

<em>negation-expression</em> :=
    <strong>{</strong> &quot;$not&quot; <strong>:</strong> <strong>{</strong> <em>operator-expression</em> <strong>} }</strong>

<em>operator-expression</em> :=
    <em>negation-expression</em>
    <strong>{</strong> <em>operator</em> <strong>:</strong> <em>simple-value</em> <strong>}</strong>
    <strong>{</strong> &quot;$regex&quot; <strong>:</strong> <em>Pattern</em> <strong>}</strong>  // not implemented
    <strong>{</strong> &quot;$mod&quot; <strong>:</strong> <strong>[</strong> <em>non-zero-number, number</em> <strong>] }</strong>
    <strong>{</strong> &quot;$elemMatch&quot; <strong>: {</strong> <em>many-expressions</em> <strong>} }</strong>  // not implemented
    <strong>{</strong> &quot;$size&quot; <strong>:</strong> <em>positive-integer</em> <strong>}</strong>
    <strong>{</strong> &quot;$all&quot; <strong>:</strong> <em>array-value</em> <strong>}</strong>  // not implemented
    <strong>{</strong> &quot;$in&quot; <strong>:</strong> <em>array-value</em> <strong>}</strong>
    <strong>{</strong> &quot;$nin&quot; <strong>:</strong> <em>array-value</em> <strong>}</strong>
    <strong>{</strong> &quot;$exists&quot; <strong>:</strong> <em>boolean</em> <strong>}</strong>
    <strong>{</strong> &quot;$type&quot; <strong>:</strong> <em>type</em> <strong>}</strong>  // not implemented

<em>text-search-expression</em> :=
    <strong>{</strong> &quot;$text&quot; <strong>:</strong><strong> {</strong> &quot;$search&quot; <strong>:</strong> <em>string-value</em> <strong>}</strong> <strong>}</strong>

<em>operator</em> := &quot;$gt&quot; | &quot;$gte&quot; | &quot;$lt&quot; | &quot;$lte&quot; | &quot;$eq&quot; | &quot;$ne&quot;

// Obviously List, but easier to express like this
<em>array-value</em> := <strong>[</strong> simple-value (&quot;,&quot; simple-value)+ <strong>]</strong>

// Java mappings of basic types

<em>field</em> := <em>String</em>  // a field name

<em>simple-value</em> := <em>String</em> | <em>Number</em>

<em>string-value</em> := <em>String</em>

<em>number</em> := <em>NSNumber</em>

<em>non-zero-number</em> := <em>NSNumber</em>

<em>positive-integer</em> := <em>Integer</em>

<em>boolean</em> := <em>Boolean</em>

<em>type</em> := <em>Class</em>
</pre>

# Contributing
Cloudant-sync is a cordova plug-in which wraps [Cloudant Sync - Android Datastore](https://github.com/cloudant/sync-android)
And [CDTDatastore](https://github.com/cloudant/CDTDatastore).

## Contributor License Agreement

In order for us to accept pull-requests, the contributor must first complete
a Contributor License Agreement (CLA). This clarifies the intellectual
property license granted with any contribution. It is for your protection as a
Contributor as well as the protection of IBM and its customers; it does not
change your rights to use your own Contributions for any other purpose.

This is a quick process: one option is signing using Preview on a Mac,
then sending a copy to us via email. Signing this agreement covers a few repos
as mentioned in the appendix of the CLA.

You can download the CLAs here:

 - [Individual](http://cloudant.github.io/cloudant-sync-eap/cla/cla-individual.pdf)
 - [Corporate](http://cloudant.github.io/cloudant-sync-eap/cla/cla-corporate.pdf)

If you are an IBMer, please contact us directly as the contribution process is
slightly different.

## Requirements
- [Node.js&reg;](https://nodejs.org)
- [CouchDB](http://couchdb.apache.org/)
  * OSX - `brew install couchdb`
  * Ubuntu - `sudo apt-get install couchdb`

## Project Structure
- plugin.xml - Defines the structure of the plugin
- package.json - package metadata and dependency information
- node_modules - npm dependency downloads (after running `npm install`)
- docs - Product documentation
- src
  * ios - iOS plug-in resources
  * android - Android plug-in resources
- tests - A plug-in which contains the tests.
  * plugin.xml - Test plugin's plugin.xml
  * test.js - The file which exposes all the tests to the framework.
  * \*.js JavaScript tests
- www - Plugin source code

## Setup
From the project's root folder you can run:
- `npm install` to install the dependencies & devDependencies (required to compile
   or run tests)
- `npm run compile` to build the native code (e.g. to check that new
  functions compile correctly)
    - Use `npm run compile-platform -- 'ios'` or `npm run compile-platform -- 'android'`
     to just compile for a specific platform
- `npm run lint` to check the javascript files


## Testing
Our tests run using [cordova-plugin-test-framework](https://github.com/apache/cordova-plugin-test-framework) via [cordova-paramedic](https://github.com/apache/cordova-paramedic), but this can be handled automatically
by `npm` scripts.

Before running the tests:
- Run `npm install` to get the devDependencies

Before running any tests your local CouchDB will need to have a copy of animalDB, this can be replicated
to your local CouchDB running on 5984 by running the setup.rb script in the root of the repo.

Run the tests with
- `npm test` to run the tests (for both platforms)
    - Use `npm run test-platform -- 'ios'` or `npm run test-platform -- 'android'`
     to test a specific platform

If you want to run with a specific platform version (the defaults are `ios` and `android`)
you can run the cordova-paramedic command directly. Example: Running the tests on
Android using cordova-android 5.0.x engine. Note: this command must be run in
the root of the checkout.
```sh
$  cordova-paramedic --platform 'android@5.0' --plugin . --verbose
```

## Adding tests
Tests should be placed in the `plugin/tests` directory.  To add a new test file
you create a new JavaScript file. You then include it in the `tests.js` file,
pulling in the module via require. You must then call the exported function from
the test case file in the `defineAutoTests` function in the `tests.js` file.

```js
// ...
var test = require('cloudant-sync-tests.newtests');
// ...

exports.defineAutoTests = function() {
    // ...
    test();
    // ...
}
```

## Code Style

We follow the nodejs code style, with some modifications. JSCS is our tool of
choice for enforcing code style, and the CI checks to ensure it is followed.

Some other aspects of the style are to avoid errors such as using `===` instead of
`==` for comparisons . These are enforced by jshint.

Read the .jscsrc and .jshintrc files for the exact rules that are enforced.

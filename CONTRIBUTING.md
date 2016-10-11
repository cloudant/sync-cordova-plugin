# Contributing
This document covers information for contributing to this project.

## Development Requirements
- [Node.js&reg;](https://nodejs.org)
- [Cordova Command Line Interface](http://cordova.apache.org/docs/en/4.0.0/guide_cli_index.md.html#The%20Command-Line%20Interface)
  * Run `sudo npm install -g cordova`
- [CouchDB](http://couchdb.apache.org/)
  * OSX - `brew install couchdb`
  * Ubuntu - `sudo apt-get install couchdb`

## Project Structure
- plugin.xml - Defines the structure of the plugin
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
- `npm run-script compile` to build the native code (e.g. to check that new
  functions compile correctly)
    - Use `compile-ios` or `compile-android` to just compile for a specific platform

## Testing
Our tests run using [cordova-plugin-test-framework](https://github.com/apache/cordova-plugin-test-framework) via [cordova-paramedic](https://github.com/apache/cordova-paramedic), but this can be handled automatically
by `npm` scripts.

Before running the tests:
- Run `npm install` to get the devDependencies (i.e. `cordova-paramedic`)

Before running any tests your local CouchDB will need to have a copy of animalDB, this can be replicated
to your local CouchDB running on 5984 by running the setup.rb script in the root of the repo.

Run the tests with
- `npm test` to run the tests (for both platforms)
    - Use `npm run-script test-ios` or `npm run-script test-android` to test
     a specific platform

If you want to run with a specific platform (the defaults are `ios` and `android`)
you can run the cordova-paramedic command directly. Example: Running the tests on
 Android using 5.0.x engine. Note: this command must be run in the root of the checkout.
```sh
$  cordova-paramedic --platform 'android@5.0' --plugin . --verbose
```

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

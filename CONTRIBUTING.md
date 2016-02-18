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
 <!-- Tell it how to run a node script here.-->

## Testing
Our tests run using [cordova-plugin-test-framework](https://github.com/apache/cordova-plugin-test-framework).  
You can run tests by using [cordova-paramedic](https://github.com/purplecabbage/cordova-paramedic)
however, in order to specify the platform version you will need to use [this fork](https://github.com/rhyshort/cordova-paramedic)
which can be installed via npm.
```sh
$  npm install -g "git+ssh://git@github.com:rhyshort/cordova-paramedic.git"
```
Before running any tests your local CouchDB will need to have a copy of animalDB, this can be replicated
to your local CouchDB running on 5984 by running the setup.rb script in the root of the repo.

Example: Running the tests on Android using 5.0.x engine. Note: this command must
be run in the root of the checkout.
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

# Contributing
Cloudant-sync is a cordova plug-in which wraps [Cloudant Sync - Android Datastore](https://github.com/cloudant/sync-android)
And [CDTDatastore](https://github.com/cloudant/CDTDatastore).

## Developer Certificate of Origin

In order for us to accept pull-requests, the contributor must sign-off a
[Developer Certificate of Origin (DCO)](DCO1.1.txt). This clarifies the
intellectual property license granted with any contribution. It is for your
protection as a Contributor as well as the protection of IBM and its customers;
it does not change your rights to use your own Contributions for any other purpose.

Please read the agreement and acknowledge it by ticking the appropriate box in the PR
 text, for example:

- [x] Tick to sign-off your agreement to the Developer Certificate of Origin (DCO) 1.1

## Requirements
- [Node.js](https://nodejs.org)
- [CouchDB](http://couchdb.apache.org/)
  * OSX - `brew install couchdb`
  * Ubuntu - `sudo apt-get install couchdb`

## Project Structure
- plugin.xml - Defines the structure of the plugin
- package.json - package metadata and dependency information
- node_modules - npm dependency downloads (after running `npm install`)
- doc - Product documentation
- src
  * ios - iOS plug-in resources
  * android - Android plug-in resources
- tests - A plug-in which contains the tests.
  * plugin.xml - Test plugin's plugin.xml
  * Test.js - The file which exposes all the tests to the framework.
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
Tests should be placed in the `tests` directory.  To add a new test file
you create a new JavaScript file. You then include it in the `Tests.js` file,
pulling in the module via require. You must then call the exported function from
the test case file in the `defineAutoTests` function in the `Tests.js` file.

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

# Contributing to CloudantToolkit-Hybrid
This document covers information for contributing to this project.

## Development Requirements
- [Node.js&reg;](https://nodejs.org)
- [Cordova Command Line Interface](http://cordova.apache.org/docs/en/4.0.0/guide_cli_index.md.html#The%20Command-Line%20Interface)
  * Run `sudo npm install -g cordova`
- [CouchDB](http://couchdb.apache.org/)
  * OSX - `brew install couchdb`
  * Ubuntu = `sudo apt-get install couchdb`

## Project Structure
The project has 2 main directories.  `dev` and `plugin`.  `plugin` contains consumable Cordova plugin for CloudantToolkit. `dev` contains several scripts and resources used for development.  

The `plugin` structure is as follows:
- plugin.xml - Defines the structure of the plugin
- docs - Product documentation
- hooks - Plugin hooks
- src
  * ios - iOS plug-in resources
  * android - Android plug-in resources
- tests - A suite of plugins testing major features of the main plugin
  * plugin.xml - Test plugin's plugin.xml
  * test JavaScript resources
- www - Plugin source code

## Setup
To get started, open a terminal and run the following commands.
- cd dev
- ./setup.sh

The `setup.sh` script does the following:
- Creates the `CloudantSyncDevApp` Cordova app for testing
- Adds the `com.cloudant.sync.devapp` plugin for development.  This plugin is linked to the src in the `plugin` directory.  This means you can edit the content in place and changes will be picked up by the test app.
- Adds the `com.cloudant.sync.test.*` plugins for testing.  This plug-in is linked to the src in the `plugin` directory.  This means you can edit the content in place and changes will be picked up by the test app.
- Adds the supported platforms.
- Updates the `config.xml` to tie in the test applications.
- Patches platform assets for testing
- Installs iOS dependencies via cocoapods

After running 'setup.sh', follow the instructions in the [README](README.md) for adding the cocoapods dependencies.  You can skip copying the podfile and pod install for iOS since this was done by the setup.sh script.

##Testing
Our tests run using [cordova-plugin-test-framework](https://github.com/apache/cordova-plugin-test-framework).  You can run tests by using the `cordova run [ios | android]` command.  Tests should be placed in the `plugin/tests` directory.  To add a new test, create a new plugin directory with an appropriate label. Your test plugin.xml should resemble the following:

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<plugin id="com.cloudant.sync.test.<your test label>" version="0.1.0-dev" xmlns:android="http://schemas.android.com/apk/res/android" xmlns="http://apache.org/cordova/ns/plugins/1.0">
    <name>Cloudant Sync Plugin "Your Test Label" Tests</name>
    <keywords>cloudant,sync</keywords>
    <repo>https://github.com/cloudant/sync-cordova-plugin#:plugin/tests/your_test_label</repo>

    <dependency id="cordova-plugin-test-framework"/>
    <dependency id="com.cloudant.sync" url=".."/>
    <js-module name="tests" src="your_test_source_file.js"/>

</plugin>
```

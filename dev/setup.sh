# Copyright (c) 2015 IBM Corp. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file
# except in compliance with the License. You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software distributed under the
# License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the License for the specific language governing permissions
# and limitations under the License.

#!/bin/bash

dev_directory=$( cd $( dirname ${BASH_SOURCE[0]} ) && pwd )
echo "Setup of dev in" $dev_directory

# Set script variables
cd $dev_directory/..
cordova_app_name=CloudantSyncDevApp
plugin_directory=$(pwd)/plugin
app_directory=$dev_directory/devapp
patch_directory=$dev_directory/patch
sql_cipher_directory=$patch_directory/sqlcipher-for-android-v3.3.1
platform_android_directory=$app_directory/platforms/android
platform_ios_directory=$app_directory/platforms/ios
platform_ios_cordova_lib_path=$platform_ios_directory/cordova/lib


# Check if sqlcipher-for-android has been downloaded and unzipped
if [ ! -e $sql_cipher_directory ]; then
    cd $patch_directory
    curl -L -o sqlcipher-for-android.zip https://s3.amazonaws.com/sqlcipher/3.3.1/sqlcipher-for-android-community-v3.3.1.zip
    unzip sqlcipher-for-android.zip
fi

# Clean and recreate app_directory
rm -rf $app_directory
cordova create $app_directory com.cloudant.sync.devapp $cordova_app_name

# Patch config.xml
cp -f $patch_directory/config.xml $app_directory

echo "Installing plugins..."
cd $app_directory
cordova plugin add $plugin_directory --link
cordova plugin add $plugin_directory/tests/common --link
cordova plugin add $plugin_directory/tests/dbcreate --link
cordova plugin add $plugin_directory/tests/crud --link
cordova plugin add $plugin_directory/tests/indexandquery --link
cordova plugin add $plugin_directory/tests/replication --link
cordova plugin add $plugin_directory/tests/attachments --link
cordova plugin add $plugin_directory/tests/dbcreateencrypted --link

echo "Adding platforms..."
cordova platform add ios
cordova platform add android

echo "Patching platform assets..."
cp -f $patch_directory/Podfile $platform_ios_directory/Podfile
cp -f $patch_directory/$cordova_app_name-info.plist $platform_ios_directory/$cordova_app_name/$cordova_app_name-info.plist
cp -f $sql_cipher_directory/assets/icudt46l.zip $platform_android_directory/assets/icudt46l.zip
cp -fr $sql_cipher_directory/libs $platform_android_directory

if [ $( which pod ) ]; then
    echo "Installing pods..."
    cd $platform_ios_directory
    pod install
fi

cd $app_directory
echo "Done!"

#!/bin/bash
sed -i .orig 's/\(LD_RUNPATH_SEARCH_PATHS = "[^"]*\)\(".*$\)/\1 \${PROJECT_DIR}\/HelloCordova\/Plugins\/cloudant-sync\2/' platforms/ios/HelloCordova.xcodeproj/project.pbxproj

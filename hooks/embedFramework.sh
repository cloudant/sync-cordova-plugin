#!/bin/bash
sed -i .orig 's/\(LD_RUNPATH_SEARCH_PATHS = "[^"]*\)\(".*$\)/\1 \${PROJECT_DIR}\/${PRODUCT_NAME}\/Plugins\/cloudant-sync @executable_path\/SharedFrameworks\2/' platforms/ios/*.xcodeproj/project.pbxproj

#!/usr/bin/ruby

system("curl -X POST http://127.0.0.1:5984/_replicate -H 'Content-Type: application/json' -d '{\"source\": \"https://clientlibs-test.cloudant.com/animaldb\",\"target\": \"http://localhost:5984/animaldb\",\"create_target\": true,\"continuous\": false}'")

exit $?.to_i

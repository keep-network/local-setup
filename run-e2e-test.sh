#!/bin/bash

set -e

cd e2e

npm install

cd ../tbtc.js
echo "List (1):"
ls -l node_modules/@keep-network
echo "Link:"
npm link @keep-network/keep-core @keep-network/keep-ecdsa @keep-network/tbtc
echo "List (2):"
ls -l node_modules/@keep-network
cd ../e2e

node --experimental-json-modules e2e-test.js
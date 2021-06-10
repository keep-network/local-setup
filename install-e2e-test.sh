#!/bin/bash

set -e

echo "Running npm install..."
cd e2e
npm install

# Without the below step with installation of the `sha3`, the later step with
# `npm link` in `keep-ecdsa/solidity` fails with the following error:
# ```
# npm ERR! Failed at the sha3@1.2.3 install script.
# npm ERR! This is probably not a problem with npm. There is likely
# additional logging output above.
# ```
cd ../keep-ecdsa/solidity
npm install --save-dev sha3

echo "Linking..."
cd ../../keep-core/solidity
npm link
cd ../../keep-ecdsa/solidity
npm link
cd ../../tbtc/solidity
npm link

cd ../../tbtc.js
npm link @keep-network/keep-core @keep-network/keep-ecdsa @keep-network/tbtc

echo "Linked:"
ls -l node_modules/@keep-network

#!/bin/bash

set -e

echo "Running npm install..."
cd e2e
npm install

echo "Linking..."
cd ../keep-core/solidity-v1
npm link
cd ../../keep-ecdsa/solidity
npm link
cd ../../tbtc/solidity
npm link

cd ../../tbtc.js
npm link @keep-network/keep-core @keep-network/keep-ecdsa @keep-network/tbtc

echo "Linked:"
ls -l node_modules/@keep-network

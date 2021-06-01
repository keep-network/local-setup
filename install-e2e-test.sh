#!/bin/bash

set -e

echo "Running npm install..."
cd e2e
npm install

echo "Rebuilding..."
cd ../keep-ecdsa/solidity
npm rebuild

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
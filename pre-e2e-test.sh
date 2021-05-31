#!/bin/bash

set -e

echo "Running npm install..."
cd e2e
npm install

echo "Linking..."
cd ../keep-core/solidity
nvm use 14.3.0
npm link
cd ../../keep-ecdsa/solidity
nvm use 14.3.0
npm link
cd ../../tbtc/solidity
nvm use 14.3.0
npm link

cd ../../tbtc.js
npm link @keep-network/keep-core @keep-network/keep-ecdsa @keep-network/tbtc

echo "Linked:"
ls -l node_modules/@keep-network
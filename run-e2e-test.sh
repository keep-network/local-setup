#!/bin/bash

set -e

cd e2e

echo "Running tests..."
node --experimental-json-modules e2e-test.js

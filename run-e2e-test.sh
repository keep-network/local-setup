#!/bin/bash

set -e

cd e2e

npm install

node --experimental-json-modules e2e-test.js
#!/bin/bash

set -e

npm install

node --experimental-json-modules e2e-test.js
#!/bin/bash

set -e

echo "Initializing Geth..."

cd local-setup

./initialize-geth.sh

echo "Geth has been initialized successfully!"
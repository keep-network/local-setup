#!/bin/bash

set -e

echo "Installing Truffle..."

npm install -g truffle@5.0.30

if ! [ -x "$(command -v truffle)" ]; then echo "Truffle installation failed"; exit 1; fi

echo "Truffle has been installed successfully!"
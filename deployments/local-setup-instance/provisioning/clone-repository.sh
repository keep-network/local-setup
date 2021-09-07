#!/bin/bash

set -e

echo "Cloning repository..."

if [ -d local-setup ]; then sudo rm -Rf local-setup; fi

git clone https://github.com/keep-network/local-setup.git

echo "Repository has been cloned successfully!"

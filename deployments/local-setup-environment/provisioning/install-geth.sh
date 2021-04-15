#!/bin/bash

set -e

echo "Installing go-ethereum..."
GETH_PACKAGE=geth-alltools-linux-amd64-1.9.25-e7872729.tar.gz

curl -O https://gethstore.blob.core.windows.net/builds/$GETH_PACKAGE

tar -xvf $GETH_PACKAGE
mkdir ./go-ethereum && tar -xzf $GETH_PACKAGE -C ./go-ethereum --strip-components=1
sudo chown -R root:root ./go-ethereum
sudo mv ./go-ethereum/* /usr/local/bin

if ! [ -x "$(command -v geth)" ]; then echo "go-ethereum installation failed"; exit 1; fi

echo "go-ethereum has been installed successfully!"

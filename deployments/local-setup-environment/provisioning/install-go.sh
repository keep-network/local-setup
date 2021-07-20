#!/bin/bash

set -e

echo "Installing Go..."

GOLANG_PACKAGE=go1.16.6.linux-amd64.tar.gz

curl -O https://storage.googleapis.com/golang/$GOLANG_PACKAGE

tar -xvf $GOLANG_PACKAGE
sudo chown -R root:root ./go
sudo mv go /usr/local

echo 'GOPATH="$HOME/go"' >> ~/.profile
echo 'PATH="$PATH:/usr/local/go/bin:$GOPATH/bin"' >> ~/.profile
source ~/.profile

if ! [ -x "$(command -v go)" ]; then echo "Go installation failed"; exit 1; fi

echo "Go has been installed successfully!"
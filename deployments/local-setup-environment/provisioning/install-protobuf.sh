#!/bin/bash

set -e

echo "Installing Protobuf..."

PROTOC_VERSION=3.11.4
PROTOC_PACKAGE=protoc-$PROTOC_VERSION-linux-x86_64.zip

wget https://github.com/protocolbuffers/protobuf/releases/download/v$PROTOC_VERSION/$PROTOC_PACKAGE

mkdir ./protoc && unzip $PROTOC_PACKAGE -d ./protoc
chmod 755 -R ./protoc
sudo mv protoc/bin/protoc /usr/local/bin
sudo mv protoc/include/* /usr/local/include

go get -u github.com/gogo/protobuf/protoc-gen-gogoslick

if ! [ -x "$(command -v protoc)" ]; then echo "protoc installation failed"; exit 1; fi
if ! [ -x "$(command -v protoc-gen-gogoslick)" ]; then echo "protoc-gen-gogoslick installation failed"; exit 1; fi

echo "Protobuf has been installed successfully!"
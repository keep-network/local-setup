#!/bin/bash

set -e

echo "Installing Solidity..."

SOLC_VERSION=v0.5.17

wget https://github.com/ethereum/solidity/releases/download/$SOLC_VERSION/solc-static-linux

chmod 755 solc-static-linux
sudo mv solc-static-linux /usr/local/bin
sudo ln -s -f /usr/local/bin/solc-static-linux /usr/local/bin/solc

if ! [ -x "$(command -v solc)" ]; then
  echo "Solidity installation failed"
  exit 1
fi

echo "Solidity has been installed successfully!"

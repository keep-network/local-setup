#!/bin/bash

# Install common tools.
echo "Installing common tools..."
sudo apt-get update
sudo apt-get install unzip
sudo apt-get install jq
echo "Common tools have been installed successfully!"

# Install Node.js.
echo "Installing Node.js..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 14.3.0
nvm install 11.15.0
nvm alias default 11.15.0
nvm use default
echo "Node.js $(node -v) and NPM $(npm -v) have been installed successfully!"

# Install Golang.
echo "Installing Go..."
GOLANG_PACKAGE=go1.13.4.linux-amd64.tar.gz
curl -O https://storage.googleapis.com/golang/$GOLANG_PACKAGE
tar -xvf $GOLANG_PACKAGE
sudo chown -R root:root ./go
sudo mv go /usr/local
echo "export GOPATH=$HOME/go" >> ~/.profile
echo "export PATH=$PATH:/usr/local/go/bin:$GOPATH/bin" >> ~/.profile
source ~/.profile
echo "$(go version) has been installed successfully!"

# Install go-ethereum.
echo "Installing go-ethereum..."
GETH_PACKAGE=geth-alltools-linux-amd64-1.9.9-01744997.tar.gz
curl -O https://gethstore.blob.core.windows.net/builds/$GETH_PACKAGE
tar -xvf $GETH_PACKAGE
mkdir ./go-ethereum && tar -xzf $GETH_PACKAGE -C ./go-ethereum --strip-components=1
sudo chown -R root:root ./go-ethereum
sudo mv ./go-ethereum/* /usr/local/bin
geth version
echo "go-ethereum has been installed successfully!"

# Install Solidity.
echo "Installing Solidity..."
SOLC_VERSION=v0.5.17
wget https://github.com/ethereum/solidity/releases/download/$SOLC_VERSION/solc-static-linux
chmod 755 solc-static-linux
sudo mv solc-static-linux /usr/local/bin
sudo ln -s -f /usr/local/bin/solc-static-linux /usr/local/bin/solc
solc --version
echo "Solidity has been installed successfully!"

# Install Truffle.
echo "Installing Truffle..."
npm install -g truffle@5.0.30
truffle version
echo "Truffle has been installed successfully!"

# Install Protobuf.
echo "Installing Protobuf..."
PROTOC_VERSION=3.11.4
PROTOC_PACKAGE=protoc-$PROTOC_VERSION-linux-x86_64.zip
wget https://github.com/protocolbuffers/protobuf/releases/download/v$PROTOC_VERSION/$PROTOC_PACKAGE
mkdir ./protoc && unzip $PROTOC_PACKAGE -d ./protoc
chmod 755 -R ./protoc
sudo mv protoc/bin/protoc /usr/local/bin
sudo mv protoc/include/* /usr/local/include
go get -u github.com/gogo/protobuf/protoc-gen-gogoslick
protoc --version
command -v protoc-gen-gogoslick
echo "Protobuf has been installed successfully!"

# TODO: Install pyenv and pipenv.
# TODO: Install Docker and Docker Compose.
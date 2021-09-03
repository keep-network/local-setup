#!/bin/bash

set -e

echo "Installing Node.js, NPM and Yarn..."

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash

echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.profile
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.profile
source ~/.profile

nvm install 14.3.0
nvm install 11.15.0
nvm alias default 11.15.0
nvm use default
npm install --global yarn

if ! [ -x "$(command -v node)" ]; then echo "Node installation failed"; exit 1; fi
if ! [ -x "$(command -v npm)" ]; then echo "NPM installation failed"; exit 1; fi
if ! [ -x "$(command -v yarn)" ]; then echo "NPM installation failed"; exit 1; fi

echo "Node.js, NPM and Yarn have been installed successfully!"
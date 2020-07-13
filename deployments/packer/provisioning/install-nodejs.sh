#!/bin/bash

set -e

echo "Installing Node.js and NPM..."

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash

export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install 14.3.0
nvm install 11.15.0
nvm alias default 11.15.0
nvm use default

if ! [ -x "$(command -v node)" ]; then echo "Node installation failed"; exit 1; fi
if ! [ -x "$(command -v npm)" ]; then echo "NPM installation failed"; exit 1; fi

echo "Node.js and NPM have been installed successfully!"
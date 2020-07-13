#!/bin/bash

set -e

echo "Installing Docker Compose..."

sudo curl -L "https://github.com/docker/compose/releases/download/1.26.2/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose

sudo chmod +x /usr/local/bin/docker-compose

if ! [ -x "$(command -v docker-compose)" ]; then echo "Docker compose installation failed"; exit 1; fi

echo "Docker Compose has been installed successfully!"
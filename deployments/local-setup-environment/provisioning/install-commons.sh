#!/bin/bash

set -e

echo "Installing common tools..."

sudo apt-get update

sudo apt-get install -y \
  curl \
  wget \
  git \
  unzip \
  jq \
  python \
  build-essential

if ! [ -x "$(command -v curl)" ]; then echo "curl installation failed"; exit 1; fi
if ! [ -x "$(command -v wget)" ]; then echo "wget installation failed"; exit 1; fi
if ! [ -x "$(command -v git)" ]; then echo "git installation failed"; exit 1; fi
if ! [ -x "$(command -v unzip)" ]; then echo "unzip installation failed"; exit 1; fi
if ! [ -x "$(command -v jq)" ]; then echo "jq installation failed"; exit 1; fi
if ! [ -x "$(command -v python)" ]; then echo "python installation failed"; exit 1; fi
if ! [ -x "$(command -v make)" ]; then echo "build-essential installation failed"; exit 1; fi

echo "Common tools have been installed successfully!"
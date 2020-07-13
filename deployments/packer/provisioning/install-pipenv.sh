#!/bin/bash

set -e

echo "Installing pipenv..."

if ! [ -x "$(command -v pyenv)" ]; then echo "pyenv is not installed"; exit 1; fi

pyenv install 3.7.7
pyenv global 3.7.7

if ! [ -x "$(command -v pip)" ]; then echo "pip is not installed"; exit 1; fi

pip install pipenv

if ! [ -x "$(command -v pipenv)" ]; then echo "pipenv installation failed"; exit 1; fi

echo "pipenv has been installed successfully!"
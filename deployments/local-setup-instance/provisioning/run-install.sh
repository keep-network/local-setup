#!/bin/bash

set -e

cd local-setup

./pre-install.sh

echo "Running install script..."

./install.sh

echo "Install script executed successfully!"





#!/bin/bash

set -e

echo "Running Geth as transient system service..."

cd local-setup

sudo systemd-run --unit=geth -p WorkingDirectory=/home/vagrant/local-setup ./run-geth.sh

echo "Geth has been run as transient system service successfully!"
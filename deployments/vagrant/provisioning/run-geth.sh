#!/bin/bash

set -e

echo "Running Geth as transient system service..."

cd local-setup

WORKDIR=$(pwd)

sudo systemd-run --unit=geth -p WorkingDirectory=$WORKDIR ./run-geth.sh

echo "Geth has been run as transient system service successfully!"
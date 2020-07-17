#!/bin/bash

set -e

echo "Running Core and ECDSA clients..."

cd local-setup

WORKDIR=$(pwd)

sudo systemd-run --unit=keep-core-1 -p WorkingDirectory=$WORKDIR ./run-core-1.sh

sudo systemd-run --unit=keep-ecdsa-1 -p WorkingDirectory=$WORKDIR ./run-ecdsa-1.sh
sudo systemd-run --unit=keep-ecdsa-2 -p WorkingDirectory=$WORKDIR ./run-ecdsa-2.sh
sudo systemd-run --unit=keep-ecdsa-3 -p WorkingDirectory=$WORKDIR ./run-ecdsa-3.sh

echo "Core and ECDSA have been run successfully!"
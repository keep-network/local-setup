#!/bin/bash

set -e

echo "Running Core and ECDSA clients..."

cd local-setup

sudo systemd-run --unit=keep-core-1 -p WorkingDirectory=/home/vagrant/local-setup ./run-core-1.sh

sudo systemd-run --unit=keep-ecdsa-1 -p WorkingDirectory=/home/vagrant/local-setup ./run-ecdsa-1.sh
sudo systemd-run --unit=keep-ecdsa-2 -p WorkingDirectory=/home/vagrant/local-setup ./run-ecdsa-2.sh
sudo systemd-run --unit=keep-ecdsa-3 -p WorkingDirectory=/home/vagrant/local-setup ./run-ecdsa-3.sh

echo "Core and ECDSA have been run successfully!"
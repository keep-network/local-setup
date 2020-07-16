#!/bin/bash

set -e

echo "Running Bitcoin Core and ElectrumX as transient system service..."

cd local-setup

systemd-run --unit=bitcoin -p WorkingDirectory=/home/vagrant/local-setup ./run-bitcoin.sh

echo "Bitcoin Core and ElectrumX have been run as transient system service successfully!"
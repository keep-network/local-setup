#!/bin/bash

set -e

echo "Updating repository..."

cd local-setup

#TODO: Temporary. Final solution should update all submodules to the recent master.
git checkout local-setup-vm

echo "Repository has been updated successfully!"
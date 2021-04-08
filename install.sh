#!/bin/bash

set -e

# Install submodules.
./install-repositories.sh

# Install applications and their contracts
./install-applications.sh

echo "Installation script executed successfully with versions of submodules:\n$(git submodule)"

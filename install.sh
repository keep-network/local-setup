#!/bin/bash

set -e

# Install submodules.
./install-repositories.sh

# Install applications and their contracts
./install-applications-with-contracts.sh

# Do not install keep dashboard dApp for e2e nightly test
if [[ $E2E_TEST != true ]]
then
    # Install Keep Dashboard.
    ./install-keep-dashboard.sh
fi

echo "Installation script executed successfully with versions of submodules:\n$(git submodule)"

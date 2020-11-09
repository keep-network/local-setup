#!/bin/bash

set -e

# Install submodules.
./install-repositories.sh

# Install KEEP-CORE.
./install-keep-core.sh

# Install KEEP-ECDSA.
./install-keep-ecdsa.sh

# Install tBTC.
./install-tbtc.sh

# Do not install keep network dApps for e2e nightly test
if [[ $1 != e2e-test ]]
then
    # Install Keep Dashboard.
    ./install-keep-dashboard.sh

    # Install tBTC dApp.
    ./install-tbtc-dapp.sh
fi

echo "Installation script executed successfully with versions of submodules:\n$(git submodule)"
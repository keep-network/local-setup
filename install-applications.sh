#!/bin/bash

set -e

# Install KEEP-CORE.
./install-keep-core.sh

# Install KEEP-ECDSA.
./install-keep-ecdsa.sh

# Install tBTC.
./install-tbtc.sh

# Install tBTC dApp.
./install-tbtc-dapp.sh

# Do not install keep dashboard dApp for e2e nightly test
if [[ $E2E_TEST != true ]]; then
  # Install Keep Dashboard.
  ./install-keep-dashboard.sh
fi

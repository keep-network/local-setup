#!/bin/bash

set -e

# Install submodules.
./install-repositories.sh

# Install KEEP-CORE.
./install-keep-core.sh

# Install KEEP-ECDSA.
./install-keep-ecdsa.sh

# Install TBTC.
./install-tbtc.sh
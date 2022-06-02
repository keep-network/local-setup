#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m'      # new line + reset color

printf "${LOG_START}Initializing submodules...${LOG_END}"

git submodule update --init --recursive --remote --rebase --force

# We need to stay at commit `6a9b084` which is right before the `AssetPool`
# contract took a new collateral token with a `delegate()` function. Coverage
# pool utilizes Keep Token which does not have a `delegate()`` function. If the
# latest code is used for coverage pools, then the CI will break during the
# deployment of the `AssetPool` contract.
cd coverage-pools
git checkout 6a9b0840e3b79e58f4f25892d5b8ac853fabc62e
cd ..

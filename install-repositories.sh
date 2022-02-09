#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m'      # new line + reset color

printf "${LOG_START}Initializing submodules...${LOG_END}"

git submodule update --init --recursive --remote --rebase --force

# We need to checkout `coverage-pools` at `6a9b084`, as after that commit we
# introduced in the the `Asset Pool` contract a call to a `delegate` function
# which is not present in the `KeepToken` contract used during `AssetPool`'s
# deployment script.
cd coverage-pools
git checkout 6a9b0840e3b79e58f4f25892d5b8ac853fabc62e
cd ..

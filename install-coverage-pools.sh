#!/bin/bash

set -e

LOG_START='\n\e[1;36m'  # new line + bold + color
LOG_END='\n\e[0m'       # new line + reset color
DONE_START='\n\e[1;32m' # new line + bold + green
DONE_END='\n\n\e[0m'    # new line + reset

WORKDIR=$PWD

printf "${LOG_START}Starting coverage-pools deployment...${LOG_END}"

printf "${LOG_START}Linking dependencies...${LOG_END}"

cd "$WORKDIR/keep-core/solidity-v1"
yarn link

cd "$WORKDIR/tbtc/solidity"
yarn link

cd "$WORKDIR/coverage-pools"

# Remove node modules for clean installation
rm -rf ./node_modules

# Remove deployment artifacts for clean deployment
rm -rf ./artifacts
rm -rf ./deployments

printf "${LOG_START}Running install script...${LOG_END}"

# Run coverage-pools install script.
./scripts/install.sh

printf "${DONE_START}coverage-pools deployed successfully!${DONE_END}"

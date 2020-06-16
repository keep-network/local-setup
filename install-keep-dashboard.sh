#!/bin/bash

set -e

LOG_START='\n\e[1;36m' # new line + bold + color
LOG_END='\n\e[0m' # new line + reset color
DONE_START='\n\e[1;32m' # new line + bold + green
DONE_END='\n\n\e[0m'    # new line + reset

WORKDIR=$PWD

printf "${LOG_START}Starting Keep Dashboard deployment...${LOG_END}"

printf "${LOG_START}Preparing keep-core artifacts...${LOG_END}"

cd $WORKDIR/keep-core/solidity
ln -sf build/contracts artifacts

printf "${LOG_START}Preparing keep-ecdsa artifacts...${LOG_END}"

cd $WORKDIR/keep-ecdsa/solidity
ln -sf build/contracts artifacts

printf "${LOG_START}Install Keep Dashboard dependencies...${LOG_END}"

cd $WORKDIR/keep-core/solidity/dashboard

npm install

printf "${LOG_START}Updating Keep Dashboard dependnecies...${LOG_END}"

cd $WORKDIR/keep-core/solidity
npm link

cd $WORKDIR/keep-ecdsa/solidity
npm link

cd $WORKDIR/tbtc/solidity
npm link

printf "${LOG_START}Updating Keep Dashboard configuration...${LOG_END}"

cd $WORKDIR/keep-core/solidity/dashboard
npm link @keep-network/keep-core
npm link @keep-network/keep-ecdsa
npm link @keep-network/tbtc

printf "${DONE_START}Keep Dashboard initialized successfully!${DONE_END}"
